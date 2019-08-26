import React from 'react';
import { Row, Col } from 'reactstrap';
import moment from 'moment';

export default class UpcomingGame extends React.Component {
    render(){
        const styles = {
            'away': {
                'paddingTop': '10px'
            },
            'home': {

            },
            'bottomRow': {
                'paddingBottom': '10px'
            },
            'card': {
                'marginTop': '10px',
                'marginBottom': '10px',
                'background-color': '#eeeeee'
            },
            'winner':{
                'font-weight': 'bold'
            },
            'loser':{

            },
            'upset':{
                'background-color': '#fcc57c'
            }
        }
        const cardStyle = this.props.info.upset ? Object.assign(styles.card, styles.upset) : styles.card
        return (
            <Col xs='12' sm='6' md='4' lg='3'><div className='card' style={cardStyle}>
                {
                    // team names and logos
                    ['away', 'home'].map(side => {
                        let otherSide = (side == 'home' ? 'away' : 'home')
                        let sideInfo = this.props.info.teams[side];
                        let rankText = sideInfo.rank == 99 ? "" : sideInfo.rank;
                        let winnerLoser = this.props.info.winner == side ? 'winner' : 'loser';
                        return (
                            <Row key={side} style={styles[side]}>
                                <Col xs='9' style={styles[winnerLoser]}>
                                    <img src={sideInfo.logo} height='30px' alt=''/>
                                    &nbsp;{rankText}
                                    &nbsp;{sideInfo.school}
                                </Col>
                                <Col xs='3' style={styles[winnerLoser]}>
                                    {sideInfo.score}
                                </Col>
                            </Row>
                        )
                    })
                }
                <Row style={styles.bottomRow}>
                    {
                        // game time
                        [this.props.info].map(info => {
                            let formatString = 'ddd MMM D';
                            return (
                                <Col xs='8'>{moment(info.date).format(formatString)}</Col>
                            )
                        })
                    }
                </Row>
            </div></Col>
        )
    }
}