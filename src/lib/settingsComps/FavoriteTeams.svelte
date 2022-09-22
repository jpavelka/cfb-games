<script lang="ts">
    import {
        favoriteTeams, showFavoriteTeamsFirst, settingsHideTeamGroup,
        allTeamsList, settingsScrollY
    } from "$lib/stores";
    import { slide } from 'svelte/transition';

    export let getGameDataNoScroll: Function;
    export let updateSettingsScrollY: Function;

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
    const getSortedTeams = () => {
        let sortedTeams: {[key: string]: {[key: string]: Array<string>}} = {}
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
    const changeHideTeam = (k: string) => {
        settingsScrollY.update(x => updateSettingsScrollY(x));
        settingsHideTeamGroup.update(x => {
            x[k] = !x[k];
            return x
        })
    }

</script>
<h2 class="sectionHeading">Favorite Teams</h2>
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
    <div class='selectTeamsMsg basicText'>Select your favorite teams below (click on headings to expand)</div>
{:else}
    <div class=basicText>
        Current favorites:
        {#each getFavTeamList().sort() as team}
            <div class='checkboxWrapper'>
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
{#each ['fbs', 'fcs'] as subdiv}
    <div class=teamsSub>
        <h3 class="closer pointer" on:click={() => changeHideTeam(subdiv)}>
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
            <div class=teamsSub transition:slide|local>
                {#each Object.entries(getSortedTeams()[subdiv]).sort((a, b) => a[0] < b[0] ? -1 : 1) as [conf, confTeams]}
                    <h4 class="closer pointer" on:click={() => changeHideTeam(conf)}>
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
                        <div class=checkboxesWrapper transition:slide|local>
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
                {/each}
            </div>
        {/if}
    </div>
{/each}

<style>
    .teamsSub {
        margin-left: 0.5em;
    }
    .selectTeamsMsg {
        font-style: italic;
    }
</style>