import React from 'react';
import { Row, Col } from 'reactstrap';
import moment from 'moment';

export default class UpcomingGame extends React.Component {
    render(){
        console.log(this.props.info)
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
                        return (
                            <Row key={side} style={styles[side]}>
                                <Col xs='9'>
                                    <img src={sideInfo['logo']} height='30px' alt=''/>
                                    &nbsp;{sideInfo['school']}
                                </Col>
                                <Col xs='3'>
                                    {sideInfo['score']}
                                </Col>
                            </Row>
                        )
                    })
                }
            </div></Col>
        )
    }
}
