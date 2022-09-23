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
        const approxRank = t.classification === 'FBS' ? t.masseyRank.mean : (
            !!t.masseyRank ? fcsMasseyEq(t.masseyRank.mean) : 250
        );
        t.approxRank = Math.round(approxRank / 5);
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
    g.broadcastStr = '';
    let broadcastStrs = [];
    if (g.geoBroadcasts.length > 0){
        for (let gb of g.geoBroadcasts){
            if (gb.market.type == 'National'){
                broadcastStrs.push(gb.media.shortName)
            }
        }
        g.broadcastStr = getBroadcastStrFromList(broadcastStrs);
    }
    g.broadcastChannels = broadcastStrs;
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
        if (g.overUnder === null || g.overUnder === undefined){
            g.overUnder = undefined
        }
        g.spread = odds.spread;
        if (g.spread === null || g.spread === undefined){
            g.spread = undefined
        }
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
    const rankDiff = Math.min(10, Math.abs(g.teams.away.approxRank - g.teams.home.approxRank));
    g.matchupScore = 100 - (g.teams.away.approxRank + g.teams.home.approxRank + rankDiff);
    favoriteTeams.subscribe(val => {
        const favTeamsList = val.split(',')
        g.favoriteTeamGame = favTeamsList.includes(g.teams.away.school) || favTeamsList.includes(g.teams.home.school)
    })
    g.situationScore = 0;
    g.sortSituationScore = 0;
    if (g.statusState === 'in'){
        const secsRemaining = totalSecondsRemaining({ period: g.period, seconds: g.clock });
        const minutesElapsed = 60 - (secsRemaining / 60);
        const timeScore = (Math.round(minutesElapsed * 2) / 2) / 60;
        const margin = Math.abs((g.teams.home.score || 0) - (g.teams.away.score || 0));
        let nextMargin = margin;
        if (g.possessionHomeAway !== undefined) {
            const leading = (g.teams.home.score || 0) > (g.teams.away.score || 0) ? "home" : "away";
            nextMargin = Math.abs(margin + (leading === g.possessionHomeAway ? 1 : -1) * 7);
        }
        const marginScore = 1 - Math.min(1, Math.max(0, ((margin + nextMargin) / 2) / 14))
        g.situationScore = timeScore * marginScore * 100
    }
    g.surpriseScore = 0;
    g.sortSurpriseScore = 0;
    if (['in', 'post'].includes(g.statusState)){
        let minutesElapsed = 60;
        if (g.statusState === 'in'){
            const secsRemaining = totalSecondsRemaining({ period: g.period, seconds: g.clock });
            minutesElapsed = 60 - (secsRemaining / 60);
        }
        const timeScore = 100 * (Math.round(minutesElapsed * 2) / 2) / 60;
        if (g.spread === undefined){
            g.upset = false;
            g.surpriseScore = 50;
        } else {
            let margin = 0;
            if (g.teams.home.score !== undefined && g.teams.away.score !== undefined){
                margin = g.teams.home.score - g.teams.away.score;
            }
            if (g.favored !== g.teams.home.school){
                margin = -margin;
            }
            const distFromSpread = Math.abs((g.spread || 0) - margin);
            const distFromSpreadSurpriseScore = Math.min(25, distFromSpread) / 25;
            g.upset = margin < 0;
            const upsetSurpriseScore = g.upset ? Math.min(10, (g.spread || 0)) / 10 : 0;
            g.surpriseScore = timeScore * (0.85 * distFromSpreadSurpriseScore + 0.15 * upsetSurpriseScore);
        }
    }
    g.matchupScoreNorm = Math.min(100, Math.max(1, g.matchupScore)) / 100;
    g.situationScoreNorm = Math.min(100, Math.max(1, g.situationScore)) / 100;
    g.surpriseScoreNorm = Math.min(100, Math.max(1, g.surpriseScore)) / 100;
    g.sortSituationScore = g.situationScoreNorm > 0.6 ? g.situationScoreNorm : g.matchupScoreNorm / 10;
    g.sortSurpriseScore = g.surpriseScoreNorm > 0.6 ? g.surpriseScoreNorm : g.matchupScoreNorm / 10;
    g.matchupSurpriseScore = 100 * (
        (4 * g.matchupScoreNorm + g.sortSurpriseScore) / 5
    );
    g.matchupSituationSurpriseScore = 100 * (
        (4 * g.sortSituationScore + 2 * g.matchupScoreNorm + g.sortSurpriseScore) / 7
    );
    favoriteTeams.subscribe(val => {
        const favTeamsList = val.split(',')
        g.favoriteTeamGame = favTeamsList.includes(g.teams.away.school) || favTeamsList.includes(g.teams.home.school)
    })
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

function getMinutesAndSecondsRemaining(s: number) {
    let minutes = Math.floor(s / 60);
    let seconds = s - 60 * minutes;
    return { minutes: minutes, seconds: seconds };
  }

export function getBroadcastStrFromList(broadcastStrs: Array<string>) {
    return broadcastStrs.join(', ');
}