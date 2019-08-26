import React from 'react';
import { Row, Col } from 'reactstrap';
import moment from 'moment';

export default class CanceledOrPostponedGame extends React.Component {
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
            }
        }
        return (
            <Col xs='12' sm='6' md='4' lg='3'><div className='card' style={styles['card']}>
                {
                    // team names and logos
                    ['away', 'home'].map(side => {
                        let sideInfo = this.props.info['teams'][side];
                        let rankText = sideInfo['rank'] == 99 ? "" : sideInfo['rank'];
                        let favoredText = this.props.info.favored == side ? "(-" + this.props.info.spread + ")" : "";
                        return (
                            <Row key={side} style={styles[side]}>
                                <Col xs='12'>
                                    <img src={sideInfo['logo']} height='30px' alt=''/>
                                    &nbsp;{rankText}
                                    &nbsp;{sideInfo['school']}
                                    &nbsp;{favoredText}
                                </Col>
                            </Row>
                        )
                    })
                }
                <Row style={styles['bottomRow']}>
                    {
                        // game time
                        [this.props.info].map(info => {
                            let formatString = 'ddd MMM D';
                            return (
                                <Col xs='8'>{moment(info['date']).format(formatString)}</Col>
                            )
                        })
                    }
                </Row>
            </div></Col>
        )
    }
}