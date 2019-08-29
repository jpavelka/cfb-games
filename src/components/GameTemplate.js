import React from 'react';
import { Row, Col, Collapse, Label } from 'reactstrap';
import { styles } from './../lib/game-card-styles';

export default class GameTemplate extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            moreLessCollapsed: true
        };
    }

    render(){
        return (
            <Col xs='12' sm='6' md='4' lg='3'><div className='card' style={this.props.dispInfo.cardStyle}>
                {this.props.dispInfo.teamsDispInfo}
                {this.props.dispInfo.quickGameInfo}
                <Row style={styles.moreLess}><Col><Label for={this.props.gameId + 'moreLess'}>
                    <div
                        style={styles.moreLess}
                        id={this.props.gameId + 'moreLess'}
                        onClick={() => this.setState({ moreLessCollapsed: !this.state.moreLessCollapsed })}
                    >{this.state.moreLessCollapsed ? "More" : "Less"}</div></Label>
                </Col></Row>
                <Collapse isOpen={!this.state.moreLessCollapsed}>
                    {this.props.dispInfo.collapseGameInfo}
                </Collapse>
            </div></Col>
        )
    }
}