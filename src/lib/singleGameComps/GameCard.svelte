<script lang="ts">
    import type { Game } from "$lib/types"
    import { moreInfoGame, moreInfoVisible, showGameBars } from "$lib/stores";
    export let game : Game;
    const showMoreInfo = () => {
        console.log(game);
        moreInfoGame.update(() => game);
        moreInfoVisible.update(() => true);
    }
</script>

<div class=gameCard on:click={showMoreInfo}>
    <div class=topLine>
        <div class=eventName>{game.eventStr || ''}</div>
    </div>
    {#each game.teamsArray as team}
        <div class=teamLine>
            {#if $showGameBars === 'y'}
                <div class=teamStrengthBarBackground class:hide={team.school === 'TBD'}>
                    <div
                        class=teamStrengthBar
                        style='height: {Math.max(0.1, 2 * (1 - team.approxRank / 40))}em; background-color: hsl({Math.max(0, 120 - 3 * team.approxRank)}, 90%, 70%)'
                    ></div>
                </div>
            {/if}
            <img class=logoImg class:noLogo={!!!team.logo} src={team.logo} alt={team.displayName}>
            <div class='teamName teamLineUp' class:winnerText={team.winner}>
                <span class='teamRank'>{team.ranked ? team.rank : ''}</span>
                {team.school}
            </div>
            {#if team.favored}
                <div class='spread teamLineUp'>(-{game.spread})</div>
            {/if}
            {#if team.possession}
                <div class='football teamLineUp'>&#127944</div>
            {/if}
            {#if ['in', 'post'].includes(game.statusState) }
                <div class='score teamLineUp' class:winnerText={team.winner}>
                    {team.score}
                </div>
            {/if}
        </div>
        <div class={'teamRecords' + (!!!team.recordOverall ? ' hide' : '')}>
            {!!team.recordOverall ? team.recordOverall : '|'}
            {!!team.recordConference ? ` (${team.recordConference})` : '|'}
        </div>
    {/each}
    <div class=dttmBroadLine>
        <div class=gameDttm>
            {#if game.statusSort === 'Current'}
                {#if game.statusDetail === 'Delayed'}
                    Delayed {game.period < 1 ? '' : game.period <= 4 ? '(' + game.displayClock + ' Q' + game.period + ')' : '(OT)'}
                {:else}
                    {game.statusDetail}
                {/if}
            {:else if game.statusSort === 'Upcoming'}
                {game.dttmStr || 'TBD'}
            {:else if game.statusSort === 'Completed'}
                {game.dateStr}
            {/if}
        </div>
        <div class=gameBroadcast>{game.broadcastStr || ''}</div>
    </div>
    <div class=gameInterestBarBackground class:hide={game.teamsTbd || $showGameBars === 'n'}>
        <div
            class=gameInterestBar
            style='width: {Math.min(100, Math.max(1, 100 * (1 - game.gameInterest / 80) + 5))}%; background-color: hsl({Math.max(0, 120 - 2 * game.gameInterest)}, 90%, 70%)'
        ></div>
    </div>
</div>

<style>
    .gameCard {
        border: solid 1pt rgba(0,0,0,.125);
        border-radius: 0.5rem;
        padding: 1em;
        padding-bottom: 0.75em;
        background-color: #eee;
        width: 17em;
        max-width: 22em;
        margin: 0.25em;
        flex-grow: 1;
        cursor: pointer;
    }
    .teamLine {
        display: flex;
        align-items: center;
        font-size: 1.5em;
        padding: 1pt;
        margin: 2pt;
    }
    .teamStrengthBarBackground {
        height: 2em;
        width: 8px;
        margin-right: 4px;
        background-color: white;
        position: relative;
    }
    .teamStrengthBar {
        width: 4px;
        margin-left: 2px;
        position: absolute;
        bottom: 0;
    }
    .gameInterestBarBackground {
        height: 8px;
        margin-top: 10px;
        background-color: white;
        position: relative;
    }
    .gameInterestBar {
        height: 4px;
        margin-top: 2px;
        position: absolute;
        left: 0;
    }
    .logoImg {
        height: 2.2em;
        width: 2.2em;
        margin-right: 0.5em;
    }
    .teamName {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .teamLineUp {
        margin-top: -0.3em;
    }
    .dttmBroadLine {
        margin-top: 0.5em;
        font-size: 1.3em;
        display: flex;
    }
    .gameDttm {
        white-space: nowrap;
        margin-right: 0.2em;
    }
    .gameBroadcast {
        margin-left: auto;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .topLine {
        display: flex;
        justify-content: space-between;
        margin-top: -0.7em;
        margin-bottom: 0.1em;
        height: 1em;
    }
    .eventName {
        color: #555;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: -2pt;
    }
    .teamRank {
        font-size: 0.7em;
    }
    .spread {
        font-size: 0.7em;
        margin-left: 0.3em;
    }
    .teamRecords {
        font-size: 0.8em;
        color: #555;
        margin-left: 6.5em;
        margin-top: -1.5em;
    }
    .hide {
        opacity: 0;
    }
    .score {
        margin-left: auto;
        padding-left: 8pt;
    }
    .winnerText {
        font-weight: bold;
    }
    .football {
        font-size: 0.5em;
        padding-left: 5pt;
        padding-bottom: 2pt;
    }
    .noLogo {
        overflow: hidden;
        opacity: 0;
    }
</style>