import type { Game } from "$lib/types";
import { favoriteTeams } from "$lib/stores";

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
    const estDtStr = Intl.DateTimeFormat([],
        {timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric'}
    ).format(gameDttm);
    g.dttmStr = estDtStr;
    g.dateStr = estDtStr;
    g.dateSortStr = estDtStr;
    g.hourStr = 'TBD';
    g.hourSortStr = '24';
    if (g.timeValid){
        g.dttmStr = gameDttm.toLocaleDateString([],
            {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}
        );
        g.dateStr = gameDttm.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});
        g.dateSortStr = g.dateStr;
        g.hourStr = gameDttm.toLocaleTimeString([], {hour: 'numeric'});
        g.hourSortStr = gameDttm.toLocaleTimeString([], {hour: 'numeric', hourCycle: 'h23'});
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
        }
    } else {
        g.overUnder = undefined;
        g.favored = undefined;
        g.spread = undefined;
    }
    g.teamsArray = [(g.teams || {}).away, (g.teams || {}).home];
    g.spreadTouchdowns = g.spread ? Math.round(g.spread / 7) : 4;
    g.gameInterest = g.teams.away.approxRank + g.teams.home.approxRank + g.spreadTouchdowns;
    favoriteTeams.subscribe(val => {
        const favTeamsList = val.split(',')
        g.favoriteTeamGame = favTeamsList.includes(g.teams.away.school) || favTeamsList.includes(g.teams.home.school)
    })
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

function totalSecondsRemaining({ period, seconds }: { period: number, seconds: number }) {
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