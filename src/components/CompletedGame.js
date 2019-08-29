import React from 'react';
import getDisplayInfo from './../lib/game-card-info';
import GameTemplate from './GameTemplate';

export default class UpcomingGame extends React.Component {
    render(){
        const teamDispOptions = {
            includeSpread: false,
            includeScore: true
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
        const cardStyleAttr = 'upset'
        const dispInfo = getDisplayInfo(this.props.info, teamDispOptions, quickInfoOptions, collapseInfoOptions, cardStyleAttr);
        return <GameTemplate
            dispInfo = {dispInfo}
            gameId = {this.props.info.id}
        />
    }
}