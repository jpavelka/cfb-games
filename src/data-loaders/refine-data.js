const moment = require("moment");

function fullyRefineData(games) {
  games.map((g) => {
    g.statusPartitionValue = ["Postponed", "Canceled"].includes(g.status)
      ? g.status.toLowerCase()
      : g.statusState;
    g.datePartitionValue = moment(g.date).format("YYYYMMDD");
    g.hourPartitionValue = g.timeValid ? moment(g.date).format("H") : null;
    g.gamecastLink =
      "https://www.espn.com/college-football/game?gameId=" + g.id;
    let sides = ["homeTeam", "awayTeam"];
    if (g.statusPartitionValue == "in") {
      g.margin = Math.abs(g.homeTeam.score - g.awayTeam.score);
      g.marginPossessions = Math.floor((g.margin - 0.5) / 8) + 1;
      g.tie = g.margin == 0;
      g.leading = g.tie
        ? undefined
        : g.homeTeam.score > g.awayTeam.score
        ? "home"
        : "away";
      g.under2 =
        totalSecondsRemaining({ period: g.period, seconds: g.clock }) <= 2 * 60;
      g.under5 =
        totalSecondsRemaining({ period: g.period, seconds: g.clock }) <= 5 * 60;
      g.under8 =
        totalSecondsRemaining({ period: g.period, seconds: g.clock }) <= 8 * 60;
      g.close =
        g.period <= 2 ? g.marginPossessions <= 3 : g.marginPossessions <= 2;
      g.potentialLeadChange = g.margin < 8 && g.leading != g.possession;
      g.potentialTie = g.margin <= 8 && g.leading != g.possession;
      if (g.status == "In Progress") {
        g.displayClock = getDisplayClock(g.clock);
        g.displayPeriod = getDisplayPeriod(g.period);
      } else if (g.status == "End of Period") {
        g.displayPeriod = "End of " + getDisplayPeriod(g.period);
      } else {
        g.displayPeriod = g.status;
      }
      if (g.hasBettingInfo) {
        g.favoredLeading = g.leading == g.betting.favored;
        g.upsetAlert = isUpsetAlert(g);
      }
    }
    if (g.statusPartitionValue == "post") {
      g.winner = g.homeTeam.score > g.awayTeam.score ? "home" : "away";
      if (g.hasBettingInfo) {
        g.favoredWon = g.winner == g.betting.favored;
        g.clearUpset = !g.favoredWon && g.betting.spread >= 10;
      }
    }
    sides.map((team) => {
      t = g[team];
      t.isRanked = t.rank != undefined;
      t.logo = "https://a.espncdn.com/i/teamlogos/ncaa/500/" + t.id + ".png";
      t.clubhouseLink =
        "https://www.espn.com/college-football/team/_/id/" + t.id;
    });
    g.numRanked = parseInt(g.homeTeam.isRanked + g.awayTeam.isRanked);
  });
  return games;
}

function minimallyRefineData({ weekGames, bettingLines, spPlusRatings }) {
  let games = simplifyGameInfo(weekGames);
  games = incorporateBettingLines({ games: games, lines: bettingLines });
  games = incorporateSpPlusRatings({ games: games, ratings: spPlusRatings });
  return games;
}

function isUpsetAlert(g) {
  if (g.betting.spread < 10) {
    return false;
  } else {
    return (
      (g.period >= 3 && !g.favoredLeading) ||
      (g.under8 && g.marginPossessions <= 1)
    );
  }
}

function totalSecondsRemaining({ period, seconds }) {
  if (period > 4) {
    return 0;
  } else {
    let secondsInFuturePeriods = 15 * 60 * (4 - period);
    let minSec = getMinutesAndSecondsRemaining(seconds);
    let secondsLeftInPeriod = 60 * minSec.minutes + minSec.seconds;
    return secondsLeftInPeriod + secondsInFuturePeriods;
  }
}

function simplifyGameInfo(weekGames) {
  let games = weekGames.map((g) => {
    let comp = g.competitions[0];
    let broadcasts = (
      (comp.broadcasts || []).filter((c) => c.market == "national")[0] || {
        names: [],
      }
    ).names;
    let status = g.status.type;
    let venue = comp.venue || { address: {} };
    comp.notes.map((n) => n.headline).join(", ");
    let game = {
      id: g.id,
      date: comp.timeValid ? g.date : moment.utc(g.date),
      timeValid: comp.timeValid,
      broadcasts: broadcasts,
      isConf: comp.conferenceCompetition,
      neutralSite: comp.neutralSite,
      weather: g.weather,
      completed: status.completed,
      status: status.description,
      statusId: status.id,
      statusState: status.state,
      venueCity: venue.address.city,
      venueState: venue.address.state,
      venueName: venue.fullName,
      venueIndoor: venue.indoor,
      datePartitionValue: moment(g.date).format("YYYYMMDD"),
      hourPartitionValue: comp.timeValid ? moment(g.date).format("H") : null,
      title: comp.notes.map((n) => n.headline).join(", "),
    };
    let sides = ["home", "away"];
    sides.map((side) => {
      game[side + "Team"] = simplifyTeamInfo(
        g,
        side,
        game.status,
        game.statusState
      );
    });
    if (game.statusState == "in") {
      game.period = g.status.period;
      game.clock = g.status.clock;
      if (game.status == "In Progress") {
        let situation = g.competitions[0].situation;
        sides.map((side) => {
          game[side + "Team"].timeoutsLeft = situation[side + "Timeouts"];
        });
        let lastPlay = situation.lastPlay || {};
        game.lastPlayText = lastPlay.text;
        let down = situation.down;
        if (lastPlay.team) {
          let possessionTeam =
            lastPlay.team.id == game.homeTeam.id ? "home" : "away";
          if (down > 0) {
            game.down = down;
            game.distance = situation.distance;
            game.yardLine = situation.yardLine;
            game.possession = possessionTeam;
            game.downDistanceText = situation.downDistanceText;
          } else {
            game.possession = possessionTeam == "home" ? "away" : "home";
          }
          let winProbs = lastPlay.probability;
          if (winProbs) {
            sides.map((side) => {
              game[side + "Team"].winProb = (
                100 * winProbs[side + "WinPercentage"]
              ).toFixed(1);
            });
            game.projectedWinner =
              game.homeTeam.winProb > game.awayTeam.winProb ? "home" : "away";
          }
        }
      }
    }
    return game;
  });
  return games;
}

function simplifyTeamInfo(game, side, status, statusState) {
  let t = game.competitions[0].competitors.filter((t) => t.homeAway == side)[0];
  let rank = t.curatedRank.current;
  let records = t.records || [];
  let record = records.filter((r) => r.type == "total")[0] || {};
  let confRecord = records.filter((r) => r.type == "vsconf")[0] || {};
  let team = {
    id: t.id,
    school: t.team.location,
    mascot: t.team.name,
    abbreviation: t.team.abbreviation,
    color: t.team.color,
    altColor: t.team.alternateColor,
    rank: rank != 99 && rank > 0 ? rank : undefined,
    record: record.summary,
    confRecord: confRecord.summary,
  };
  if (statusState == "in" || status == "Final") {
    team.score = parseInt(t.score);
  }
  return team;
}

function incorporateBettingLines({ games, lines }) {
  games.map((g) => {
    lines = lines || {};
    let gameLines = (lines[g.id] || { lines: [] }).lines;
    g.hasBettingInfo = gameLines.length > 0;
    if (g.hasBettingInfo) {
      g.betting = {};
      let line = getFavoredLine(gameLines);
      let lineDesc = line.formattedSpread;
      let lineDescSplit = lineDesc.split(" ");
      let lineDescValue = lineDescSplit.pop();
      let lineDescTeam = lineDescSplit.join(" ");
      g.betting.favored =
        lineDescTeam == g.homeTeam.school
          ? "home"
          : lineDescTeam == g.awayTeam.school
          ? "away"
          : null;
      if (!g.betting.favored) {
        g.betting.favored = parseFloat(line.spread) > 0 ? "away" : "home";
      }
      g.betting.spread = Math.abs(parseFloat(lineDescValue));
      g.betting.overUnder = parseFloat(line.overUnder);
    }
  });
  return games;
}

function getFavoredLine(lines) {
  let consensus = lines.filter((x) => x.provider == "consensus");
  return consensus[0] || lines[0];
}

function incorporateSpPlusRatings({ games, ratings }) {
  ratings = ratings || [];
  ratings = ratings.filter((r) => r.team != "nationalAverages");
  let ratingsByTeam = {};
  let lastRating = null;
  let lastRank = 0;
  let rankChange = 1;
  ratings.map((r) => {
    if (r.rating == lastRating) {
      r.rank = lastRank;
      rankChange += 1;
    } else {
      r.rank = lastRank + 1;
      lastRank += 1;
      rankChange = 1;
    }
    lastRating = r.rating;
    ratingsByTeam[r.team] = { rating: r.rating, rank: r.rank };
  });
  minRating = ratings.length > 1 ? ratings[ratings.length - 1].rating : 0;
  games.map((g) => {
    ["homeTeam", "awayTeam"].map((side) => {
      r = ratingsByTeam[g[side].school] || {};
      g[side].spPlusRating = r.rating || minRating;
      g[side].spPlusRank = r.rank || ratings.length;
    });
  });
  return games;
}

function getMinutesAndSecondsRemaining(s) {
  let minutes = Math.floor(s / 60);
  let seconds = s - 60 * minutes;
  return { minutes: minutes, seconds: seconds };
}

function getDisplayClock(s) {
  if (s == 0) {
    return undefined;
  }
  let minSec = getMinutesAndSecondsRemaining(s);
  return minSec.minutes + ":" + String(minSec.seconds).padStart(2, "0");
}

function getDisplayPeriod(p) {
  if (p <= 4) {
    return nToNth(p) + " Quarter";
  }
  return "OT " + (p - 4);
}

function nToNth(n) {
  let x = n == 1 ? "st" : n == 2 ? "nd" : n == 3 ? "rd" : "th";
  return n + x;
}

module.exports = { minimallyRefineData, fullyRefineData };
