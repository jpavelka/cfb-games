import type { Game } from "$lib/types";
import { gameSortStyles } from "$lib/stores";
import { get } from 'svelte/store';

type SortStyleType = Array<[keyof Game, 'max' | 'min', number]>

export default function sortGames(games: Array<Game>, favoritesFirst: boolean): Array<Game> {
    if (games.length === 0){
        return games;
    }
    if (favoritesFirst) {
        return sortGames(games.filter(g => g.favoriteTeamGame), false).concat(sortGames(games.filter(g => !g.favoriteTeamGame), false))
    }
    const status = games[0].statusSort;
    let sortStyle: SortStyleType = [['matchupScore', 'max', games.length]];
    if (status === 'Current') {
        const styleStr = get(gameSortStyles['Current Games'].store);
        if (styleStr === 'Default'){
            sortStyle = [
                ['matchupSituationSurpriseScore', 'max', 2],
                ['sortSituationScore', 'max', 1],
                ['matchupSituationSurpriseScore', 'max', 2],
                ['matchupScore', 'max', 1],
                ['sortSurpriseScore', 'max', 1],
                ['matchupScore', 'max', 1]
            ];
        } else {
            sortStyle = getBasicSortStyle(styleStr, games.length);
        }
    } else if (status === 'Completed') {
        const styleStr = get(gameSortStyles['Completed Games'].store);
        if (styleStr === 'Default'){
            sortStyle = [
                ['matchupSurpriseScore', 'max', 2],
                ['matchupScore', 'max', 2],
                ['sortSurpriseScore', 'max', 1],
                ['matchupSurpriseScore', 'max', 1],
                ['matchupScore', 'max', 2],
            ];
        } else {
            sortStyle = getBasicSortStyle(styleStr, games.length);
        }
    } else if (status === 'Upcoming') {
        const styleStr = get(gameSortStyles['Upcoming Games'].store);
        sortStyle = getBasicSortStyle(styleStr, games.length);
    }
    let sortedGames: Array<Game> = [];
    let sortStage = 0;
    while (games.length > 0){
        const [sortKey, sortDirection, numGames] = sortStyle[sortStage % sortStyle.length]
        const retMult = sortDirection === 'min' ? -1 : 1;
        const sorted = games.sort((a, b) => 
            (a[sortKey] || 0) < (b[sortKey] || 0) ? retMult : -retMult
        );
        sortedGames = sortedGames.concat(sorted.slice(0, numGames));
        games = sorted.slice(numGames);
        sortStage += 1;
    }
    return sortedGames
}

function getBasicSortStyle(styleStr: string, numGames: number): SortStyleType {
    if (styleStr === 'Situation'){
        return [['situationScore', 'max', numGames]]
    } else if (styleStr === 'Surprise') {
        return [['surpriseScore', 'max', numGames]]
    } else if (styleStr === 'Start Time') {
        return [['sortStartTime', 'min', numGames]]  
    } else {
        return [['matchupScore', 'max', numGames]]
    }
}