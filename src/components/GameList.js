import React from 'react';
import { Row, Col, Collapse, DropdownToggle } from 'reactstrap';
import axios from 'axios';
import UpcomingGame from './UpcomingGame';
import CompletedGame from './CompletedGame';
import CurrentGame from './CurrentGame';
import moment from 'moment';

export default class GameList extends React.Component {
    render() {
        const allGames = this.props.allGames;
        const currentGames = allGames['In Progress'] || [];
        const upcomingGames = allGames['Scheduled'] || [];
        const completedGames = allGames['Final'] || [];
        const postponedGames = allGames['Postponed'] || [];
        const canceledGames = allGames['Canceled'] || [];
        return <div>
            <SubList
                componentType={CurrentGame}
                games={currentGames}
                headerText={'Current games'}
                emptySkip={true}
                subGroups={[]}
                indentLevel={0}
            />
            <SubList
                componentType={UpcomingGame}
                games={upcomingGames}
                headerText={'Upcoming games'}
                emptyText={'No games remaining'}
                subGroups={['gameDate', 'gameHour']}
                indentLevel={0}
            />
            <SubList
                componentType={CompletedGame}
                games={completedGames}
                headerText={'Completed games'}
                emptyText={'No completed games... yet'}
                indentLevel={0}
            />
            <SubList
                componentType={CompletedGame}
                games={canceledGames}
                headerText={'Canceled games'}
                emptySkip={true}
                indentLevel={0}
            />
            <SubList
                componentType={CompletedGame}
                games={postponedGames}
                headerText={'Postponed games'}
                emptySkip={true}
                indentLevel={0}
            />
        </div>
    }
}

class SubList extends React.Component {
    constructor(props){
        super(props);
        this.toggle = this.toggle.bind(this);
        this.state = { collapse: true };
    }

    toggle() {
        this.setState(state => ({ collapse: !state.collapse }));
    }

    render() {
        const games = this.props.games;
        const subGroups = this.props.subGroups || [];
        let gameSectionRender;
        if (games.length == 0){
            if (this.props.emptySkip || false){
                return <div></div>
            }
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
                                indentLevel={this.props.indentLevel + 1}
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
        let indentText = '';
        for (let i=0; i<this.props.indentLevel; i++){
            indentText = indentText + '\u00A0\u00A0';
        }
        return <div>
            <Row><Col><h3>
                {indentText + this.props.headerText}
                <DropdownToggle
                    caret
                    className='shadow-none'
                    onClick={this.toggle}
                    color='black'
                    style={this.state.collapse ? { transform: 'rotate(270deg)'} : { transform: 'rotate(0deg)' }}
                ></DropdownToggle>
            </h3></Col></Row>
            <Collapse isOpen={this.state.collapse}>
                {gameSectionRender}
            </Collapse>
        </div>
    }
}

function filterByDay(games){
    let allDates = games.map(game => {
        return getGameDay(game['date'], game['timeValid'])
    })
    allDates = new Set(allDates)
    allDates = Array.from(allDates).sort()
    const gamesByDate = allDates.map(d => {
        return {
            'key': d,
            'name':moment(d).format('ddd. MMM DD'),
            'games': games.filter(game => getGameDay(game['date'], game['timeValid']) == d)
        }
    })
    return gamesByDate
}

function getGameDay(date, timeValid){
    if (timeValid){
        return moment(date).format('YYYY-MM-DD')
    } else {
        const gameTime = new Date(date);
        let monthNum = gameTime.getUTCMonth() + 1;
        monthNum = monthNum < 10 ? '0' + monthNum : monthNum;
        let dayNum = gameTime.getUTCDate();
        dayNum = dayNum < 10 ? '0' + dayNum : dayNum;
        return gameTime.getUTCFullYear() + '-' + monthNum + '-' + dayNum
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