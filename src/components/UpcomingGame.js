import React from 'react';
import { Row, Col } from 'reactstrap';

export default class UpcomingGame extends React.Component {
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
