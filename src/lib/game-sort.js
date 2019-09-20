import sort from 'fast-sort';

export default function gameSort(allGames) {
    if (allGames.lenth == 0){
        return allGames;
    }
    let gameState = allGames[0].state;
    let sortOrder
    if (gameState == 'in'){
        sortOrder = [
            { desc: x => x.close },
            { desc: x => x.under2 * x.tie },
            { desc: x => x.under2 * x.potentialLeadChange },
            { desc: x => x.under2 * x.potentialTie },
            { desc: x => x.under5 * x.potentialLeadChange },
            { desc: x => x.under5 * x.potentialTie },
            { desc: x => x.under8 * x.potentialLeadChange },
            { desc: x => x.under8 * x.potentialTie },
            { desc: x => x.under8 * (x.marginPossesions == 1) },
            { desc: x => x.close * x.under2 },
            { desc: x => x.close * x.under5 },
            { desc: x => x.numRanked },
            { desc: x => x.close * x.under8 },
            { desc: x => x.close * x.under15 },
            { asc: x => x.spRankDecileSum },
            { desc: x => Math.max(x.numRanked, x.numPowerFive) },
            { desc: x => x.close * x.under20 },
            { desc: x => x.close * x.under25 },
            { desc: x => x.close * x.period },
            { asc: x => !x.close * x.period },
            { desc: x => x.potentialLeadChange },
            { desc: x => x.potentialTie },
            { desc: x => x.tossup },
            { desc: x => x.winProbDiff },
            { desc: x => x.numFBS },
            { desc: x => x.spRatingSum }
        ]
    } else if (gameState == 'post'){
        sortOrder = [
            { desc: x => x.numRanked },
            { asc: x => x.spRankDecileSum },
            { desc: x => Math.max(x.numRanked, x.numPowerFive) },
            { desc: x => x.numFBS },
            { desc: x => x.upset },
            { desc: x => x.spRatingSum },
        ]
    } else {
        sortOrder = [
            { desc: x => x.numRanked },
            { asc: x => x.spRankDecileSum },
            { desc: x => Math.max(x.numRanked, x.numPowerFive) },
            { desc: x => x.numFBS },
            { desc: x => x.spRatingSum }
        ]
    }
    const sorted = sort(allGames).by(sortOrder);
    console.log(sorted);
    return sorted;
}