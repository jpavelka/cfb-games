import React from 'react';
import { Row, Col } from 'reactstrap';
import Select from 'react-select';
import getGames from './../lib/get-games'
import GameList from './GameList'
import { relativeTimeThreshold } from 'moment';

let includeWeeks = true;
let seasonWeeks = new Object;

export default class Selections extends React.Component {
    constructor(props){
        super(props);
        const selectedSeason = undefined;
        const selectedWeek = undefined;
        this.state = {
            selectedSeason: selectedSeason,
            selectedWeek: selectedWeek,
            allGames: {},
            gamesLoaded: false
        };
        this.refreshGames();
    }

    refreshGames(){
        let seasonSelection = this.state.selectedSeason;
        let weekSelection = this.state.selectedWeek == undefined ? undefined : this.state.selectedWeek.value
        let seasonType = this.state.selectedWeek == undefined ? undefined : this.state.selectedWeek.seasonType
        this.setState({gamesLoaded: false})
        getGames(seasonSelection, weekSelection, seasonType, includeWeeks)
            .then(info => {
                if (includeWeeks){
                    includeWeeks = false;
                    this.setState({selectedSeason: info.current.season, selectedWeek: info.current});
                    info.weeks.map(x => {
                        if (!Object.keys(seasonWeeks).includes(x.season)){
                            seasonWeeks[x.season] = [];
                        }
                        seasonWeeks[x.season].push(x);
                    })
                }
                return info
            }).then(info => {
                this.setState({allGames: info.games, gamesLoaded: true});
            })
            .catch(error => {
                this.setState({allGames: {}, gamesLoaded: true});
            });
    }

    seasonChange(seasonSelection) {
        this.setState(
            {selectedSeason: seasonSelection.value, allGames: {}},
            () => this.refreshGames()
        );
    }

    weekChange(weekSelection) {
        this.setState(
            {selectedWeek: weekSelection, allGames: {}},
            () => this.refreshGames()
        );
    }

    render() {
        let gamesDisplay
        if (this.state.gamesLoaded) {
            if (Object.keys(this.state.allGames).length == 0){
                gamesDisplay = <h4>There was an issue loading game data... please make another selection</h4>;
            } else {
                gamesDisplay = <GameList allGames={this.state.allGames}/>
            }
        } else {
            gamesDisplay = <h4>Loading game information...</h4>
        }
        if (Object.keys(seasonWeeks).length == 0){
            return <h4>Loading season schedule information</h4>
        } else {
            return <Row><Col xs='1'></Col><Col xs='10'><Row><Col xs='12' sm='6' md='4' lg='3' xl='2'>
                Season
                <Select
                    options={Object.keys(seasonWeeks).sort().reverse().map(x => makeSelectOption(x))}
                    value={makeSelectOption(this.state.selectedSeason)}
                    onChange={this.seasonChange.bind(this)}
                />
            </Col><Col xs='12' sm='6' md='4' lg='3' xl='2'>
                Week
                <Select
                    options={seasonWeeks[this.state.selectedSeason]}
                    value={this.state.selectedWeek}
                    onChange={this.weekChange.bind(this)}
                />
            </Col></Row>
                {gamesDisplay}
            </Col></Row>
        }
    }
}

function makeSelectOption(x){
    return {value: x, label: x}
}