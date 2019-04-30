import axios from 'axios';

export default function getGames(season, week, seasonType) {
    let games = axios({
        method: 'post',
        url: 'https://us-central1-cfb-games.cloudfunctions.net/function-1',
        data: {
            season: season,
            week: week,
            season_type: seasonType
        }
    }).then(response => {
        return response.data;
    })
    return games;
}
