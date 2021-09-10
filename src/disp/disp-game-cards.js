const d3 = require('d3')
const moment = require('moment')
const dispGameCard = require('./disp-game-card')
const sortGames = require('./sort-games')

function dispGameCards({games}){
    const gamesDiv = d3.select('#gamesDiv')
    initializeWindowVars({games: games})
    if (games.length == 0 || games == undefined || games == null){
        gamesDiv.append('h4').text('No games found')
    }
    let statusOrder = ['in', 'pre', 'post', 'postponed', 'canceled']
    statusOrder.map(status => {
        if (window.statuses.includes(status)){            
            dispSubset({
                games: window.games.filter(g => g.statusPartitionValue == status),
                partitionInfo: window.partitions[status],
                level: 'status',
                value: status,
                parentDiv: gamesDiv
            })            
        }
    })
    
}

function dispSubset({games, partitionInfo, level, value, parentDiv}){
    let initialSubsetDiv = parentDiv.append('div')
    let subsetDiv = initialSubsetDiv.append('div').attr('class', 'm-1')
    let subsetTitle = getPartitionTitle({level: level, value: value})
    let toggleId = ['toggle', level, value, games[0].id].join('-')
    let checkId = ['check', level, value, games[0].id].join('-')
    subsetDiv.append('h3')
        .append('a')
        .style('display', 'inline-block')
        .on('click', () => caretTurn(toggleId + '-toggle-caret'))
        .html(subsetTitle)
        .attr('data-toggle', 'collapse')
        .attr('href', '#' + toggleId)
        .attr('role', 'button')
        .attr('aria-expanded', 'false')
        .attr('aria-controls', toggleId)
        .style('color', 'black')
        .style('text-decoration', 'none')
        .on('click', () => caretTurn(toggleId + '-toggle-caret'))
        .append('i')
            .style('margin-left', '10pt')  
            .style('font-size', '14pt')
            .attr('id', toggleId + '-toggle-caret')
            .attr('class', 'fas fa-caret-right')
    subsetDiv = subsetDiv.append('div')
        .attr('class', 'collapse show')
        .attr('id', toggleId)
    let nextPartition = getNextPartition({partitionInfo: partitionInfo, level: level})
    if (nextPartition.bool != undefined){
        labelEl = subsetDiv.append('div')
            .style('margin-bottom', '-20pt')
            .html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
            .append('label')
            .attr('for', checkId)
        labelEl.append('input')
                .attr('id', checkId)
                .attr('type', 'checkbox')
                .attr('class', 'form-check-input')
                .property('checked', nextPartition.bool)
                .on('click', () => checkBoxClick({
                    games: games,
                    partitionInfo: partitionInfo,
                    level: level,
                    value: value,
                    subsetDiv: initialSubsetDiv,
                    nextLevel: nextPartition.level
                }))
        labelEl.append('p').html(getCheckLabelText({level: nextPartition.level}))
    }
    if (nextPartition.bool){
        let partitionKey = nextPartition.level + 'PartitionValue'
        let partitionValues = Array.from(new Set(games.map(g => g[partitionKey]))).sort()     
        partitionValues.map(pv => {
            dispSubset({
                games: games.filter(g => g[partitionKey] == pv),
                partitionInfo: partitionInfo,
                level: nextPartition.level,
                value: pv,
                parentDiv: subsetDiv
            })            
        })
    } else {
        subsetDiv = subsetDiv.append('div')
            .attr('class', 'row')
        let sortedGames = sortGames.sortGames({games: games})
        sortedGames.map(g => {
            dispGameCard.dispGameCard({game: g, parentDiv: subsetDiv})
        })
    }    
}

function getNextPartition({partitionInfo, level}){
    nextPartitionKey = getNextPartitionKey({level: level})
    nextPartitionBool = partitionInfo[nextPartitionKey]
    return {level: nextPartitionKey, bool: nextPartitionBool}
}

function getNextPartitionKey({level}){
    return level == 'status' ? 'date' : (level == 'date' ? 'hour' : null)
}

function getPartitionTitle({level, value}){
    if (level == 'status'){
        const statusToTitleObj = {
            in: 'Current',
            pre: 'Upcoming',
            post: 'Completed',
            postponed: 'Postponed',
            canceled: 'Canceled'
        }
        return (statusToTitleObj[value] || value) + ' games'
    } else if (level == 'date'){
        return moment(value).format('ddd. MMM. D')
    } else if (level == 'hour'){
        return moment('1900-01-01 ' + value + ':00').format('h:00 a')
    }
    
}

function initializeWindowVars({games}){
    window.games = games
    window.statuses = Array.from(new Set(window.games.map(g => g.statusPartitionValue)))
    defaultPartitions = {}
    window.statuses.map(s => {
        defaultPartitions[s] = {topLevel: s}
        if (s == 'post'){
            defaultPartitions[s]['date'] = false
        } else if (['canceled', 'postponed', 'in'].includes(s)){

        } else {
            defaultPartitions[s]['date'] = true
            defaultPartitions[s]['hour'] = false
        }
    })
    window.partitions = defaultPartitions
}

function caretTurn(id){
    caretEl = d3.select('#' + id)
    if (caretEl.classed('fa-caret-right')){
        caretEl.classed('fa-caret-right', false)
        caretEl.classed('fa-caret-down', true)
    } else {
        caretEl.classed('fa-caret-down', false)
        caretEl.classed('fa-caret-right', true)
    }
}

function getCheckLabelText({level}){
    return level == 'date' ? 'Group by Date' : (level == 'hour' ? 'Group by Hour' : level)
}

function checkBoxClick({games, partitionInfo, level, value, subsetDiv, nextLevel}){
    window.partitions[partitionInfo.topLevel][nextLevel] = !window.partitions[partitionInfo.topLevel][nextLevel]
    subsetDiv.selectAll('*').remove()
    dispSubset({        
        games: games,
        partitionInfo: partitionInfo,
        level: level,
        value: value,
        parentDiv: subsetDiv,    
    })
}
    

module.exports = { dispGameCards }