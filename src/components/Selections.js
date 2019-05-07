import React from 'react';
import { Row, Col } from 'reactstrap';
import Select from 'react-select';
import getGames from './../lib/get-games'
import GameList from './GameList'
import { relativeTimeThreshold } from 'moment';

const seasons = [2019, 2018, 2017].map(x => {
    return {value: x, label: x}
})
const seasonWeeks = {
    '2019': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 'Bowls'],
    '2018': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 'Bowls']
}
const weeks = [1, 2, 3, 20].map(x => {
    return {value: x, label: x}
})

export default class Selections extends React.Component {
    constructor(props){
        super(props);
        const selectedSeason = Object.keys(seasonWeeks).reduce((a, b) => a > b ? a : b);
        const selectedWeek = seasonWeeks[selectedSeason][0];
        this.state = {
            selectedSeason: selectedSeason,
            selectedWeek: selectedWeek,
            allGames: {},
            gamesLoaded: false
        };
        this.refreshGames();
    }

    refreshGames(seasonSelection, weekSelection){
        this.setState({gamesLoaded: false})
        let seasonType
        if (weekSelection == 'Bowls'){
            weekSelection = 1;
            seasonType = 3;
        } else {
            seasonType = 2;
        }
        getGames(seasonSelection, weekSelection, seasonType)
            .then(allGames => {
                this.setState({allGames: allGames, gamesLoaded: true});
            })
            .catch(error => {
                this.setState({allGames: {}, gamesLoaded: true});
            });
    }

    seasonChange(seasonSelection) {
        this.setState({selectedSeason: seasonSelection.value, allGames: {}});
        this.refreshGames(seasonSelection.value, this.state.selectedWeek);
    }

    weekChange(weekSelection) {
        this.setState({selectedWeek: weekSelection.value, allGames: {}});
        this.refreshGames(this.state.selectedSeason, weekSelection.value);
    }

    render() {
        console.log(this.state)
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
                options={seasonWeeks[this.state.selectedSeason].map(x => makeSelectOption(x))}
                value={makeSelectOption(this.state.selectedWeek)}
                onChange={this.weekChange.bind(this)}
            />
        </Col></Row>
            {gamesDisplay}
        </Col></Row>
    }
}

function makeSelectOption(x){
    return {value: x, label: x}
}