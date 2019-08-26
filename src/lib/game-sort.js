import sort from 'fast-sort';

let p5Confs = ['1', '4', '5', '9', '8'];
let g5Confs = ['151', '12', '18', '15', '17', '37'];

export default function gameSort(allGames) {
    if (allGames.lenth == 0){
        return allGames;
    }
    let gameState = allGames[0].state;
    allGames.map(x => {
        x.teams.home.score = parseInt(x.teams.home.score);
        x.teams.away.score = parseInt(x.teams.away.score);
        x.numRanked = numRanked(x);
        x.rankSum = x.teams.home.rank + x.teams.away.rank;
        x.numPowerFive = numPowerFive(x);
        x.numFBS = numFBS(x);
        let lineInfo = getLineInfo(x.lines);
        x.favored = lineInfo.favored;
        x.spread = lineInfo.spread || 999;
        x.spreadPossessions = Math.floor(x.spread - 1) + 1;
        x.overUnder = lineInfo.overUnder;
    });
    let sortOrder
    if (gameState == 'in'){
        sortOrder = [
            { desc: x => x.numRanked },
            { desc: x => x.numPowerFive },
            { desc: x => x.numFBS },
            { asc: x => x.spreadPossessions },
            { asc: x => x.rankSum },
            { asc: x => x.overUnder },
        ]
    } else if (gameState == 'post'){
        allGames.map(x => {
            x.winner = (x.teams.home.score > x.teams.away.score ? 'home' : 'away');
            x.loser = (x.winner == 'home' ? 'away' : 'home');
            x.upset = isUpset(x);
        });
        sortOrder = [
            { desc: x => x.numRanked },
            { desc: x => x.numPowerFive },
            { desc: x => x.numFBS },
            { desc: x => x.upset },
            { asc: x => x.spreadPossessions },
            { asc: x => x.rankSum },
            { asc: x => x.overUnder },
        ]
    } else {
        sortOrder = [
            { desc: x => x.numRanked },
            { desc: x => x.numPowerFive },
            { desc: x => x.numFBS },
            { asc: x => x.spreadPossessions },
            { asc: x => x.rankSum },
            { asc: x => x.overUnder },
        ]
    }
    const sorted = sort(allGames).by(sortOrder)
    return sorted;
}

function isUpset(game){
    // ranked loses to unranked, FBS loses to non-FBS, or team favored by 10+ loses
    if (game.favored === undefined){
        if (game.numFBS == 1){
            if (isFBS(game.teams[game.loser])){
                return true;
            } else {
                return false;
            }
        }
        return;
    }
    if (game.state != 'post'){
        return;
    }
    if (game.winner == game.favored){
        return false;
    }
    if (game.teams[game.winner].rank < 99 && game.teams[game.winner].rank >= 99){
        return true;
    }
    if (game.spread >= 10){
        return true;
    } else {
        return false;
    }
}

function getLineInfo(lines){
    lines = lines || {}
    let info = {}
    let ind = 0
    while (Object.keys(info).length < 3 && ind < lines.length){
        let line = lines[ind];
        if (line.spread){
            info.spread = Math.abs(line.spread)
            info.favored = (line.spread < 0 ? 'home' : 'away')
        }
        if (line.overUnder){
            info.overUnder = line.overUnder
        }
        ind += 1;
    }
    return info
}

function isPowerFive(team){
    return p5Confs.includes(team.conferenceId)
}

function numPowerFive(game){
    return isPowerFive(game.teams.home) + isPowerFive(game.teams.away)
}

function isFBS(team){
    return p5Confs.includes(team.conferenceId) || g5Confs.includes(team.conferenceId)
}

function numFBS(game){
    return isFBS(game.teams.home) + isFBS(game.teams.away)
}

function isRanked(team){
    return team.rank <= 25
}

function numRanked(game){
    return isRanked(game.teams.home) + isRanked(game.teams.away)
}