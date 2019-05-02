import React from 'react';
import { Row, Col } from 'reactstrap';
import Select from 'react-select';
import getGames from './../lib/get-games'
import GameList from './GameList'

const seasons = [2019, 2018, 2017].map(x => {
    return {value: x, label: x}
})
const weeks = [1, 2, 3].map(x => {
    return {value: x, label: x}
})

export default class Selections extends React.Component {
    constructor(props){
        super(props);
        const selectedSeason = seasons[0];
        const selectedWeek = weeks[0];
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
        getGames(seasonSelection, weekSelection, 2).then(allGames => {
            this.setState({allGames: allGames, gamesLoaded: true})
        });
    }

    seasonChange(seasonSelection) {
        this.setState({selectedSeason: seasonSelection, allGames: {}});
        this.refreshGames(seasonSelection.value, this.state.selectedWeek.value);
    }

    weekChange(weekSelection) {
        this.setState({selectedWeek: weekSelection, allGames: {}});
        this.refreshGames(this.state.selectedSeason.value, weekSelection.value);
    }

    render() {
        let gamesDisplay
        if (this.state.gamesLoaded) {
            gamesDisplay = <GameList allGames={this.state.allGames}/>
        } else {
            gamesDisplay = <h4>Loading game information...</h4>
        }
        return <Row><Col xs='1'></Col><Col xs='10'><Row><Col xs='12' sm='6' md='4' lg='3' xl='2'>
            Season
            <Select
                options={seasons}
                value={this.state.selectedSeason}
                onChange={this.seasonChange.bind(this)}
            />
        </Col><Col xs='12' sm='6' md='4' lg='3' xl='2'>
            Week
            <Select
                options={weeks}
                value={this.state.selectedWeek}
                onChange={this.weekChange.bind(this)}
            />
        </Col></Row>
            {gamesDisplay}
        </Col></Row>
    }
}