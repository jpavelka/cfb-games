<script lang="ts">
    import { 
        settingsVisible, gamesToShow, showGameBars, allTeamsList, favoriteTeams,
        showFavoriteTeamsFirst, settingsScrollY, settingsHideTeamGroup, allChannels,
        excludedChannels, filterOnChannels, settingsHideChannels
    } from "$lib/stores";
    import { slide } from 'svelte/transition';
    import { gamesToShowFilterFuncs } from "$lib/gameUtils/filterFuncs";
    import { afterUpdate } from 'svelte';
    
    afterUpdate(() => {
        const settingsElement = document.getElementById("settingsModal");
        if (settingsElement !== null){
            settingsElement.scrollTop = $settingsScrollY;
        }
	});
    const handleClose = () => {
        settingsVisible.update(() => false);
    }
    const closeIfOutsideClick = (event: MouseEvent) => {
        if (!!!event.target) {
            return
        }
        const target = event.target as HTMLElement
        if (target.classList.contains('modalBackground')){
            handleClose();
        }
    }
    export let getGameData: Function;
    const updateSettingsScrollY = (x: number) => {
        const settingsElement = document.getElementById("settingsModal");
        if (settingsElement !== null){
            x = settingsElement.scrollTop;
        }
        return x
    }
    const getGameDataNoScroll = () => {
        settingsScrollY.update(x => updateSettingsScrollY(x));
        getGameData();
    }
    const changeHideTeam = (k: string) => {
        settingsScrollY.update(x => updateSettingsScrollY(x));
        settingsHideTeamGroup.update(x => {
            x[k] = !x[k];
            return x
        })
    }
    const changeHideChannels = () => {
        settingsScrollY.update(x => updateSettingsScrollY(x));
        settingsHideChannels.update(x => !x);
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
    const getExcludedChannelList = () => {
        return $excludedChannels.split(',').filter(s => s !== '');
    }
    const isExcludedChannel = (c: string) => {
        const excludedChannelList = getExcludedChannelList();
        return excludedChannelList.includes(c)
    }
    const excludeChannelClick = (c: string) => {
        const excludedChannelList = getExcludedChannelList();
        if (isExcludedChannel(c)){
            excludedChannels.update(() => excludedChannelList.filter(y => y !== c).join(','));
        } else {
            excludedChannelList.push(c);
            excludedChannels.update(() => excludedChannelList.join(','));
        }
        getGameDataNoScroll();
    }
    const gamesToShowSelectChange = (event: Event) => {
        if (!!!event.target) {
            return
        }
        const target = event.target as HTMLInputElement;
        gamesToShow.update(() => target.value);
        getGameDataNoScroll();
    }
</script>

<div
    class='modalBackground'
    class:invisible={!$settingsVisible}
    on:click={(event) => closeIfOutsideClick(event)}
>
    <div id='settingsModal' class='modalContent'>
        <h1 style='text-align: center; margin-top: 0.25em;'>Settings</h1>
        <h2 class="sectionHeading">Team Filtering</h2>
        <span class=basicText style="margin-right:0.5em">Include teams from this group:</span>
        <select on:change={e => gamesToShowSelectChange(e)}>
            {#each Object.keys(gamesToShowFilterFuncs) as x}
                <option 
                    value={x}
                    selected={$gamesToShow === x}
                >{x}</option>
            {/each}
        </select>
        <hr>
        <h2 class="sectionHeading">Game Display</h2>
        <div class=checkboxWrapper>
            <input
                id='showGameBars'
                type='checkbox'
                checked={$showGameBars === 'y'}
                on:click={() => {
                    showGameBars.update(x => x === 'y' ? 'n' : 'y');
                    getGameDataNoScroll();
                }}
            ><label for='showGameBars'>Show team/game interest bars</label>
        </div>
        <hr>
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
                <button on:click={() => {
                    for (const team of getFavTeamList()){
                        favoriteTeamClick(team);
                    }
                }}>
                    Remove all
                </button>
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
        <hr>
        <h2 class="sectionHeading">Channel Filtering</h2>
        <div class=checkboxWrapper>
            <input
                id='filterOnChannels'
                type='checkbox'
                checked={$filterOnChannels === 'y'}
                on:click={() => {
                    filterOnChannels.update(x => x === 'y' ? 'n' : 'y');
                    getGameDataNoScroll();
                }}
            ><label for='filterOnChannels'>Only include games on selected channels</label>
        </div>
        <h4 class="closer pointer" on:click={() => changeHideChannels()}>
            Channels
            <span class='headerArrow'>
                {#if !$settingsHideChannels}
                    &#9660;
                {:else}
                    &#9658;
                {/if}
            </span>
        </h4>
        {#if !$settingsHideChannels}
            <div class=checkBoxesWrapper transition:slide|local>
                <div class=checkBoxesWrapper>
                    {#each $allChannels as channel}
                        <div class='checkboxWrapper multipleChecks'>
                            <input
                                id={'channelCheck' + channel}
                                type='checkbox'
                                checked={!isExcludedChannel(channel)}
                                on:click={() => excludeChannelClick(channel)}
                            ><label for={'channelCheck' + channel}>{channel}</label>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
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
    h3.closer {
        margin-bottom: -0.2em;
    }
    h4.closer {
        margin-bottom: 0em;
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
    .pointer {
        cursor: pointer;
    }
</style>