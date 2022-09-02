import type { Game } from "$lib/types";

export default function(g: Game) {
    g.stadium = (g.venue || {}).fullName;
    const loc = (g.venue || {}).address || {}
    const city = loc.city || ''
    const state = loc.state || ''
    for (const t of Object.values(g.teams)){
        t.school = ['TBA', 'TBD'].includes(t.school) ? 'TBD' : t.school
        t.ranked = false;
        if (t.rank !== 'unranked' && t.rank !== undefined){
            if (t.rank <= 25){
                t.ranked = true;
            }
        }
        if (g.statusState === 'post'){
            t.winner = t.score === Math.max(g.teams.home.score || -1, g.teams.away.score || -1);
            t.loser = !t.winner;
        }
        t.possession = g.possession === t.id
        const sumRank = t.classification === 'FBS' ? t.masseyRank.mean : (
            !!t.masseyRank ? fcsMasseyEq(t.masseyRank.mean) : 250
        );
        t.approxRank = Math.round(sumRank / 5);
    }
    g.possessionHomeAway = g.teams.away.possession ? 'away' : (g.teams.home.possession ? 'home' : undefined)
    g.teamsTbd = g.teams.away.school === 'TBD' || g.teams.home.school === 'TBD';
    g.location = undefined
    if (city === ''){
        g.location = state
    } else if (state === ''){
        g.location = city
    } else {
        g.location = `${city}, ${state}`
    }
    g.broadcastStr = undefined;
    if (g.geoBroadcasts.length > 0){
        let broadcastStrs = [];
        for (let gb of g.geoBroadcasts){
            if (gb.market.type == 'National'){
                broadcastStrs.push(gb.media.shortName)
            }
        }
        if (broadcastStrs.length > 0){
            g.broadcastStr = broadcastStrs.join(', ');
        }
    }
    const gameDttm = new Date(g.dttm)
    g.dttmStr = undefined;
    g.dateStr = undefined;
    g.hourStr = 'TBA';
    if (g.timeValid){
        g.dttmStr = gameDttm.toLocaleDateString([],
            {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}
        );
        g.dateStr = gameDttm.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});
        g.hourStr = gameDttm.toLocaleTimeString([], {hour: 'numeric'});
    } else {
        g.dttmStr = Intl.DateTimeFormat([],
            {timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric'}
        ).format(gameDttm);
        g.dateStr = Intl.DateTimeFormat([],
            {timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric'}
        ).format(gameDttm);
    }
    g.eventStr = undefined;
    let eventStrs = [];
    for (const note of g.notes || []){
        if (note.type === 'event'){
            eventStrs.push(note.headline);
        }
    }
    if (eventStrs.length > 0){
        g.eventStr = eventStrs.join('/');
    }
    if (!!g.odds) {
        const odds = g.odds || {};
        g.overUnder = odds.overUnder;
        g.spread = odds.spread;
        g.favored = odds.homeFavored ? g.teams.home.school : g.teams.away.school;
        if (g.spread === 0){
            g.favored = undefined;
        } else {
            g.teams.home.favored = odds.homeFavored;
            g.teams.away.favored = !g.teams.home.favored;
            g.impliedWinProb = getImpliedWinProb(g.spread);
        }
    } else {
        g.overUnder = undefined;
        g.favored = undefined;
        g.spread = undefined;
    }
    g.teamsArray = [(g.teams || {}).away, (g.teams || {}).home];
    g.spreadTouchdowns = g.spread ? Math.round(g.spread / 7) : 4;
    g.gameInterest = g.teams.away.approxRank + g.teams.home.approxRank + g.spreadTouchdowns;
    if (g.statusState === 'in'){
        g.margin = Math.abs(g.teams.home.score - g.teams.away.score);
        g.marginPossessions = Math.floor((g.margin - 0.5) / 8) + 1;
        g.tie = g.margin == 0;
        g.leading = g.tie ? undefined : g.teams.home.score > g.teams.away.score ? "home" : "away";
        g.under2 = totalSecondsRemaining({ period: g.period, seconds: g.clock }) <= 2 * 60;
        g.under5 = totalSecondsRemaining({ period: g.period, seconds: g.clock }) <= 5 * 60;
        g.under8 = totalSecondsRemaining({ period: g.period, seconds: g.clock }) <= 8 * 60;
        g.close = g.period <= 2 ? g.marginPossessions <= 3 : g.marginPossessions <= 2;
        g.potentialLeadChange = g.margin < 8 && g.leading != g.possessionHomeAway;
        g.potentialTie = g.margin <= 8 && g.leading != g.possessionHomeAway;
        g.under2Tied = g.under2 * g.tie;
        g.under2PotChange = g.under2 * g.potentialLeadChange
        g.under2PotTie = g.under2 * g.potentialTie
        g.under5Tied = g.under5 * g.tie;
        g.under5PotChange = g.under5 * g.potentialLeadChange
        g.under5PotTie = g.under5 * g.potentialTie
        g.under8Tied = g.under8 * g.tie;
        g.under8PotChange = g.under8 * g.potentialLeadChange
        g.under8PotTie = g.under8 * g.potentialTie
        g.closeUnder2 = g.close * g.under2
        g.closeUnder5 = g.close * g.under5
        g.closeUnder8 = g.close * g.under8
    }
    return g
}

const fcsMasseyEq = (r: number) => {
    return Math.min(20 + (r * 4 ** Math.max(2, (1 + r / 10))), 130 + r);
}

const getImpliedWinProb = (spread: number) => {
    const strSpread = `${spread}`
    const winProbMap: {[key: string]: number} = {
        '0': 50,
        '0.5': 50.0,
        '1': 51.2,
        '1.5':	52.5,
        '2':	53.4,
        '2.5':	54.3,
        '3':	57.4,
        '3.5':	60.6,
        '4':	61.9,
        '4.5':	63.1,
        '5':	64.1,
        '5.5':	65.1,
        '6':	66.4,
        '6.5':	67.7,
        '7':	70.3,
        '7.5':	73.0,
        '8':	73.8,
        '8.5':	74.6,
        '9':	75.1,
        '9.5':	75.5,
        '10':	77.4,
        '10.5':	79.3,
        '11':	79.9,
        '11.5':	80.6,
        '12':	81.6,
        '12.5':	82.6,
        '13':	83.0,
        '13.5':	83.5,
        '14':	85.1,
        '14.5':	86.8,
        '15':	87.4,
        '15.5':	88.1,
        '16':	88.6,
        '16.5':	89.1,
        '17':	91.4,
        '17.5':	93.7,
        '18':	95.0,
        '18.5':	96.2,
        '19':	97.3,
        '19.5':	98.4
    }
    return winProbMap[strSpread] || 99.9
}

function totalSecondsRemaining({ period, seconds }) {
    if (period > 4) {
      return 0;
    } else {
      let secondsInFuturePeriods = 15 * 60 * (4 - period);
      let minSec = getMinutesAndSecondsRemaining(seconds);
      let secondsLeftInPeriod = 60 * minSec.minutes + minSec.seconds;
      return secondsLeftInPeriod + secondsInFuturePeriods;
    }
}

function getMinutesAndSecondsRemaining(s) {
    let minutes = Math.floor(s / 60);
    let seconds = s - 60 * minutes;
    return { minutes: minutes, seconds: seconds };
  }