import type { Game } from "$lib/types";
import { gameSortStyles } from "$lib/stores";
import { get } from 'svelte/store';

export default function sortGames(games: Array<Game>, favoritesFirst: boolean): Array<Game> {
    if (games.length === 0){
        return games;
    }
    if (favoritesFirst) {
        return sortGames(games.filter(g => g.favoriteTeamGame), false).concat(sortGames(games.filter(g => !g.favoriteTeamGame), false))
    }
    const status = games[0].statusSort;
    let sortStyle: Array<[keyof Game, 'max' | 'min', number]> = [['matchupScore', 'max', games.length]];
    if (status === 'Current') {
        const styleStr = get(gameSortStyles['Current Games'].store)
        if (styleStr === 'Default'){
            sortStyle = [
                ['situationScore', 'max', 2],
                ['matchupSituationSurpriseScore', 'max', 1],
                ['matchupScore', 'max', 1],
            ];
        } else {
            sortStyle = getBasicSortStyle(styleStr, games.length);
        }
        
    } else if (status === 'Completed') {
        const styleStr = get(gameSortStyles['Completed Games'].store)
        if (styleStr === 'Default'){
            sortStyle = [
                ['matchupSurpriseScore', 'max', 1],
                ['matchupScore', 'max', 2],
            ];
        } else {
            sortStyle = getBasicSortStyle(styleStr, games.length);
        }
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

function getBasicSortStyle(styleStr: string, numGames: number) {
    if (styleStr === 'Situation'){
        return [['situationScore', 'max', numGames]]
    } else if (styleStr === 'Surprise') {
        return [['surpriseScore', 'max', numGames]]
    } else {
        return [['matchupScore', 'max', numGames]]
    }
}