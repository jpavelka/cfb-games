import React from 'react';
import { Row, Col } from 'reactstrap';
import moment from 'moment';
import { styles } from './../lib/game-card-styles';

export default class CanceledOrPostponedGame extends React.Component {
    render(){
        const teamDispOptions = {
            includeSpread: false,
            includeScore: false
        };
        const quickInfoOptions = [
            {data: 'date', size: '12'}
        ];
        const collapseInfoOptions = [
            'upset',
            'neutral',
            'location',
            'hr',
            'betting'
        ];
        const cardStyleAttr = ''
        const dispInfo = getDisplayInfo(this.props.info, teamDispOptions, quickInfoOptions, collapseInfoOptions, cardStyleAttr);
        return <GameTemplate
            dispInfo = {dispInfo}
            gameId = {this.props.info.id}
        />
    }
}