<script lang="ts">
    import { moreInfoGame as game } from "$lib/stores";
    import { moreInfoVisible as visible} from "$lib/stores";
    import GameBar from "./GameBar.svelte";
    import GameIcons from "./GameIcons.svelte";
    import Broadcast from "./Broadcast.svelte";
    import MoreInfoLogos from './MoreInfoLogos.svelte';
    import type { Game } from "$lib/types";

    const handleClose = () => {
        visible.update(() => false);
    }
    const closeIfOutsideClick = (event: Event) => {
        if (!!!event.target) {
            return
        }
        const target = event.target as HTMLElement
        if (target.classList.contains('modalBackground')){
            handleClose();
        }
    }
    const makeSmallerEventStr = (g: Game) => {
        const eventStr = g.eventStr || '';
        return eventStr.startsWith('Moved from');
    }
</script>

<div 
    class='modalBackground'
    class:invisible="{!$visible}"
    on:click={(event) => closeIfOutsideClick(event)}
>
    <div class='modalContent'>
        {#key $game}
            {#if $game !== undefined}
                <div class='specialEventName' class:smallerEventStr={makeSmallerEventStr($game)}>
                    {$game.eventStr || ''}
                </div>
                {#if !($game.statusState === 'pre')}
                    <div class=currentStatus>{$game.statusDetail}</div>
                {/if}
                <div class='teamsDiv'>
                    <MoreInfoLogos team={$game.teams.away}></MoreInfoLogos>
                    {#if ['in', 'post'].includes($game.statusState)}
                        <div class='scores'>
                            <span class='football'>{#if $game.teams.away.possession}&#127944{/if}</span>
                            <span>{$game.teams.away.score} - {$game.teams.home.score}</span>
                            <span class='football'>{#if $game.teams.home.possession}&#127944{/if}</span>
                        </div>
                    {/if}
                    <MoreInfoLogos team={$game.teams.home}></MoreInfoLogos>
                </div>
                    <div class=gameIconsHolder>
                        <GameIcons game={$game} includeDescription={true} hoverDescription={false}/>
                    </div>
                {#if !$game.teamsTbd}
                    <div class='gameBarsHolder'>
                        {#if $game.statusState === 'in'}
                            <div class=sectionText>Situation: {(100 * $game.situationScoreNorm).toFixed(0)}/100</div>
                            <GameBar icon='scoreboard' valueNorm={$game.situationScoreNorm} backgroundColor='black'></GameBar>
                        {/if}
                        <div class=sectionText>Matchup: {(100 * $game.matchupScoreNorm).toFixed(0)}/100</div>
                        <GameBar icon='matchup' valueNorm={$game.matchupScoreNorm} backgroundColor='black'></GameBar>
                        {#if ['in', 'post'].includes($game.statusState)}
                            <div class=sectionText>Surprise: {(100 * $game.surpriseScoreNorm).toFixed(0)}/100</div>
                            <GameBar icon='surprised' valueNorm={$game.surpriseScoreNorm} backgroundColor='black'></GameBar>
                        {/if}
                    </div>
                {/if}
                {#if !!$game.downDist}
                    <hr>
                    <div class=sectionHeading>Situation</div>
                    <div class=sectionText>{$game.downDist} at {$game.possessionText}</div>
                    <div class=sectionText>{!!$game.lastPlay ? `Last: ${$game.lastPlay}` : ''}</div>
                {/if}
                <hr>
                <div class=sectionHeading>
                    {`${$game.conferenceCompetition ? (
                        !!$game.teams.home.conference ? $game.teams.home.conference + ' ' : ''
                    ) : 'Non-'}Conference Game`}
                </div>
                <div class=sectionText>{$game.dttmStr}</div>
                <div class=sectionText>
                    <Broadcast game={$game} />
                </div>
                <hr>
                <div class=sectionHeading>Location</div>
                    {#if $game.neutralSite}
                        <div class=sectionText>Neutral Site</div>
                    {/if}
                    <div class=sectionText>{$game.stadium || 'stadium unknown'}</div>
                    <div class=sectionText>{$game.location || 'location unknown'}</div>
                <hr>
                <div class=sectionHeading>Betting Info</div>
                <div class=sectionText>
                    {#if $game.spread !== undefined}
                        <div>
                            Line: {$game.spread === 0 ? 'Even' : `${$game.favored} -${$game.spread}`}
                        </div>
                    {/if}
                    {#if $game.overUnder !== undefined}
                        <div>Over/Under: {$game.overUnder}</div>
                    {/if}
                    {#if $game.spread === undefined && $game.overUnder === undefined}
                        <div class=notAvailable>Not available</div>
                    {/if}
                </div>
                <hr>
                <div>
                    <div class=sectionHeading>Links (ESPN)</div>
                    <div class=sectionText>
                        <a
                            href={'https://www.espn.com/college-football/game?gameId=' + $game.id}
                            target='_blank'
                        >
                            Gamecast
                        </a>
                        {#if ['in', 'post'].includes($game.statusState)}
                            {' - '}
                            <a
                                href={'https://www.espn.com/college-football/boxscore/_/gameId/' + $game.id}
                                target='_blank'
                            >
                                Box Score
                            </a>
                        {/if}
                        {#each $game.teamsArray as team}
                            {#if team.school !== 'TBA'}
                                {' - '}
                                <a
                                    href={'https://www.espn.com/college-football/team/_/id/' + team.id}
                                    target='_blank'
                                >
                                    {team.school} Clubhouse
                                </a>
                            {/if}
                        {/each}
                    </div>
                </div>
            {/if}
        {/key}
        <div class=bottomBox>
            <button class=closeButton on:click={handleClose}>Close</button>
        </div>
    </div>
</div>

<style>
    .invisible {
        display: none;
    }
    .specialEventName {
        font-size: max(3vw, 1.4em);
        text-align: center;
    }
    .smallerEventStr {
        font-size: max(1vw, 1em);
    }
    .teamsDiv {
        display: flex;
        justify-content: space-around;
        align-items: center;
        padding: 0.2em;
    }
    .sectionHeading {
        font-size: 1.3em;
        text-align: center;
        text-decoration: underline;
        font-weight: bold;
    }
    .sectionText {
        font-size: 1.1em;
        text-align: center;
    }
    .currentStatus {
        font-size: 1.5em;
        text-align: center;
        font-weight: bold;
    }
    .notAvailable {
        color: #555;
        font-style: italic;
    }
    .scores {
        font-size: 7.5vw;
        display: flex;
        justify-content: space-around;
        align-items: center;
    }
    .football {
        display: inline-block;
        width: 4vw;
        font-size: 2vw;
        text-align: center;
    }
    .gameBarsHolder {
        width: 60%;
        margin: auto;
    }
    .gameIconsHolder {
        max-height: 1.25em;
        display: flex;
        justify-content: space-around;
        padding: 0.5em;
    }
    .bottomBox {
        margin-top: 1rem;
        padding-top: 0.5rem;
        border-top: 1pt solid gray;
        display: flex;
    }
    .closeButton {
        height: 2.75em;
        padding: 0 1rem;
        margin: auto;
    }
</style>