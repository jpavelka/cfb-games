const axios = require('axios');

function getEspnScoreboardData({season, week, seasonType, groups=80, limit=999}){
    if (season != undefined && week == undefined){
        week = 1
    }
    return axios({
        method: 'get',
        url: 'http://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
        params: {
            groups: groups,
            limit: limit,
            dates: season,
            week: week,
            seasontype: seasonType
        },
        timeout: 5000
    }).then(response => {
        console.log("Scoreboard data loaded")
        return response
    }).catch((error) => {
        console.log("Trouble getting scoreboard data")
        console.log("Error", error);
    });
}

function getEspnSeasonInfo({season=null}){
    return getEspnScoreboardData({season: season, limit: 1}).then(response => {
        const currentSeason = response.data.season.year;
        const currentSeasonType = response.data.season.type;
        const currentWeekNum = response.data.week.number;
        seasonTypeName = {};
        response.data.leagues[0].calendar.map(x => {
            seasonTypeName[x.value] = x.label;
        })
        let allWeeks = [];
        response.data.leagues[0].calendar.map(sTypeInfo => {
            if (['Regular Season', 'Postseason'].includes(seasonTypeName[sTypeInfo.value])){
                sTypeInfo.entries.map(week => {
                   week.seasonType = parseInt(sTypeInfo.value);
                   week.season = currentSeason;
                   week.value = parseInt(week.value)
                   allWeeks.push(week);
                })
            }
        })
        seasonInfo = {
            allWeeks: allWeeks,
            currentSeason: currentSeason,
            currentSeasonType: currentSeasonType,
            currentWeekNum: currentWeekNum,
            seasonTypeName: seasonTypeName
        }
        return seasonInfo
    }).catch((error) => {
        console.log("Error", error);
    })
}

module.exports = { getEspnSeasonInfo, getEspnScoreboardData }