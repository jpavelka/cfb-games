const d3 = require("d3");
const moment = require("moment");
const cfbData = require("../data-loaders/get-data");
const dispCards = require("./disp-game-cards");

function dispAll({ seasonInfo, savedDataSource }) {
  const mainDiv = d3
    .select("body")
    .append("div")
    .attr("id", "mainDiv")
    .attr("class", "m-3");
  const selectionsDiv = mainDiv.append("div").attr("id", "selectionsDiv");
  const gamesDiv = mainDiv.append("div").attr("id", "gamesDiv");
  setupSelections(seasonInfo);
  window.seasonInfo = seasonInfo;
  window.subdivision = seasonInfo.subdivision;
  displayFromSelections({ savedDataSource: savedDataSource });
}

function setupSelections(seasonInfo) {
  const selectionsDiv = d3.select("#selectionsDiv");
  const allWeeksSelect = selectionsDiv
    .append("div")
    .html("&nbsp;&nbsp;Week")
    .style("font-weight", "bold")
    .append("select")
    .attr("class", "form-control")
    .attr("id", "weekSelect")
    .style("width", "250px")
    .on("change", () => weekSelectChange());
  seasonInfo.allWeeks.map((w) => {
    let dtFrmt = "M/D";
    let label =
      moment(w.startDate).format(dtFrmt) +
      " - " +
      moment(w.endDate).format(dtFrmt);
    label = w.label + " (" + label + ")";
    weekSelect = allWeeksSelect
      .append("option")
      .attr("value", w.value + "_" + w.seasonType)
      .text(label);
    if (
      seasonInfo.currentWeekNum == w.value &&
      seasonInfo.currentSeasonType == w.seasonType
    ) {
      weekSelect
        .property("selected", "true")
        .style("background-color", "#e8e848");
    }
  });
  window.selectedWeekNum = seasonInfo.currentWeekNum;
  window.selectedSeasonType = seasonInfo.currentSeasonType;
}

async function displayFromSelections({ savedDataSource }) {
  d3.select("#gamesDiv").selectAll("*").remove();
  let games = await getWeekGamesData({ savedDataSource: savedDataSource });
  dispCards.dispGameCards({ games: games });
}

async function getWeekGamesData({ savedDataSource }) {
  const weekGames = await cfbData.getWeekGames({
    season: window.seasonInfo.currentSeason,
    week: window.selectedWeekNum,
    seasonType: window.selectedSeasonType,
    subdivision: window.subdivision,
    savedDataSource: savedDataSource,
  });
  return weekGames;
}

function weekSelectChange() {
  let allWeeksSelect = d3.select("#weekSelect");
  let values = allWeeksSelect.node().value.split("_");
  window.selectedWeekNum = values[0];
  window.selectedSeasonType = values[1];
  displayFromSelections({});
}

module.exports = { dispAll };
