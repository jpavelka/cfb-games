import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { Row, Col } from 'reactstrap';
// import 'bootstrap/dist/css/bootstrap.min.css';

class UpcomingGame extends React.Component {
    render(){
        return <Col className='card' xs='12' sm='6' md='4' lg='3'>
            {
                ['away', 'home'].map(side => {
                    let sideInfo = this.props.info['teams'][side];
                    return <Row>
                        <Col>
                            <img src={sideInfo['logo']} height='30px' alt=''/>
                            &nbsp;{sideInfo['school']}
                        </Col>
                    </Row>
                })
            }
        </Col>
    }
}

class GameList extends React.Component {
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

ReactDOM.render(<GameList />, document.getElementById('root'));
