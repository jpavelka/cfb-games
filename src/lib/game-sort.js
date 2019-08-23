import sort from 'fast-sort';

let p5Confs = ['1', '4', '5', '9', '8'];
let g5Confs = ['151', '12', '18', '15', '17', '37'];

export default function gameSort(allGames) {
    allGames.map(x => {
        x.numRanked = numRanked(x);
        x.rankSum = x.teams.home.rank + x.teams.away.rank;
        x.numPowerFive = numPowerFive(x);
        x.numFBS = numFBS(x);
        let lineInfo = getLineInfo(x.lines);
        x.favored = lineInfo.favored;
        x.spread = lineInfo.spread;
        x.overUnder = lineInfo.overUnder;
    });
    const sorted = sort(allGames).by([
        { desc: u => u.numRanked },
        { desc: u => u.numPowerFive },
        { desc: u => u.numFBS },
        { asc: u => u.rankSum },
        { asc: u => u.overUnder },
    ])
    console.log(sorted);
    return sorted;
}

function getLineInfo(lines){
    let info = {}
    let ind = 0
    while (Object.keys(info).length < 3 && ind < lines.length){
        let line = lines[ind];
        if (line.spread){
            info.spread = Math.abs(line.spread)
            info.favored = line.spread < 0 ? 'home' : 'away'
        }
        if (line.overUnder){
            info.overUnder = line.overUnder
        }
        ind += 1;
    }
    return info
}

function isPowerFive(team){
    return p5Confs.includes(team.conferenceId) ? 1 : 0
}

function numPowerFive(game){
    return isPowerFive(game.teams.home) + isPowerFive(game.teams.away)
}

function isFBS(team){
    return p5Confs.includes(team.conferenceId) || g5Confs.includes(team.conferenceId) ? 1 : 0
}

function numFBS(game){
    return isFBS(game.teams.home) + isFBS(game.teams.away)
}

function isRanked(team){
    return team.rank <= 25 ? 1 : 0
}

function numRanked(game){
    return isRanked(game.teams.home) + isRanked(game.teams.away)
}