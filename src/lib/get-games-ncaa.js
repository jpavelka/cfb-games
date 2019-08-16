import axios from 'axios';

export default function getGames(season, week, seasonType) {
    let games = axios({
        method: 'post',
        url: 'https://data.ncaa.com/casablanca/scoreboard/football/fbs/2019/01/scoreboard.json',
    }).then(response => {
        let allGames = response.data.games
        let gameInfo = allGames.map(game => {
            let g = game.game
            let teams = {}
            let sides = ['home', 'away']
            sides.map(side => {
                let t = g[side]
                let info = {
                    school: t.names.short,
                    fullName: t.names.full,
                    abbr: t.names.char6,
                    seoName: t.names.seo,
                    conference: t.conferenceNames.conferenceName,
                    division: t.conferenceNames.conferenceDivision,
                    score: t.score,
                    rank: t.rank,
                    winner: t.winner
                }
                info.logo = "https://i.turner.ncaa.com/sites/default/files/images/logos/schools/bgl/" + info.seoName + '.svg'
                teams[side] = info
            })
            return {
                name: g.title,
                status: g.gameState,
                date: g.startDate,
                geoBroadcasts:g.network,
                teams: teams
            }
        })
        let sortedGames = {};
        let allStatuses = Array.from(new Set(gameInfo.map(g => g.status)));
        allStatuses.map(s => {sortedGames[s] = []});
        gameInfo.map(g => sortedGames[g.status].push(g));
        return sortedGames;
    })
    return games;
}

let games = getGames(1, 1, 1)
            .then(allGames => {
                console.log(allGames)
            })
            .catch(error => {
                console.log(error)
            });
