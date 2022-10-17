<script lang='ts'>
    import GameBar from "./GameBar.svelte";
    import type { Team } from '$lib/types'
    export let team: Team;
    let sw: number;
    $: screenSize = sw < 500 ? 'sm' : sw < 800 ? 'md' : 'lg'
</script>
<svelte:window bind:innerWidth={sw}/>

<div class='teamDiv'>
    <img class=logoImg class:noLogo={!!!team.logo} src={team.logo} alt={team.displayName}>
    <div class=teamName>
        {team.ranked ? `${team.rank}. ` : ''}
        {screenSize === 'lg' ? team.displayName : screenSize === 'md' ? team.school : team.abbreviation}
    </div>
    {#if !(screenSize === 'sm')}
        <div class=recordsText>
            {team.classification === 'FBS' ? team.conference : (
                !!team.conference ? `${team.conference} (${team.classification})` : (
                    team.school === 'TBD' ? '' : ''
                )
            )}
        </div>
        <div class=recordsText>
            {!!team.recordOverall ? team.recordOverall : ''}
            {!!team.recordConference ? ` (${team.recordConference})` : ''}
        </div>
    {/if}
    {#if team.school !== 'TBD'}
        <GameBar
            valueNorm={team.strengthScoreNorm}
            backgroundColor='black'
            containerStyleOverride='width: 60%; margin: 5pt auto 2pt auto;'
        />
        <div class=recordsText>{(100 * team.strengthScoreNorm).toFixed(0)}/100</div>
    {/if}
</div>

<style>
    .teamDiv {
        flex: 1 1 0;
        width: 0;
    }
    .logoImg {
        height: 15vw;
        width: 15vw;
        display: block;
        margin-left: auto;
        margin-right: auto;
    }
    .teamName {
        font-size: 1.3em;
        text-align: center;
    }
    .recordsText {
        font-size: 1em;
        text-align: center;
    }
    .noLogo {
        overflow: hidden;
        opacity: 0;
    }
</style>