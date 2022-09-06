import type { Game, GameGrouping } from "$lib/types"
import { gamesToShowFilterFuncs, teamSearchFunc } from "$lib/gameUtils/filterFuncs";

export default function(games: Array<Game> | undefined, gamesToShow: string, teamSearchStr: string) {
    if (games === undefined){
        throw 'No games have been loaded'
    }
    games = games.filter(g => gamesToShowFilterFuncs[gamesToShow](g));
    if (teamSearchStr !== ''){
        games = games.filter(g => teamSearchFunc(g, teamSearchStr));
    }
    let grouped = groupByStatus(games);
    for (const statusObj of grouped){
            statusObj.subGames = groupByDayFunc(statusObj.games);
            for (const dayObj of statusObj.subGames){
                dayObj.subGames = groupByHourFunc(dayObj.games);
            }
        }
    return grouped
}

function groupByStatus(games: Array<Game>){
    const orderedStatuses = ['Current', 'Upcoming', 'Completed', 'Postponed', 'Canceled'];
    const statusStateToStatus = {
        in: 'Current',
        pre: 'Upcoming',
        post: 'Completed',
        postponed: 'Postponed',
        canceled: 'Canceled'
    }
    let statusGames: {[key: string]: Array<Game>} = {};
    for (const game of games){
        const stat = statusStateToStatus[game.statusState];
        game.statusSort = stat;
        if (!Object.keys(statusGames).includes(stat)){
            statusGames[stat] = []
        }
        statusGames[stat].push(game)
    }
    let statusGrouped: Array<GameGrouping> = []
    for (const stat of orderedStatuses){
        if (Object.keys(statusGames).includes(stat)){
            statusGrouped.push({commonStr: stat + ' Games', games: statusGames[stat]})
        }
    }
    return statusGrouped
}

function groupByDesiredKey(arrayToGroup: Array<Game>, groupKey: keyof Game, sortFunc: (a: string, b: string) => number){
    let groupObj: {[key: string]: Array<Game>} = {};
    for (const g of arrayToGroup){
        const groupStr = `${g[groupKey]}` || 'TBA';
        if (!Object.keys(groupObj).includes(groupStr)){
            groupObj[groupStr] = [];
        }
        groupObj[groupStr].push(g);
    }
    let allGroupStrs = Object.keys(groupObj);
    allGroupStrs.sort(sortFunc);
    let sortedGroups = [];
    for (const d of allGroupStrs){
        sortedGroups.push({commonStr: d, games: groupObj[d], subGames: undefined});
    }
    return sortedGroups
}

function groupByDayFunc(games: Array<Game>) {
    const sortFunc = (a: string, b: string) => (
        a === 'TBA' ? 1 : (b === 'TBA' ? -1 : (new Date(a) < new Date (b) ? -1 : 1))
    )
    return groupByDesiredKey(games, 'dateStr', sortFunc)
}

function groupByHourFunc(games: Array<Game>) {
    const sortFunc = (a: string, b: string) => (
        a === 'TBA' ? 1 : (b === 'TBA' ? -1 : (new Date(a) < new Date (b) ? -1 : 1))
    )
    return groupByDesiredKey(games, 'hourStr', sortFunc)
}