import React from 'react';
import { Row, Col, Collapse, Label } from 'reactstrap';
import moment from 'moment';
import { styles } from './../lib/game-card-styles';

export default class UpcomingGame extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            moreLessCollapsed: true
        };
    }

    render(){
        const info = this.props.info
        const cardStyle = info.upset ? styles.cardUpset : styles.card
        return (
            <Col xs='12' sm='6' md='4' lg='3'><div className='card' style={cardStyle}>
                {
                    // team names and logos
                    ['away', 'home'].map(side => {
                        let otherSide = (side == 'home' ? 'away' : 'home')
                        let sideInfo = this.props.info.teams[side];
                        let rankText = sideInfo.rank == 99 ? "" : sideInfo.rank;
                        let winnerLoser = info.winner == side ? 'winner' : 'loser';
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
                        [info].map(info => {
                            let formatString = 'ddd MMM D';
                            return (
                                <Col xs='8'>{moment(info.date).format(formatString)}</Col>
                            )
                        })
                    }
                </Row>
                <Row style={styles.moreLess}><Col><Label for={info.id + 'moreLess'}>
                    <div
                        style={styles.moreLess}
                        id={info.id + 'moreLess'}
                        onClick={() => this.setState({ moreLessCollapsed: !this.state.moreLessCollapsed })}
                    >{this.state.moreLessCollapsed ? "More" : "Less"}</div></Label>
                </Col></Row>
                <Collapse isOpen={!this.state.moreLessCollapsed}>
                    <Row style={styles.upsetText}><Col>{info.upset ? "Upset!" : ""}</Col></Row>
                    <Row style={styles.neutral}><Col>{info.neutral ? "Neutral Site" : ""}</Col></Row>
                    <Row><Col>{info.venue.split('(')[0]}</Col></Row>
                    <Row><Col>{info.venueCity + ', ' + info.venueState}</Col></Row>
                    <Row><Col><hr/></Col></Row>
                    <Row><Col>{info.favored ? "Line: " + info.teams[info.favored].school + " -" + info.spread : ""}</Col></Row>
                    <Row style={info.favored ? {} : styles.noInfo}><Col>{info.favored ? "Over/Under: " + info.overUnder : "No betting info"}</Col></Row>
                </Collapse>
            </div></Col>
        )
    }
}