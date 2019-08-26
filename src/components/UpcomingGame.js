import React from 'react';
import { Row, Col } from 'reactstrap';
import moment from 'moment';
import { styles } from './../lib/game-card-styles';

export default class UpcomingGame extends React.Component {
    render(){
        return (
            <Col xs='12' sm='6' md='4' lg='3'><div className='card' style={styles.card}>
                {
                    // team names and logos
                    ['away', 'home'].map(side => {
                        let sideInfo = this.props.info.teams[side];
                        let rankText = sideInfo.rank == 99 ? "" : sideInfo.rank;
                        let favoredText = this.props.info.favored == side ? "(-" + this.props.info.spread + ")" : "";
                        return (
                            <Row key={side} style={styles[side]}>
                                <Col>
                                    <img src={sideInfo.logo} height='30px' alt=''/>
                                    &nbsp;{rankText}
                                    &nbsp;{sideInfo.school}
                                    &nbsp;{favoredText}
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
                            if (info.timeValid){
                                formatString = formatString + ', h:mm A';
                            }
                            return (
                                <Col xs='8'>{moment(info.date).format(formatString)}</Col>
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
            </div></Col>
        )
    }
}