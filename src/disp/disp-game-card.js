const moment = require("moment");
const d3 = require("d3");

function dispGameCard({ game, parentDiv }) {
  let cardDiv = parentDiv
    .append("div")
    .attr("class", "col-12 col-sm-6 col-md-4 col-xl-3")
    .append("div")
    .attr("class", "card")
    .style("background-color", "rgb(238, 238, 238)")
    .style("margin-top", "10px")
    .style("margin-bottom", "10px");
  if (game.upsetAlert || game.clearUpset) {
    cardDiv.style("background-color", "#fcc57c");
  }
  cardDiv = cardDiv.append("div").attr("class", "m-1");
  addTeamLines({ game: game, cardDiv: cardDiv });
  addInfoRow({ game: game, cardDiv: cardDiv });
  addCollapseInfo({ game: game, cardDiv: cardDiv });
}

function addTeamLines({ game, cardDiv, timeoutsCorrect = false }) {
  let teamOrder = ["away", "home"];
  const imgSize = "35px";
  if (game.title != "") {
    cardDiv
      .append("div")
      .html(game.title)
      .style("font-size", "10pt")
      .style("color", "rgb(85, 85, 85)")
      .style("margin-bottom", "-5pt");
  }
  teamOrder.map((side) => {
    const team = game[side + "Team"];
    let teamRow = cardDiv
      .append("div")
      .attr("class", "row")
      .style("padding-top", "5px");
    let teamCol = teamRow.append("div");
    let teamNameDiv = teamCol
      .append("div")
      .attr("class", "row")
      .append("div")
      .attr("class", "col")
      .style("display", "flex");
    teamNameDiv
      .append("img")
      .attr("src", team.logo)
      .style("height", imgSize)
      .style("width", imgSize);
    if (team.isRanked) {
      teamNameDiv
        .append("span")
        .style("font-size", "10pt")
        .style("margin-top", "1pt")
        .html("&nbsp;" + team.rank);
    }
    teamNameDiv
      .append("span")
      .html("&nbsp;" + team.school)
      .style("font-size", "12pt")
      .style("overflow", "hidden")
      .style("text-overflow", "ellipsis")
      .style("white-space", "nowrap");
    if (game.hasBettingInfo) {
      if (game.betting.favored == side) {
        teamNameDiv
          .append("span")
          .style("font-size", "10pt")
          .style("white-space", "nowrap")
          .style("margin-top", "1.5pt")
          .html("&nbsp;(-" + game.betting.spread + ")");
      }
    }
    if (game.statusPartitionValue == "in" && game.possession == side) {
      teamNameDiv
        .append("span")
        .style("font-size", "8pt")
        .style("margin-top", "4pt")
        .html("&nbsp;&#127944;");
    }
    let recordLineText =
      (team.record ? team.record : "") +
      (team.confRecord ? " (" + team.confRecord + ")" : "");
    let recordLineDiv = teamCol
      .append("div")
      .style("margin-top", "-10px")
      .style("margin-left", "40px")
      .style("font-size", "8pt")
      .style("color", "rgb(85, 85, 85)");
    if (team.timeoutsLeft && timeoutsCorrect) {
      let timeoutsHtml = "&nbsp;&nbsp;&nbsp;&nbsp;";
      for (i = 0; i < team.timeoutsLeft; i++) {
        timeoutsHtml += "&#8226;&nbsp;";
      }
      recordLineText += timeoutsHtml;
    }
    recordLineDiv.html(recordLineText);
    if (["in", "post"].includes(game.statusPartitionValue)) {
      teamCol.attr("class", "col-9");
      scoreColText = team.score;
      teamRow.append("div").attr("class", "col-3").html(scoreColText);
    } else {
      teamCol.attr("class", "col");
    }
  });
}

function addInfoRow({ game, cardDiv }) {
  const infoRow = cardDiv.append("div").style("padding-top", "10px");
  let timeDisp = "";
  if (game.statusState == "in") {
    if (game.displayClock) {
      timeDisp = game.displayClock + " - ";
    }
    timeDisp += game.displayPeriod;
  } else {
    timeDisp = moment(game.date).format(
      game.timeValid ? "ddd MMM D, h:mm a" : "ddd MMM D"
    );
  }
  infoRow.append("span").style("float", "left").html(timeDisp);
  let broadcastSpan = infoRow
    .append("span")
    .style("float", "right")
    .html("&nbsp;&nbsp;&nbsp;");
  let broadcastText = game.broadcasts.join(", ");
  let isEspnBroadcast =
    game.broadcasts
      .map(
        (x) =>
          ["ESPN", "SECN", "ACCN"].includes(x.slice(0, 4)) ||
          x.slice(0, 3) == "ABC"
      )
      .reduce((x, y) => x + y, 0) > 0;
  if (isEspnBroadcast) {
    let search = ["homeTeam", "awayTeam"]
      .map((x) => game[x].school.replace(" ", "%20"))
      .join("%20");
    let linkText =
      "https://www.espn.com/search/_/q/" + search + "/o/watch/appearance/dark";
    broadcastSpan.append("a").html(broadcastText).attr("href", linkText);
  } else {
    broadcastSpan.append("span").html(broadcastText);
  }
}

function addCollapseInfo({ game, cardDiv }) {
  let collapseId = "infoCollapse" + game.id;
  cardDiv
    .append("div")
    .style("clear", "left")
    .append("a")
    .attr("id", collapseId + "MoreLess")
    .attr("data-toggle", "collapse")
    .attr("href", "#" + collapseId)
    .attr("role", "button")
    .attr("aria-controls", collapseId)
    .attr("class", "")
    .text("More")
    .on("click", () => collapseInfoClick(collapseId));
  let collapseDiv = cardDiv
    .append("div")
    .attr("id", collapseId)
    .attr("class", "collapse");
  let addHr = false;
  if (game.clearUpset) {
    addHr = true;
    collapseDiv
      .append("div")
      .style("font-style", "italic")
      .style("color", "#e64d35")
      .text("Upset");
  }
  if (game.upsetAlert) {
    addHr = true;
    collapseDiv
      .append("div")
      .style("font-style", "italic")
      .style("color", "#e64d35")
      .text("Upset Alert");
  }
  if (game.neutralSite) {
    addHr = true;
    collapseDiv
      .append("div")
      .style("font-style", "italic")
      .style("color", "#555555")
      .text("Neutral Site");
  }
  if (addHr) {
    collapseDiv.append("hr");
  }
  if (game.statusPartitionValue == "in") {
    // situation
    let addHr = false;
    if (game.down) {
      addHr = true;
      collapseDiv.append("div").text(game.downDistanceText);
    }
    if (game.lastPlayText) {
      addHr = true;
      collapseDiv
        .append("div")
        .text("Last Play: ")
        .append("span")
        .style("font-style", "italic")
        .style("color", "#555555")
        .text(game.lastPlayText);
    }
    if (game.projectedWinner) {
      addHr = true;
      projWinTeam = game[game.projectedWinner + "Team"];
      collapseDiv
        .append("div")
        .text(
          "Proj. Winner: " +
            projWinTeam.school +
            " (" +
            projWinTeam.winProb +
            "%)"
        );
    }
    if (addHr) {
      collapseDiv.append("hr");
    }
  }
  // links
  collapseDiv.append("div").text("Links (ESPN):");
  collapseDiv
    .append("div")
    .append("a")
    .text("Gamecast")
    .attr("href", game.gamecastLink);
  let sides = ["away", "home"];
  sides.map((side) => {
    let team = game[side + "Team"];
    collapseDiv
      .append("div")
      .append("a")
      .text(team.school + " Clubhouse")
      .attr("href", team.clubhouseLink);
  });
  collapseDiv.append("hr");
  // venue
  collapseDiv.append("div").text(game.venueName);
  collapseDiv
    .append("div")
    .text(game.venueCity + (game.venueState ? ", " + game.venueState : ""));
  collapseDiv.append("hr");
  if (game.hasBettingInfo) {
    // betting
    collapseDiv
      .append("div")
      .text(
        "Line: " +
          game[game.betting.favored + "Team"].school +
          " -" +
          game.betting.spread
      );
    collapseDiv.append("div").text("Over/Under: " + game.betting.overUnder);
  }
}

function collapseInfoClick(id) {
  let collapseControlDiv = d3.select("#" + id + "MoreLess");
  collapseControlDiv.text(
    collapseControlDiv.property("text") == "More" ? "Less" : "More"
  );
}

module.exports = { dispGameCard };
