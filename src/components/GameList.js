import React from 'react';
import { Row, Col } from 'reactstrap';
import axios from 'axios';
import UpcomingGame from './UpcomingGame'
import CompletedGame from './CompletedGame'
import moment from 'moment';

export default class GameList extends React.Component {
    render() {
        const allGames = this.props.allGames;
        const upcomingGames = allGames['Scheduled'] || [];
        const completedGames = allGames['Final'] || [];
        const canceledGames = allGames['Canceled'] || [];
        const postponedGames = allGames['Postponed'] || [];
        return <div>
            <SubList
                componentType={UpcomingGame}
                games={upcomingGames}
                headerText={'Upcoming games'}
                emptyText={'No upcoming games this week'}
                subGroups={['gameDate', 'gameHour']}
            />
            <SubList
                componentType={CompletedGame}
                games={completedGames}
                headerText={'Completed games'}
                emptyText={'No completed games this week'}
            />
        </div>
    }
}

class SubList extends React.Component {
    render() {
        const games = this.props.games;
        const subGroups = this.props.subGroups || [];
        let gameSectionRender;
        if (games.length == 0){
                gameSectionRender = <p>{this.props.emptyText}</p>
        } else {
            if (subGroups.length > 0){
                const subGroup = subGroups[0];
                let subLists;
                if (subGroup == 'gameDate'){
                    subLists = filterByDay(games);
                } else if (subGroup == 'gameHour'){
                    subLists = filterByHour(games);
                } else {
                    throw 'Unrecognized sub-group style'
                }
                gameSectionRender = <div>
                    {
                        subLists.map(sub => {
                            return <SubList
                                componentType={this.props.componentType}
                                games={sub['games']}
                                headerText={sub['name']}
                                subGroups={subGroups.slice(1, subGroups.length)}
                            />
                        })
                    }
                </div>
            } else {
                gameSectionRender = <Row>
                    {
                        (games).map(gameInfo => {
                            return <this.props.componentType info={gameInfo} key={gameInfo['id']}/>
                        })
                    }
                </Row>
            }
        }
        return <div>
            <Row><Col><h3>{this.props.headerText}</h3></Col></Row>
            {gameSectionRender}
        </div>
    }
}

function filterByDay(games){
    console.log(games)
    let allDates = games.map(game => {
        return getGameDay(game['date'], game['timeValid'])
    })
    allDates = new Set(allDates)
    allDates = Array.from(allDates).sort()
    const gamesByDate = allDates.map(d => {
        return {
            'key': d,
            'name':moment(d).format('ddd. MMM D'),
            'games': games.filter(game => getGameDay(game['date'], game['timeValid']) == d)
        }
    })
    return gamesByDate
}

function getGameDay(date, timeValid){
    if (timeValid){
        return moment(date).format('YYYY-MM-DD')
    } else {
        const gameTime = new Date(date)
        return gameTime.getUTCFullYear() + '-' + (gameTime.getUTCMonth() + 1) + '-' + gameTime.getUTCDate()
    }
}

function filterByHour(games){
    let allHours = games.map(game => {
        return getGameHour(game['date'], game['timeValid'])
    })
    allHours = new Set(allHours)
    allHours = Array.from(allHours).sort()
    const gamesByHour = allHours.map(h => {
        return {
            'key': h,
            'name': h == '9999' ? 'Time TBD' : moment(h).format('h:00 A'),
            'games': games.filter(game => getGameHour(game['date'], game['timeValid']) == h)
        }
    })
    return gamesByHour
}

function getGameHour(date, timeValid){
    if (timeValid){
        return moment(date).format('YYYY-MM-DD HH')
    } else {
        return '9999'
    }
}