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
        let lineInfo = getLineInfo(x.lines, x.teams.home.school, x.teams.away.school);
        x.favored = lineInfo.favored;
        x.underdog = x.favored == 'home' ? 'away' : 'home';
        x.spread = lineInfo.spread || 999;
        x.spreadPossessions = Math.floor((x.spread - 1) / 8) + 1;
        x.overUnder = lineInfo.overUnder;
        x.clearFavorite = isClearFavorite(x);
    });
    let sortOrder
    if (gameState == 'in'){
        allGames.map(x => {
            x.homeHasBall = x.possession == x.teams.home.id;
            x.awayHasBall = x.possession == x.teams.away.id;
            x.margin = Math.abs(x.teams.home.score - x.teams.away.score);
            x.marginPossesions = Math.floor((x.margin - 1) / 8) + 1;
            x.tie = x.margin == 0;
            x.homeAhead = x.teams.home.score > x.teams.away.score;
            x.awayAhead = x.teams.away.score > x.teams.home.score;
            x.aheadHasBall = (x.homeHasBall && x.homeAhead) || (x.awayHasBall && x.awayAhead);
            x.behindHasBall = (x.homeHasBall && x.awayAhead) || (x.awayHasBall && x.homeAhead);
            x.potentialLeadChange = x.behindHasBall && x.margin <= 7;
            x.potentialTie = x.behindHasBall && x.margin == 8;
            x.close = isGameClose(x);
            x.secondsRemaining = getSecondsRemaining(x.period, x.clock);
            x.under2 = x.secondsRemaining <= (2 * 60);
            x.under5 = x.secondsRemaining <= (5 * 60);
            x.under8 = x.secondsRemaining <= (8 * 60);
            x.under15 = x.secondsRemaining <= (15 * 60);
            x.under20 = x.secondsRemaining <= (20 * 60);
            x.under25 = x.secondsRemaining <= (25 * 60);
            x.winProbDiff = getWinProbDiff(x);
            x.tossup = x.winProbDiff < 20;
            if (x.favored){
                x.favoredAhead = x.teams[x.favored].score > x.teams[x.underdog].score;
                x.underdogAhead = x.teams[x.underdog].score > x.teams[x.favored].score;
                x.favoredHasBall = x.possession == x.teams[x.favored].id;
                x.underdogHasBall = x.possession == x.teams[x.underdog].id;
                x.upsetAlert = x.under20 && x.clearFavorite && (x.underdogAhead || x.marginPossesions == 1);
            }
        });
        sortOrder = [
            { desc: x => x.close },
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
            { desc: x => x.numPowerFive },
            { desc: x => x.close * x.under20 },
            { desc: x => x.close * x.under25 },
            { desc: x => x.close * x.period },
            { asc: x => !x.close * x.period },
            { desc: x => x.potentialLeadChange },
            { desc: x => x.potentialTie },
            { desc: x => x.tossup },
            { desc: x => x.winProbDiff },
            { desc: x => x.numFBS },
            { asc: x => x.spreadPossessions },
            { asc: x => x.rankSum },
            { asc: x => x.overUnder },
        ]
    } else if (gameState == 'post'){
        allGames.map(x => {
            x.winner = (x.teams.home.score > x.teams.away.score ? 'home' : 'away');
            x.loser = (x.winner == 'home' ? 'away' : 'home');
            x.FCSoverFBS = !isFBS(x.teams[x.winner]) && isFBS(x.teams[x.loser])
            x.upset = x.clearFavorite && (x.winner == x.underdog);
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
    const sorted = sort(allGames).by(sortOrder);
    console.log(sorted);
    return sorted;
}

function getWinProbDiff(x){
    let diff;
    let lastPlay = x.lastPlay;
    if (lastPlay.homeWinPercentage) {
        diff = 100 * Math.abs(lastPlay.homeWinPercentage || 0 - lastPlay.awayWinPercentage || 0);
    } else {
        diff = undefined;
    }
    return diff
}

function isGameClose(x){
    let close;
    if (x.period <= 2){
        close = x.marginPossesions <= 3;
    } else {
        close = x.marginPossesions <= 2;
    }
    return close
}

function getSecondsRemaining(period, clock){
    let secondsRemaining;
    if (period > 4){
        secondsRemaining = 0;
    } else {
        secondsRemaining = (60 * 15) * (4 - period) + clock;
    }
    return secondsRemaining
}

function isClearFavorite(game){
    if (game.favored === undefined){
        return;
    }
    if (game.spread >= 10){
        return true;
    }
    if (isRanked(game.teams[game.favored]) && !isRanked(game.teams[game.underdog])){
        return true;
    }
    return false;
}

function getLineInfo(lines, homeName, awayName){
    lines = lines || {}
    let info = {}
    let ind = 0
    while (Object.keys(info).length < 3 && ind < lines.length){
        let line = lines[ind];
        if (line.spread){
            info.spread = Math.abs(line.spread)
            let fs = line.formattedSpread.trim();
            let hs = (homeName + ' -' + line.spread).trim();
            let as = (awayName + ' -' + line.spread).trim();
            if (fs == hs){
                info.favored = 'home';
            } else if (as == fs){
                info.favored = 'away';
            } else {
                info.favored = (line.spread < 0 ? 'home' : 'away')
            }
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