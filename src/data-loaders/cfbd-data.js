const axios = require('axios');
const sort = require('fast-sort')


function getBettingLines({season, week, seasonType}) {
    console.log('Attempting to load betting info');
    return axios({
        method: 'get',
        url: 'https://api.collegefootballdata.com/lines',
        params: {
            year: season,
            week: week,
            seasonType: seasonType == 2 ? 'regular' : 'postseason'
        },
        timeout: 5000
    }).then(response => {
        console.log('Betting info loaded');
        let ret = {};
        response.data.map(x => {
            ret[x.id] = x;
        })
        return ret
    }).catch(error => {
        console.log('Trouble getting betting info');
        console.log(error);
  	})
}


function getSpPlusRatings({season, teams}) {
    console.log('Attempting to get SP+ ratings from collegfootballdata.com');
    return axios({
        method: 'get',
        url: 'https://api.collegefootballdata.com/ratings/sp',
        params: {
            year: season
        },
        timeout: 5000
    }).then(response => {
        console.log('Successfully loaded SP+ ratings');
        spData = response.data;
        return spData;
    }).catch(error => {
        console.log('Trouble loading SP+ ratings');
        console.log(error);
    })
}


function sortByRating(data){
    sort(data).by([{ desc: x => x.rating }]);
    let lastRating = data[0].rating + 1;
    let lastRank = 0;
    let rankDiff = 1;
    data.map(x => {
        if (x.rating == lastRating){
            x.rank = lastRank;
            rankDiff = rankDiff + 1;
        } else {
            x.rank = lastRank + rankDiff;
            lastRank = x.rank;
            lastRating = x.rating;
            rankDiff = 1;
        }
        x.rankDecile = Math.ceil(x.rank / data.length * 10);
    })
    return data;
}


module.exports = { getBettingLines, getSpPlusRatings }