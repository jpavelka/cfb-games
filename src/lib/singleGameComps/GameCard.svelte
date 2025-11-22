<script lang="ts">
    import type { Game } from "$lib/types"
    import { moreInfoGame, moreInfoVisible, showGameBars, gameDisplaySize } from "$lib/stores";
    import GameBar from "./GameBar.svelte";
    import GameIcons from "./GameIcons.svelte";
    export let game : Game;
    const showMoreInfo = () => {
        moreInfoGame.update(() => game);
        moreInfoVisible.update(() => true);
    }
</script>

{#if $gameDisplaySize === 'Small'}
    <div class=gameLine class:favoriteHighlightSm={game.favoriteTeamGame} on:click={showMoreInfo}>
        <span class:winnerText={game.teamsArray[0].winner}>
            <span class="teamNameSm alignRt">
                <span class='teamRank'>{game.teamsArray[0].ranked ? game.teamsArray[0].rank : ''}</span>
                {game.teamsArray[0].abbreviation}
            </span>
        </span>
        <img class="logoImgSm" class:noLogo={!!!game.teamsArray[0].logo} src={game.teamsArray[0].logo} alt={game.teamsArray[0].abbreviation}>
        {#if ['in', 'post'].includes(game.statusState) }
            <span class="lineScore alignRt">{game.teamsArray[0].score}</span>
        {/if}
        {'-'}
        {#if ['in', 'post'].includes(game.statusState) }
            <span class=lineScore>{game.teamsArray[1].score}</span>
        {/if}
        <img class="logoImgSm" class:noLogo={!!!game.teamsArray[1].logo} src={game.teamsArray[1].logo} alt={game.teamsArray[1].abbreviation}>
        <span class:winnerText={game.teamsArray[1].winner}>
            <span class=teamNameSm>
                <span class='teamRank'>{game.teamsArray[1].ranked ? game.teamsArray[1].rank : ''}</span>
                {game.teamsArray[1].abbreviation}
            </span>
        </span>
        &nbsp;
        <div class=gameDttm>
            {#if game.statusSort === 'Current'}
                {#if game.statusDetail === 'Delayed'}
                    Delayed {game.period < 1 ? '' : game.period <= 4 ? '(' + game.displayClock + ' Q' + game.period + ')' : '(OT)'}
                {:else}
                    {game.period < 1 ? '' : game.period <= 4 ? game.displayClock + ' Q' + game.period : 'OT'}
                {/if}
            {:else if game.statusSort === 'Upcoming'}
                {game.dttmStrSm || 'TBD'}
            {:else if game.statusSort === 'Completed'}
                {game.dateStrSm}
            {/if}
        </div>
    </div>
{:else}
    <div class=gameCard on:click={showMoreInfo}>
        <div class=topLine>
            <div class=eventName>
                {game.eventStr || ''}
            </div>
            <GameIcons game={game} includeDescription={false} hoverDescription={true}/>
        </div>
        {#each game.teamsArray as team}
            <div class=teamLine>
                {#if $showGameBars === 'y'}
                    <div class:hide={team.school === 'TBD'}>
                        <GameBar
                            valueNorm={team.strengthScoreNorm}
                            hoverName='Team Strength'
                            orientation='vertical'
                            containerStyleOverride='width: 2.2em; margin-left: -1em; margin-right: -0.5em; margin-top: 0.3em'
                        />
                    </div>
                {/if}
                <img class=logoImg class:noLogo={!!!team.logo} src={team.logo} alt={team.abbreviation}>
                <div class='teamName teamLineUp' class:winnerText={team.winner}>
                    <span class='teamRank'>{team.ranked ? team.rank : ''}</span>
                    {team.school}
                </div>
                {#if game.spread !== undefined}
                    {#if team.favored || (game.spread === 0 && team.school === game.teams.home.school)}
                        <div class='spread teamLineUp'>(-{game.spread})</div>
                    {/if}
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
            <div
                class=teamRecords
                class:hide={!!!team.recordOverall}
                class:teamRecordsNoBars={$showGameBars === 'n'}
            >
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
            <div class=gameBroadcast>{['in', 'pre'].includes(game.statusState || '') ? (game.broadcastStr || '') : ''}</div>
        </div>
        {#if $showGameBars === 'y' && !game.teamsTbd}
            <div class=gameBars>
                {#if game.statusState === 'in'}
                    <GameBar icon='scoreboard' valueNorm={game.situationScoreNorm} hoverName='Situation'></GameBar>
                {/if}
                <GameBar icon='matchup' valueNorm={game.matchupScoreNorm} hoverName='Matchup'></GameBar>
                {#if ['in', 'post'].includes(game.statusState)}
                    <GameBar icon='surprised' valueNorm={game.surpriseScoreNorm} hoverName='Surprise'></GameBar>
                {/if}
            </div>
        {:else}
            <div style='margin: 10pt'></div>
        {/if}
    </div>
{/if}

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
    .gameBars {
        margin-top: 5pt;
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
        margin-left: 7em;
        margin-top: -1.5em;
    }
    .teamRecordsNoBars {
        margin-left: 5.75em;
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
    .gameLine {
        border: solid 1pt rgba(0,0,0,.125);
        border-radius: 0.5rem;
        padding: 0.5em;
        padding-bottom: 0.5em;
        background-color: #eee;
        max-width: 350px;
        margin: 0.25em;
        flex-grow: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
    }
    .logoImgSm {
        height: 1.5rem;
        width: 1.5rem;
        margin-left: 4pt;
        margin-right: 4pt;
    }
    .teamNameSm {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 4rem;
        align-items: center;
        display: block;
    }
    .lineScore {
        margin-right: 3pt;
        margin-left: 4pt;
        width: 1rem;
    }
    .alignRt {
        text-align: right;
    }
    .favoriteHighlightSm {
        background-color: #ffffcc;
    }
</style>