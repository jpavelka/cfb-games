import sort from 'fast-sort'

export function sortGames({games}){
    let status = games[0].statusPartitionValue
    let sortOrder = [
        {desc: g => g.homeTeam.isRanked + g.awayTeam.isRanked},
        {desc: g => g.homeTeam.spPlusRating + g.awayTeam.spPlusRating}
    ]
    if (status == 'in'){
        let inGameSortOrder = [
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
            { desc: x => x.close * x.under8 },
        ]
        sortOrder = inGameSortOrder.concat(sortOrder)
    }
    const sorted = sort(games).by(sortOrder);
    return sorted;
}

// module.exports = { sortGames }