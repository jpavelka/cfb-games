import React from 'react';
import { Row, Col, Collapse, Label} from 'reactstrap';
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
        const info = this.props.info;
        let formatString = 'ddd MMM D';
        if (info.timeValid){
            formatString = formatString + ', h:mm A';
        }
        const dateTimeStr = moment(info.date).format(formatString);
        let broadcastString = '';
        info.geoBroadcasts.map(bc => {
            if (broadcastString != ''){
                broadcastString = broadcastString + ', ';
            }
            broadcastString = broadcastString + bc.media.shortName;
        })
        return (
            <Col xs='12' sm='6' md='4' lg='3' key={info.id + 'gameCard'}><div className='card' style={styles.card}>
                {
                    // team names and logos
                    ['away', 'home'].map(side => {
                        let sideInfo = info.teams[side];
                        let rankText = sideInfo.rank == 99 ? "" : sideInfo.rank;
                        let favoredText = info.favored == side ? "(-" + info.spread + ")" : "";
                        return (
                            <Row key={info.id + side + 'row'} style={styles[side]}>
                                <Col key={info.id + side + 'teamInfoCol'}>
                                    <img src={sideInfo.logo} height='30px' alt=''/>
                                    &nbsp;{rankText}
                                    &nbsp;{sideInfo.school}
                                    &nbsp;{favoredText}
                                </Col>
                            </Row>
                        )
                    })
                }
                <Row key={info.id + 'extraInfoRow'} style={styles.bottomRow}>
                    <Col key={info.id + 'dateTimeCol'} xs='8'>{dateTimeStr}</Col>
                    <Col key={info.id + 'broadcastCol'} xs='4'>{broadcastString}</Col>
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
