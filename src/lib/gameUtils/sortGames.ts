export default function sortGames(games) {
    games.sort((a, b) => pairwiseCompare(makeCompList(a), makeCompList(b)));
    return games;
}

const makeCompList = (game) => {
    let keyList = [];
    if (game.statusSort === 'Current'){
        keyList = [
            ['close', 'max'],
            ['under2Tied', 'max'],
            ['under2PotChange', 'max'],
            ['under2PotTie', 'max'],
            ['under5Tied', 'max'],
            ['under5PotChange', 'max'],
            ['under5PotTie', 'max'],
            ['closeUnder2', 'max'],
            ['under8Tied', 'max'],
            ['under8PotChange', 'max'],
            ['under8PotTie', 'max'],
            ['closeUnder5', 'max'],
            ['closeUnder8', 'max'],
            ['gameInterest', 'min'],
        ];
    } else if (game.statusSort === 'Upcoming'){
        keyList = [['gameInterest', 'min']];
    } else if (game.statusSort === 'Completed'){
        keyList = [['gameInterest', 'min']];
    }
    const vals = keyList.map(x => {
        const [k, d] = x;
        let retVal = game[k];
        retVal = (d === 'min' ? -1 : 1) * retVal;
        return retVal
    })
    return vals
}

const pairwiseCompare = (a, b) => {
    for (const i in a){
        if ([null, undefined].includes(a[i])){
            return -1
        }
        else if ([null, undefined].includes(b[i])){
            return 1
        }
        if (a[i] < b[i]){
            return 1
        } else if (a[i] > b[i]){
            return -1
        }
    }
    return -1
}