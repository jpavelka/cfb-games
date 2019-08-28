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
        return (
            <Col xs='12' sm='6' md='4' lg='3'><div className='card' style={styles.card}>
                {
                    // team names and logos
                    ['away', 'home'].map(side => {
                        let sideInfo = this.props.info.teams[side];
                        let rankText = sideInfo.rank == 99 ? "" : sideInfo.rank;
                        let possId = this.props.info.possession;
                        return (
                            <Row key={side} style={styles[side]}>
                                <Col xs='9'>
                                    <img src={sideInfo.logo} height='30px' alt=''/>
                                    &nbsp;{rankText}
                                    &nbsp;{sideInfo.school}
                                    &nbsp;{sideInfo.id == possId ? String.fromCharCode(9679) : ""}
                                </Col>
                                <Col xs='3'>
                                    {sideInfo.score}
                                </Col>
                            </Row>
                        )
                    })
                }
                <Row style={styles['bottomRow']}>
                    {
                        // period/clock
                        [this.props.info].map(info => {
                            return (
                                <Col xs='8'>{info.periodClockStr}</Col>
                            )
                        })
                    }
                    {
                        // broadcasts
                        [this.props.info].map(info => {
                            let broadcastString = '';
                            info.geoBroadcasts.map(bc => {
                                if (broadcastString != ''){
                                    broadcastString = broadcastString + ', ';
                                }
                                broadcastString = broadcastString + bc.media.shortName;
                            })
                            return (
                                <Col xs='4'>{broadcastString}</Col>
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