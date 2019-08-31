import React from 'react';
import getDisplayInfo from './../lib/game-card-info';
import GameTemplate from './GameTemplate'

export default class CurrentGame extends React.Component {
    render(){
        const teamDispOptions = {
            includeSpread: false,
            includeScore: true,
            possessionIndicator: true
        };
        const quickInfoOptions = [
            {data: 'periodClock', size: '8'},
            {data: 'broadcast', size: '4'}
        ];
        const collapseInfoOptions = [
            'upsetAlert',
            'downDistance',
            // 'lastPlay',
            'hr',
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