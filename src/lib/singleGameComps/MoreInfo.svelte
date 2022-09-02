<script lang="ts">
    import { moreInfoGame as game } from "$lib/stores";
    import { moreInfoVisible as visible} from "$lib/stores";
    import MoreInfoLogos from './MoreInfoLogos.svelte';
    const handleClose = () => {
        visible.update(() => false);
    }
    const closeIfOutsideClick = (event: MouseEvent) => {
        if (!!!event.target) {
            return
        }
        const target = event.target as HTMLElement
        if (target.classList.contains('backgroundDiv')){
            handleClose();
        }
    }
</script>

<div 
    class='backgroundDiv'
    class:invisible="{!$visible}"
    on:click={(event) => closeIfOutsideClick(event)}
>
    <div class='moreInfoContent'>
        {#if $game !== undefined}
            <div class='specialEventName'>{$game.eventStr || ''}</div>
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
            {#if ($game.broadcastStr || '') !== ''}
                <div class=sectionText>Broadcast: {$game.broadcastStr}</div>
            {/if}
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
                {#if $game.spread}
                    <div>Line: {$game.favored} -{$game.spread}</div>
                {/if}
                {#if $game.overUnder}
                    <div>Over/Under: {$game.overUnder}</div>
                {/if}
                {#if !$game.spread && !$game.overUnder}
                    <div class=notAvailable>Not available</div>
                {/if}
                {#if !!$game.impliedWinProb}
                    <div>Projected Winner: {$game.favored} ({$game.impliedWinProb}%)</div>
                {/if}
            </div>
            <hr>
            <div>
                <div class=sectionHeading>Links (ESPN)</div>
                <div class=sectionText>
                    <a href={'https://www.espn.com/college-football/game?gameId=' + $game.id}>
                        Gamecast
                    </a>
                    {#if ['in', 'post'].includes($game.statusState)}
                        {' - '}
                        <a href={'https://www.espn.com/college-football/boxscore/_/gameId/' + $game.id}>
                            Box Score
                        </a>
                    {/if}
                    {#each $game.teamsArray as team}
                        {#if team.school !== 'TBA'}
                            {' - '}
                            <a href={
                                'https://www.espn.com/college-football/team/_/id/' + team.id
                            }>
                                {team.school} Clubhouse
                            </a>
                        {/if}
                    {/each}

                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .backgroundDiv {
        position: fixed; /* Stay in place */
        z-index: 1; /* Sit on top */
        padding-top: 100px; /* Location of the box */
        left: 0;
        top: 0;
        width: 100%; /* Full width */
        height: 100%; /* Full height */
        overflow: auto; /* Enable scroll if needed */
        background-color: rgb(0,0,0); /* Fallback color */
        background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
    }
    .moreInfoContent {
        position: relative;
        background-color: #fefefe;
        margin: auto;
        padding: 5pt;
        border: 1px solid #888;
        width: 80%;
        max-height: 80%;
        overflow: scroll;
        box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2),0 6px 20px 0 rgba(0,0,0);
    }
    .invisible {
        display: none;
    }
    .specialEventName {
        font-size: max(3vw, 1.4em);
        text-align: center;
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
</style>