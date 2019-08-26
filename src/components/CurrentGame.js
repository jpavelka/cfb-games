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
                'marginBottom': '10px'
            }
        }
        return (
            <Col xs='12' sm='6' md='4' lg='3'><div className='card' style={styles['card']}>
                {
                    // team names and logos
                    ['away', 'home'].map(side => {
                        let sideInfo = this.props.info['teams'][side];
                        let rankText = sideInfo['rank'] == 99 ? "" : sideInfo['rank'];
                        let possId = this.props.info['possession'];
                        return (
                            <Row key={side} style={styles[side]}>
                                <Col xs='9'>
                                    <img src={sideInfo['logo']} height='30px' alt=''/>
                                    &nbsp;{rankText}
                                    &nbsp;{sideInfo['school']}
                                    &nbsp;{sideInfo['id'] == possId ? String.fromCharCode(9679) : ""}
                                </Col>
                                <Col xs='3'>
                                    {sideInfo['score']}
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
                            info['geoBroadcasts'].map(bc => {
                                if (broadcastString != ''){
                                    broadcastString = broadcastString + ', ';
                                }
                                broadcastString = broadcastString + bc['media']['shortName'];
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