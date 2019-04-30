import React from 'react';
import { Row, Col } from 'reactstrap';
import axios from 'axios';
import UpcomingGame from './UpcomingGame'

export default class GameList extends React.Component {
    render() {
        return <Row>
            {
                (this.props.allGames['Scheduled'] || []).map(gameInfo => {
                    return <UpcomingGame info={gameInfo} key={gameInfo['id']}/>
                })
            }
        </Row>
    }
}