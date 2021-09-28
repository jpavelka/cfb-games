const axios = require("axios");
const sort = require("fast-sort");

function getBettingLines({ season, week, seasonType }) {
  console.log("Attempting to load betting info");
  return axios({
    method: "get",
    url: "https://us-central1-playground-255411.cloudfunctions.net/cfbd-get",
    params: {
      api: "betting",
      season: season,
      week: week,
      seasonType: seasonType,
    },
    timeout: 5000,
  })
    .then((response) => {
      console.log("Betting info loaded");
      let ret = {};
      response.data.map((x) => {
        ret[x.id] = x;
      });
      return ret;
    })
    .catch((error) => {
      console.log("Trouble getting betting info");
      console.log(error);
    });
}

function getSpPlusRatings({ season, teams }) {
  console.log("Attempting to load SP+ ratings");
  return axios({
    method: "get",
    url: "https://us-central1-playground-255411.cloudfunctions.net/cfbd-get",
    params: {
      api: "ratings",
      season: season,
    },
    timeout: 5000,
  })
    .then((response) => {
      console.log("SP+ ratings loaded");
      spData = response.data;
      teamNameSwaps = {
        "UT San Antonio": "UTSA",
        Connecticut: "UConn",
        "Southern Mississippi": "Southern Miss",
        "Louisiana Monroe": "UL Monroe",
      };
      return spData.map((x) => {
        if (Object.keys(teamNameSwaps).includes(x.team)) {
          x.team = teamNameSwaps[x.team];
        }
        return x;
      });
    })
    .catch((error) => {
      console.log("Trouble loading SP+ ratings");
      console.log(error);
    });
}

function sortByRating(data) {
  sort(data).by([{ desc: (x) => x.rating }]);
  let lastRating = data[0].rating + 1;
  let lastRank = 0;
  let rankDiff = 1;
  data.map((x) => {
    if (x.rating == lastRating) {
      x.rank = lastRank;
      rankDiff = rankDiff + 1;
    } else {
      x.rank = lastRank + rankDiff;
      lastRank = x.rank;
      lastRating = x.rating;
      rankDiff = 1;
    }
    x.rankDecile = Math.ceil((x.rank / data.length) * 10);
  });
  return data;
}

module.exports = { getBettingLines, getSpPlusRatings };
