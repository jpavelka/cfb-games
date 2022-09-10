<!-- todo: favorite teams, channels, sort styles (situation, interest score, etc) -->
<!-- todo: game filters: All, FBS, P5, Ranked -->
<script lang="ts">
    import { 
        settingsVisible, gamesToShow, showGameBars, allTeamsList, favoriteTeams,
        showFavoriteTeamsFirst, settingsScrollY, settingsHideTeamGroup,
        currentGameSortStyle
    } from "$lib/stores";
    import { slide } from 'svelte/transition';
    import { gamesToShowFilterFuncs } from "$lib/gameUtils/filterFuncs";
    import { afterUpdate } from 'svelte';
    
    afterUpdate(() => {
        document.getElementById("settingsModal").scrollTop = $settingsScrollY;
	});
    const handleClose = () => {
        settingsVisible.update(() => false);
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
    export let getGameData: Function;
    const getGameDataNoScroll = () => {
        settingsScrollY.update(() => document.getElementById("settingsModal").scrollTop);
        getGameData();
    }
    const gamesToShowChangeFunc = (val: string) => {
        gamesToShow.update(() => val);
        getGameDataNoScroll();
    }
    const currentGameSortChangeFunc = (val: string) => {
        currentGameSortStyle.update(() => val);
        getGameDataNoScroll();
    }
    const changeHideTeam = (k: string) => {
        settingsScrollY.update(() => document.getElementById("settingsModal").scrollTop);
        settingsHideTeamGroup.update(x => {
            x[k] = !x[k];
            return x
        })
    }
    const getSortedTeams = () => {
        let sortedTeams = {}
        for (const team of $allTeamsList){
            if (!Object.keys($settingsHideTeamGroup).includes(team.classification)) {
                $settingsHideTeamGroup[team.classification] = true;
            }
            if (!Object.keys(sortedTeams).includes(team.classification)){
                sortedTeams[team.classification] = {};
            }
            if (!Object.keys($settingsHideTeamGroup).includes(team.conference)) {
                $settingsHideTeamGroup[team.conference] = true;
            }
            if (!Object.keys(sortedTeams[team.classification]).includes(team.conference)){
                sortedTeams[team.classification][team.conference] = [];
            }
            sortedTeams[team.classification][team.conference].push(team.school)
        }
        return sortedTeams
    }
    const getFavTeamList = () => {
        return $favoriteTeams.split(',').filter(s => s !== '');
    }
    const isTeamFavorite = (t: string) => {
        const favTeamList = getFavTeamList();
        return favTeamList.includes(t)
    }
    const favoriteTeamClick = (t: string) => {
        const favTeamList = getFavTeamList();
        if (isTeamFavorite(t)){
            favoriteTeams.update(() => favTeamList.filter(y => y !== t).join(','));
        } else {
            favTeamList.push(t);
            favoriteTeams.update(() => favTeamList.join(','));
        }
        getGameDataNoScroll();
    }
</script>

<div
    class='backgroundDiv'
    class:invisible={!$settingsVisible}
    on:click={(event) => closeIfOutsideClick(event)}
>
    <div id='settingsModal' class='settingsContent'>
        <h1 style='text-align: center'>Settings</h1>
        <h2 class="sectionHeading">Games to show:</h2>
        <div class=checkBoxesWrapper>
            {#each Object.keys(gamesToShowFilterFuncs) as x}
                <div class='checkboxWrapper multipleChecks smallerChecks'>
                    <input
                        type='radio'
                        name='gamesToShowType'
                        id={'gts' + x}
                        checked={$gamesToShow === x}
                        on:click={() => gamesToShowChangeFunc(x)}
                    ><label for={'gts' + x}>{x}</label>
                </div>
            {/each}
        </div>
        <hr>
        <h2 class="sectionHeading">Current game sorting</h2>
        <div class='checkboxWrapper multipleChecks'>
            <input
                type='radio'
                name='currentGameSort'
                id='currentGameSortIn'
                checked={$currentGameSortStyle === 'situation'}
                on:click={() => currentGameSortChangeFunc('situation')}
            ><label for={'currentGameSortIn'}>{'Game situation'}</label>
        </div>
        <div class='checkboxWrapper multipleChecks'>
            <input
                type='radio'
                name='currentGameSort'
                id='currentGameSortPre'
                checked={$currentGameSortStyle === 'pregameInterest'}
                on:click={() => currentGameSortChangeFunc('pregameInterest')}
            ><label for={'currentGameSortPre'}>{'Pregame interest'}</label>
        </div>
        <hr>
        <h2 class="sectionHeading">Game display:</h2>
        <div class=checkboxWrapper>
            <input
                id='showGameBars'
                type='checkbox'
                checked={$showGameBars === 'y'}
                on:click={() => {
                    showGameBars.update(x => x === 'y' ? 'n' : 'y');
                    getGameDataNoScroll();
                }}
            ><label for='showGameBars'>Show game interest and team strength bars</label>
        </div>
        <hr>
        <h2 class="sectionHeading">Favorite teams:</h2>
        <div class=checkboxWrapper>
            <input
                id='showFavoriteTeams'
                type='checkbox'
                checked={$showFavoriteTeamsFirst === 'y'}
                on:click={() => {
                    showFavoriteTeamsFirst.update(x => x === 'y' ? 'n' : 'y');
                    getGameDataNoScroll();
                }}
            ><label for='showFavoriteTeams'>Show favorite teams first</label>
        </div>
        {#if getFavTeamList().length === 0}
            <div class='selectTeamsMsg basicText'>Select your favorite teams below</div>
        {:else}
            <div class=basicText>Current favorites: {getFavTeamList().sort().join(', ')}</div>
        {/if}
        {#each ['fbs', 'fcs'] as subdiv}
            <div class=teamsSub>
                <h3 class="closer" on:click={() => changeHideTeam(subdiv)}>
                    {subdiv.toUpperCase()}
                    <span class='headerArrow'>
                        {#if !$settingsHideTeamGroup[subdiv]}
                            &#9660;
                        {:else}
                            &#9658;
                        {/if}
                    </span>
                </h3>
                {#if !$settingsHideTeamGroup[subdiv]}
                    {#each Object.entries(getSortedTeams()[subdiv]).sort((a, b) => a[0] < b[0] ? -1 : 1) as [conf, confTeams]}
                        <div class=teamsSub transition:slide|local>
                            <h4 class="closer" on:click={() => changeHideTeam(conf)}>
                                {conf}
                                <span class='headerArrow'>
                                    {#if !$settingsHideTeamGroup[conf]}
                                        &#9660;
                                    {:else}
                                        &#9658;
                                    {/if}
                                </span>
                            </h4>
                            {#if !$settingsHideTeamGroup[conf]}
                                <div class=checkBoxesWrapper transition:slide|local>
                                    {#each confTeams.sort() as team}
                                        <div class='checkboxWrapper multipleChecks'>
                                            <input
                                                id={'teamCheck' + team}
                                                type='checkbox'
                                                checked={isTeamFavorite(team)}
                                                on:click={() => favoriteTeamClick(team)}
                                            ><label for={'teamCheck' + team}>{team}</label>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>
        {/each}
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
    .settingsContent {
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
    .sectionHeading {
        margin-bottom: 0.25em;
    }
    .checkBoxesWrapper {
        display: flex;
        flex-wrap: wrap;
    }
    .checkboxWrapper {
        display: inline-block;
        margin: 0.5em;
    }
    .multipleChecks {
        width: 10em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .smallerChecks {
        width: 6em;
    }
    h3.closer {
        margin-bottom: -0.2em;
    }
    h4.closer {
        margin-bottom: -0.3em;
        margin-top: 0.5em
    }
    .teamsSub {
        margin-left: 0.5em;
    }
    .selectTeamsMsg {
        font-style: italic;
    }
    .basicText {
        margin: 0.5em;
    }
</style>