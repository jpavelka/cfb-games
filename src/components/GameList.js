import React from 'react';
import { Row } from 'reactstrap';
import axios from 'axios';
import UpcomingGame from './UpcomingGame'

export default class GameList extends React.Component {
    constructor() {
        super()
        this.state = {
            allGames: {1: []}
        };
    }

    componentDidMount() {
        axios({method: 'get', url: 'https://us-east1-cfb-games.cloudfunctions.net/get_games'})
            .then(response => {this.setState({allGames: response.data})});
    }

    render() {
        return <Row>
            {
                this.state.allGames[1].map(gameInfo => {
                    console.log(gameInfo);
                    return <UpcomingGame info={gameInfo} key={gameInfo['id']}/>
                })
            }
        </Row>
    }
}