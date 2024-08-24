<script lang="ts">
    import { settingsVisible, gamesToShow, showGameBars, settingsScrollY } from "$lib/stores";
    import FavoriteTeams from "./FavoriteTeams.svelte";
    import Channels from "./Channels.svelte";
    import { gamesToShowFilterFuncs } from "$lib/gameUtils/filterFuncs";
    import { afterUpdate } from 'svelte';

    export let getGameData: Function;
    
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
        <select class=basicText on:change={e => gamesToShowSelectChange(e)}>
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
        <div class=subSettings>
            <FavoriteTeams
                getGameDataNoScroll={getGameDataNoScroll}
                updateSettingsScrollY={updateSettingsScrollY}
            />
            <hr>
            <Channels
                getGameDataNoScroll={getGameDataNoScroll}
                updateSettingsScrollY={updateSettingsScrollY}
            />
        </div>
        <div class=bottomBox>
            <button class=closeButton on:click={handleClose}>Close</button>
        </div>
    </div>
</div>

<style>
    .invisible {
        display: none;
    }
    .sectionHeading, div.subSettings :global(.sectionHeading) {
        margin-bottom: 0.25em;
    }
    div.subSettings :global(.checkboxWrapper) {
        display: flex;
        flex-wrap: wrap;
    }
    .checkboxWrapper, div.subSettings :global(.checkboxWrapper) {
        display: inline-block;
        margin: 0.5em;
    }
    div.subSettings :global(.multipleChecks) {
        width: 10em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    div.subSettings :global(h3.closer) {
        margin-bottom: -0.2em;
    }
    div.subSettings :global(h4.closer) {
        margin-bottom: 0em;
        margin-top: 0.5em
    }
    .basicText, div.subSettings :global(.basicText) {
        margin: 0.5em;
    }
    div.subSettings :global(.pointer) {
        cursor: pointer;
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