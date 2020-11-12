const espnData = require('./espn-data');
const cfbdData = require('./cfbd-data');
const refineData = require('./refine-data')
const axios = require('axios')


async function getWeekGames({season, week, seasonType, subdivision, returnType='refined', savedDataSource}){
    let allData = {}
    if (savedDataSource){
        allData = await axios({
            method: 'get',
            url: 'http://localhost:3000/' + savedDataSource,
        }).then(response => {
            console.log("Saved data loaded")   
            return response.data
        }).catch((error) => {
            console.log("Trouble getting saved data")
            console.log("Error", error);
        });
    } else {
        const weekGames = await getEspnWeekGames({season: season, week: week, seasonType: seasonType, subdivision: subdivision})
        const bettingLines = await cfbdData.getBettingLines({season: season, week: week, seasonType: seasonType})
        const spPlusRatings = await cfbdData.getSpPlusRatings({season: season})
        allData = {
            weekGames: weekGames,
            bettingLines: bettingLines,
            spPlusRatings: spPlusRatings
        }
    }
    if (returnType == 'raw'){
        return allData
    } else {
        let minimallyRefinedData = refineData.minimallyRefineData(allData)
        if (returnType == 'minimallyRefined'){
            return minimallyRefinedData
        } else {
            return refineData.fullyRefineData(minimallyRefinedData)
        }
    }
}


async function getEspnWeekGames({season, week, seasonType, subdivision}){
    if( ['fbs', 'fcs'].includes(subdivision)){
        weekGames = await getSubdivisionWeekGames({
            season: season,
            week: week,
            seasonType: seasonType,
            subdivision: subdivision == 'fbs' ? 80 : 81
        })
    } else {
        let allWeekGames = await Promise.all([80, 81].map(async s => {
            let wg = await getSubdivisionWeekGames({
                season: season,
                week: week,
                seasonType: seasonType,
                subdivision: s
            })
            return wg
        }))
        let combinedWeekGames = allWeekGames[0];
        combinedWeekGames = combinedWeekGames.concat(allWeekGames[1]);
        allGameIds = [];
        combinedWeekGames.map(g => {
            if (!allGameIds.includes(g.id)){
                allGameIds.push(g.id);
                weekGames.push(g);
            }
        })
    }
    return weekGames
}


async function getSubdivisionWeekGames({season, week, seasonType, subdivision}){
    return espnData.getEspnScoreboardData({
        season: season,
        week: week,
        seasonType: seasonType,
        groups: subdivision,
    }).then(response => {
        return response.data.events
    }).catch((error) => {
        console.log("Error", error);
    });
}


function getSeasonInfo({season}){
    return espnData.getEspnSeasonInfo({season: season})
}


module.exports = { getSeasonInfo, getWeekGames }