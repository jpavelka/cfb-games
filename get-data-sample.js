const fs = require('fs')
const cfbData = require('./src/data-loaders/get-data');


async function saveSample(){
    const seasonInfo = await cfbData.getSeasonInfo({});
    const weekGames = await cfbData.getWeekGames({
        season: seasonInfo.currentSeason,
        week: seasonInfo.currentWeekNum,
        seasonType: seasonInfo.currentSeasonType,
        subdivision: 'fbs',
        returnType: 'raw'
    })
    try {
        fs.writeFileSync('sample-data.json', JSON.stringify(weekGames))
    } catch (err) {
        console.error(err)
    }
}

saveSample()
