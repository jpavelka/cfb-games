import React from 'react';
import getDisplayInfo from './../lib/game-card-info';
import GameTemplate from './GameTemplate'

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