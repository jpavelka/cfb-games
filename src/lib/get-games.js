import axios from 'axios';

export default function getGames(season, week, seasonType, includeWeeks) {
    let info = axios({
        method: 'post',
        url: 'https://us-central1-cfb-games.cloudfunctions.net/function-2',
        data: {
            season: season,
            week: week,
            seasonType: seasonType,
            includeWeeks: includeWeeks
        }
    }).then(response => {
        return response.data;
    })
    return info;
}

// let info = getGames()
//             .then(x => {
//                 console.log(x.games)
//             })
//             .catch(error => {
//                 console.log(error)
//             });
