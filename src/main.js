const cfbData = require('./data-loaders/get-data');
const disp = require('./disp/disp-all');

async function main({defaultSubdivision='fbs', savedDataSource}){
    const seasonInfo = await cfbData.getSeasonInfo({})
    seasonInfo.subdivision = defaultSubdivision
    disp.dispAll({seasonInfo: seasonInfo, savedDataSource: savedDataSource})
}

module.exports = { main }






