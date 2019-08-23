import axios from 'axios';

function getInfo(season, week, seasonType, includeWeeks){
   return axios({
        method: 'get',
        url: 'http://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
        params: {
            groups: 80,
            limit: 999,
            dates: season,
            week: week,
            seasontype: seasonType
        }
    }).then(response => {
        let ret = {};
        if (includeWeeks){
            let calendar = response.data.leagues[0].calendar;
            let weeks = [];
            calendar.map(cal => {
                if (cal.value == "2" || cal.value == "3"){
                    cal.entries.map(ent => {
                        weeks.push({
                            label: ent.label,
                            value: ent.value,
                            seasonType: cal.value,
                            season: String(response.data.season.year)
                        })
                    })
                }
            })
            let current = {
                value: response.data.week.number,
                season: response.data.season.year,
                seasonType: response.data.season.type
            }
            weeks.map(w => {
                if (w.value == current.value && w.season == current.season && w.seasonType == current.seasonType){
                    current.label = w.label;
                }
            })
            ret.weeks = weeks;
            ret.current = current;
        }
        let allGames = response.data.events;
        let gameInfo = allGames.map(g => {
            let comp = g.competitions[0];
            let teams = comp.competitors.map(t => {
                return {
                    homeAway: t.homeAway,
                    id: t.id,
                    school: t.team.location,
                    mascot: t.team.name,
                    fullName: t.team.displayName,
                    abbr: t.team.abbreviation,
                    score: t.score,
                    colors: [t.team.color, t.team.alternateColor],
                    logo: t.team.logo,
                    conferenceId: t.team.conferenceId,
                    rank: t.curatedRank != 0 ? t.curatedRank.current : 99
                }
            })
            return {
                id: g.id,
                name: g.name,
                status: g.status.type.description,
                state: g.status.type.state,
                date: comp.date,
                timeValid: comp.timeValid,
                neutral: comp.neutralSite,
                conference: comp.conferenceCompetition,
                recent: comp.recent,
                venue: comp.venue,
                geoBroadcasts: comp.geoBroadcasts,
                teams: {
                    home: teams[0].homeAway == 'home' ? teams[0]: teams[1],
                    away: teams[0].homeAway == 'away' ? teams[0]: teams[1],
                }
            }
        })
        let sortedGames = {};
        let allStatuses = Array.from(new Set(gameInfo.map(g => g.status)));
        allStatuses.map(s => {sortedGames[s] = []});
        gameInfo.map(g => sortedGames[g.status].push(g));
        ret.games = sortedGames;
        return ret
    }).catch(error => {
        console.log('Trouble getting info')
    	return {}
  	})
}

function getLines(season, week, seasonType){
  return axios({
        method: 'get',
        url: 'https://api.collegefootballdata.com/lines',
        params: {
            year: season,
            week: week,
            seasonType: seasonType == 2 ? 'regular' : 'postseason'
        }
    }).then(response => {
        let ret = {};
        response.data.map(x => {
            ret[x.id] = x;
        })
        return ret;
    }).catch(error => {
        console.log('Trouble getting lines')
    	return {}
  	})
}

function combineInputs(info, lines){
  for (let gameType in info.games){
    info.games[gameType].map(x => {
      x.lines = (lines[x.id] || {}).lines;
    })
  }
  return info
}

async function getGames(season, week, seasonType, includeWeeks){
  let info = await getInfo(season, week, seasonType, includeWeeks);
  let lines = await getLines(season || info.current.season, week || info.current.week, seasonType || info.current.seasonType);
  return combineInputs(info, lines);
}

let info = getGames(null, null, null, true)
            .then(x => {
                console.log(x.games.Scheduled[0].lines)
            })
            .catch(error => {
                console.log(error)
            });
