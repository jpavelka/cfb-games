import React from 'react';
import { Row, Col, Collapse, Label} from 'reactstrap';
import moment from 'moment';
import { styles } from './../lib/game-card-styles';

export default function getDisplayInfo(info, teamDispOptions, quickInfoOptions, collapseInfoOptions, cardStyleCheckAttr) {
    // team lines
    let sidesInfo = ['away', 'home'].map(side => {
        let sideInfo = info.teams[side];
        return {
            homeAway: side,
            image: <img src={sideInfo.logo} height='30px' alt=''/>,
            rank: sideInfo.rank == 99 ? "" : sideInfo.rank,
            name: info.teams[side].school,
            favoredText: info.favored == side ? "(-" + info.spread + ")" : "",
            score: sideInfo.score,
            id: sideInfo.id,
            gameId: info.id,
            hasBall: side == 'home' ? info.homeHasBall : info.awayHasBall
        }
    })
    let dFormatStr = 'ddd MMM D';
    let dtFormatStr = dFormatStr;
    if (info.timeValid){
        dtFormatStr = dtFormatStr + ', h:mm A';
    }
    let broadcastString = '';
    info.geoBroadcasts.map(bc => {
        if (broadcastString != ''){
            broadcastString = broadcastString + ', ';
        }
        broadcastString = broadcastString + bc.media.shortName;
    })
    let lastPlay = info.lastPlay || {}
    let otherInfo = {
        gameId: info.id,
        dateStr: moment(info.date).format(dFormatStr),
        dateTimeStr: moment(info.date).format(dtFormatStr),
        broadcastStr: broadcastString,
        periodClockStr: info.periodClockStr,
        downDistanceText: info.downDistanceText,
        upset: info.upset,
        upsetText: info.upset ? "Upset!" : "",
        upsetAlertText: info.upsetAlert ? "Upset Alert!" : "",
        neutralText: info.neutral ? "Neutral Site" : "",
        venueText: info.venue.split('(')[0],
        venueCityText: info.venueCity + ', ' + info.venueState,
        favored: info.favored,
        bettingLineText: info.favored ? "Line: " + info.teams[info.favored].school + " -" + info.spread : "",
        overUnderText: info.favored ? "Over/Under: " +  (info.overUnder ? info.overUnder : "N/A") : "No betting info",
        lastPlayText: lastPlay.text,
    }
    let retInfo = {
        teamsDispInfo: sidesInfo.map(info => teamLine(info, teamDispOptions)),
        quickGameInfo: bottomRow(otherInfo, quickInfoOptions),
        collapseGameInfo: collapseRows(otherInfo, collapseInfoOptions),
        cardStyle: gameCardStyle(info, cardStyleCheckAttr)
    }
    return retInfo;
}

function makeCols(columnsInfo, rowStyle){
    const cols = columnsInfo.map(c => {
        return <Col key={c.key} xs={c.size}>
            {c.data}
        </Col>
    })
    if (rowStyle){
        return <Row style={rowStyle}>{cols}</Row>
    }
    return <Row>{cols}</Row>
}

function teamLine(teamInfo, teamDispOptions){
    let s = [
        teamInfo.image,
        <span>{' ' + teamInfo.rank}</span>,
        <span>{' ' + teamInfo.name}</span>
    ];
    if (teamDispOptions.includeSpread){
        s.push(<span>{' ' + teamInfo.favoredText}</span>);
    }
    if (teamDispOptions.possessionIndicator && teamInfo.hasBall){
        s.push(<span>{' ' + String.fromCharCode(9679)}</span>)
    }
    let colInfo = [{
        key: teamInfo.gameId + '_' + teamInfo.id + '_teamInfoCol',
        size: '12',
        data: s
    }]
    if (teamDispOptions.includeScore){
        colInfo[0].size = '9';
        colInfo.push({
            key: teamInfo.gameId + '_' + teamInfo.id + '_teamInfoCol1',
            size: '3',
            data: <span>{teamInfo.score}</span>
        })
    }
    return makeCols(colInfo, styles[teamInfo.homeAway])
}

function gameCardStyle(info, checkAttr) {
    const defaultStyle = styles.card;
    if (checkAttr == 'upset'){
        return info.upset ? styles.cardUpset : defaultStyle;
    } else if (checkAttr == 'upsetAlert') {
        return info.upsetAlert ? styles.cardUpsetAlert : defaultStyle;
    } else {
        return defaultStyle;
    }
}

function bottomRow(info, quickInfoOptions){
    let colInfo = quickInfoOptions.map(o => {
        let data
        if (o.data == 'date'){
            data = info.dateStr;
        }else if (o.data == 'dateTime'){
            data = info.dateTimeStr;
        } else if (o.data == 'broadcast'){
            data = info.broadcastStr;
        } else if (o.data == 'periodClock'){
            data = info.periodClockStr;
        } else {
            throw 'Unrecognized data type';
        }
        return {
            data: data,
            size: o.size,
            key: info.gameId + o.data + 'quick'
        }
    })
    return makeCols(colInfo, styles.bottomRow)
}

function collapseRows(info, collapseInfoOptions) {
    let rows = [];
    for (var o in collapseInfoOptions) {
        const op = collapseInfoOptions[o];
        if (op == 'location') {
            rows.push(<Row><Col>{info.venueText}</Col></Row>);
            rows.push(<Row><Col>{info.venueCityText}</Col></Row>);
        } else if (op == 'betting') {
            let style = info.favored ? {} : styles.noInfo
            rows.push(<Row><Col>{info.bettingLineText}</Col></Row>);
            rows.push(<Row style={style}><Col>{info.overUnderText}</Col></Row>);
        } else if (op == 'hr') {
            rows.push(<Row><Col><hr/></Col></Row>);
        } else if (op == 'neutral') {
            rows.push(<Row style={styles.neutral}><Col>{info.neutralText}</Col></Row>);
        } else if (op == 'upset') {
            rows.push(<Row style={styles.upsetText}><Col>{info.upsetText}</Col></Row>);
        } else if (op == 'upsetAlert') {
            rows.push(<Row style={styles.upsetAlertText}><Col>{info.upsetAlertText}</Col></Row>);
        } else if (op == 'downDistance') {
            rows.push(<Row><Col>{info.downDistanceText}</Col></Row>);
        } else if (op == 'lastPlay') {
            rows.push(<Row><Col>{'Last Play: ' + info.lastPlayText}</Col></Row>);
        } else {
            throw 'Unrecognized data type';
        }
    }
    return <div>{rows}</div>;
}