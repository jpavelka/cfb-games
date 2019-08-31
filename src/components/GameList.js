import React from 'react';
import { Row, Col, Collapse, DropdownToggle, Label, Input } from 'reactstrap';
import axios from 'axios';
import UpcomingGame from './UpcomingGame';
import CompletedGame from './CompletedGame';
import CurrentGame from './CurrentGame';
import CanceledOrPostponedGame from './CanceledOrPostponedGame';
import gameSort from './../lib/game-sort'
import moment from 'moment';



const styles = {
    'away': {
        'marginTop': '-20px'
    },}



export default class GameList extends React.Component {
    render() {
        const allGames = this.props.allGames;
        const currentGames = allGames['in'] || [];
        const upcomingGames = allGames['pre'] || [];
        const completedGames = allGames['post'] || [];
        const postponedGames = allGames['Postponed'] || [];
        const canceledGames = allGames['Canceled'] || [];
        return <div>
            <SubList
                componentType={CurrentGame}
                games={currentGames}
                headerText={'Current games'}
                emptySkip={true}
                indentLevel={0}
            />
            <SubList
                componentType={UpcomingGame}
                games={upcomingGames}
                headerText={'Upcoming games'}
                emptySkip={true}
                potentialSubGroups={['Group by Date', 'Group by Hour']}
                indentLevel={0}
            />
            <SubList
                componentType={CompletedGame}
                games={completedGames}
                headerText={'Completed games'}
                emptySkip={true}
                potentialSubGroups={['Group by Date']}
                indentLevel={0}
            />
            <SubList
                componentType={CanceledOrPostponedGame}
                games={postponedGames}
                headerText={'Postponed games'}
                emptySkip={true}
                indentLevel={0}
            />
            <SubList
                componentType={CanceledOrPostponedGame}
                games={canceledGames}
                headerText={'Canceled games'}
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
        this.state = {
            collapse: true,
            subGroupChecked: initialSubGroupCheck(
                this.props.componentType, this.props.potentialSubGroups, this.props.games
            )
        };
    }

    toggle() {
        this.setState(state => ({ collapse: !state.collapse }));
    }

    render() {
        const games = this.props.games;
        const potentialSubGroups = this.props.potentialSubGroups || [];
        const indentLevel = this.props.indentLevel;
        let subGroupSelectRender;
        let gameSectionRender;
        let indentText = '';
        let extraIndentText = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
        for (let i=0; i<indentLevel; i++){
            indentText = indentText + '\u00A0\u00A0';
            extraIndentText = extraIndentText + '\u00A0\u00A0';
        }
        if (games.length == 0){
            if (this.props.emptySkip || false){
                return <div></div>
            }
            gameSectionRender = <p>{this.props.emptyText}</p>
        } else {
            let checkId = 'check' + this.props.headerHistory + this.props.headerText;
            if (potentialSubGroups.length > 0){
                subGroupSelectRender = <Row><Col>
                    {indentText + extraIndentText}
                    <Label for={checkId}><Input
                        type="checkbox"
                        id={checkId}
                        checked={this.state.subGroupChecked}
                        onChange={e => this.setState({ subGroupChecked: e.target.checked })}
                    />{potentialSubGroups[0]}</Label>
                </Col></Row>
            }

            if (this.state.subGroupChecked && potentialSubGroups.length > 0){
                const subGroup = potentialSubGroups[0];
                let subLists;
                if (subGroup == 'Group by Date'){
                    subLists = filterByDay(games);
                } else if (subGroup == 'Group by Hour'){
                    subLists = filterByHour(games);
                } else if (subGroup == 'Group by Minute'){
                    subLists = filterByMinute(games);
                } else {
                    throw 'Unrecognized sub-group style'
                }
                gameSectionRender = <div>
                    {
                        subLists.map(sub => {
                            return <SubList
                                key={sub.key}
                                componentType={this.props.componentType}
                                games={sub.games}
                                headerText={sub.name}
                                potentialSubGroups={potentialSubGroups.slice(1, potentialSubGroups.length)}
                                indentLevel={this.props.indentLevel + 1}
                                headerHistory={(this.props.headerHistory || '') + ' - ' + this.props.headerText}
                            />
                        })
                    }
                </div>
            } else {
                gameSectionRender = <Row>
                    {
                        (gameSort(games)).map(gameInfo => {
                            return <this.props.componentType info={gameInfo} key={gameInfo.id}/>
                        })
                    }
                </Row>
            }
        }
        let toggleId = 'toggle' + this.props.headerHistory + this.props.headerText;
        return <div>
            <Row><Col><h3>
                <Label for={toggleId}>
                    {indentText + this.props.headerText}
                    <DropdownToggle
                        caret
                        id={toggleId}
                        className='shadow-none'
                        onClick={this.toggle}
                        color='black'
                        style={this.state.collapse ? { transform: 'rotate(270deg)'} : { transform: 'rotate(0deg)' }}
                    ></DropdownToggle>
                </Label>
            </h3></Col></Row>
            <Collapse isOpen={this.state.collapse}>
                <div style={styles.away}>{subGroupSelectRender}</div>
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

function filterByMinute(games){
    let allMinutes = games.map(game => {
        return getGameMinute(game['date'], game['timeValid'])
    })
    allMinutes = new Set(allMinutes)
    allMinutes = Array.from(allMinutes).sort()
    const gamesByMinute = allMinutes.map(m => {
        return {
            'key': m,
            'name': m == '9999' ? 'Time TBD' : moment(m).format('h:mm A'),
            'games': games.filter(game => getGameMinute(game['date'], game['timeValid']) == m)
        }
    })
    return gamesByMinute
}

function getGameMinute(date, timeValid){
    if (timeValid){
        return moment(date).format('YYYY-MM-DD HH:mm')
    } else {
        return '9999'
    }
}

function initialSubGroupCheck(componentType, potentialSubGroups, games){
    let subGroup;
    if (!potentialSubGroups){
        return false;
    }
    if (potentialSubGroups.length > 0){
        subGroup = potentialSubGroups[0];
    } else {
        return false;
    }
    if ([CurrentGame, CompletedGame, CanceledOrPostponedGame].includes(componentType)) {
        return false;
    } else if (componentType == UpcomingGame) {
        if (subGroup == 'Group by Date'){
            return true;
        }
        return false;
    } else {
        throw 'Unrecognized componentType'
    }
}