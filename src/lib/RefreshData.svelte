<script lang="ts">
    import { seasonInfo, showRefreshButton, dataRefreshing } from "$lib/stores";
    import { fly } from 'svelte/transition';

    export let loadNewWeekData: Function;

    let reloadIgnored = false;
    async function quickReload() {
        dataRefreshing.update(() => true);
        await loadNewWeekData({
            season: $seasonInfo.season,
            seasonType: $seasonInfo.seasonType,
            week: $seasonInfo.week,
        });
        dataRefreshing.update(() => false);
        showRefreshButton.update(() => false);
    }
    async function ignoreForNow() {
        reloadIgnored = true;
        await new Promise(resolve => setTimeout(resolve, 60 * 1000));
        reloadIgnored = false;
    }
</script>

{#if $showRefreshButton && !reloadIgnored}
    <div
        class=refreshDialog
        class:refreshClicked={$dataRefreshing}
        transition:fly|local="{{ y: 100, duration: 1000 }}"
    >
        <div class=newDataText>
            {#if $dataRefreshing}
                Loading...
            {:else}
                New data available!
            {/if}
        </div>
        <div class=buttonContainer>
            <button
                on:click={quickReload}
                disabled={$dataRefreshing}
            >Load</button>
            <button 
                on:click={ignoreForNow}
                disabled={$dataRefreshing}
            >Ignore</button>
        </div>
    </div>
{/if}

<style>
    .refreshDialog {
        position: fixed;
        bottom: 2.5em;
        border: 2px solid rgb(113, 113, 113);
        background-color: rgb(245, 245, 245);
        background-color: rgba(245, 245, 245, 0.95);
        border-radius: 30px;
        text-align: center;
        padding: 10pt;
        font-size: 1.1em;
        left: 50%;
        transform: translateX(-50%);
        cursor: pointer;
        animation: pulse 7s infinite;
        white-space: nowrap;
    }
    @keyframes pulse {
        60% {
        box-shadow: 0 0 0 0 rgb(246, 246, 74);
        box-shadow: 0 0 0 0 rgba(246, 246, 74, 0.5);
        }
        75% {
        box-shadow: 0 0 0 8px rgb(246, 246, 74);
        box-shadow: 0 0 0 8px rgba(246, 246, 74, 0.7);
        }
    }
    .refreshClicked {
        animation: none;
    }
    .buttonContainer {
        margin-top: 0.75em;
    }
    button {
        font-size: 0.9em;
        padding: 0.8em 1.6em;
        margin: 0em 0.25em;
        border-radius: 30px;
    }
    .newDataText {
        font-size: 1.15em;
    }
</style>