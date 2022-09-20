import type { Game } from "$lib/types";
import { currentGameSortStyle } from "$lib/stores";
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
        sortStyle = [
            ['situationScore', 'max', 2],
            ['matchupSituationSurpriseScore', 'max', 1],
            ['matchupScore', 'max', 1],
        ];
        
    } else if (status === 'Completed') {
        sortStyle = [
            ['matchupSurpriseScore', 'max', 1],
            ['matchupScore', 'max', 2],
        ];
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

// export default function sortGames(games: Array<Game>) {
//     games.sort((a, b) => pairwiseCompare(makeCompList(a), makeCompList(b)));
//     return games;
// }

// const makeCompList = (game: Game) => {
//     let keyList: Array<[keyof Game, string]> = [];
//     if (game.statusSort === 'Current'){
//         if (get(currentGameSortStyle) === 'situation'){
//             keyList = [
//                 ['close', 'max'],
//                 ['under2Tied', 'max'],
//                 ['under2PotChange', 'max'],
//                 ['under2PotTie', 'max'],
//                 ['under5Tied', 'max'],
//                 ['under5PotChange', 'max'],
//                 ['under5PotTie', 'max'],
//                 ['closeUnder2', 'max'],
//                 ['under8Tied', 'max'],
//                 ['under8PotChange', 'max'],
//                 ['under8PotTie', 'max'],
//                 ['closeUnder5', 'max'],
//                 ['closeUnder8', 'max'],
//                 ['matchupScore', 'max'],
//             ];
//         } else {
//             keyList = [
//                 ['matchupScore', 'max']
//             ];
//         }
//     } else if (game.statusSort === 'Upcoming'){
//         keyList = [
//             ['matchupScore', 'max']
//         ];
//     } else if (game.statusSort === 'Completed'){
//         keyList = [
//             // ['matchupScore', 'max'],
//             ['test', 'max']
//         ];
//     }
//     if (get(showFavoriteTeamsFirst) === 'y'){
//         keyList = [['favoriteTeamGame', 'max']].concat(keyList);
//     }
//     const vals = keyList.map(x => {
//         const [k, d] = x;
//         let retVal: number = game[k];
//         retVal = (d === 'min' ? -1 : 1) * retVal;
//         return retVal
//     })
//     return vals
// }

// const pairwiseCompare = (a: Array<any>, b: Array<any>) => {
//     for (const i in a){
//         if ([null, undefined].includes(a[i])){
//             return -1
//         }
//         else if ([null, undefined].includes(b[i])){
//             return 1
//         }
//         if (a[i] < b[i]){
//             return 1
//         } else if (a[i] > b[i]){
//             return -1
//         }
//     }
//     return -1
// }