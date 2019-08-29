import React from 'react';
import { Row, Col, Collapse, Label } from 'reactstrap';
import moment from 'moment';
import { styles } from './../lib/game-card-styles';

export default class UpcomingGame extends React.Component {
    render(){
        const teamDispOptions = {
            includeSpread: false,
            includeScore: true
        };
        const quickInfoOptions = [
            {data: 'periodClock', size: '8'},
            {data: 'broadcast', size: '4'}
        ];
        const collapseInfoOptions = [
            'upsetAlert',
            'neutral',
            'location',
            'hr',
            'betting'
        ];
        const cardStyleAttr = '';
        const dispInfo = getDisplayInfo(this.props.info, teamDispOptions, quickInfoOptions, collapseInfoOptions, cardStyleAttr);
        return <GameTemplate
            dispInfo = {dispInfo}
            gameId = {this.props.info.id}
        />
    }
}