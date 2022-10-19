<script lang="ts">
    import { seasonInfo, showRefreshButton, dataRefreshing, recentDataUpdate } from "$lib/stores";
    import { fly } from 'svelte/transition';

    export let loadNewWeekData: Function;

    let showLarger = false;
    async function quickReload() {
        dataRefreshing.update(() => true);
        await loadNewWeekData({
            season: $seasonInfo.season,
            seasonType: $seasonInfo.seasonType,
            week: $seasonInfo.week,
        });
        dataRefreshing.update(() => false);
        showRefreshButton.update(() => false);
        recentDataUpdate.update(() => true);
        setTimeout(() => {
            recentDataUpdate.update(() => false);
        }, 10000);
    }
    const mainClick = () => {
        showLarger = true;
    };
    const ignoreClick = (event: Event) => {
        event.stopPropagation();
        showLarger = false;
    }
    const getTransition = (node: any, args: any) => {
        return fly(node, {x: 300, duration: 1000})
    }
</script>

{#key showLarger}
    {#if $showRefreshButton && !$recentDataUpdate}
        <div
            class=refreshDialog
            class:refreshClicked={$dataRefreshing}
            on:click={mainClick}
            transition:getTransition={{}}
            style={showLarger ? 'animation: none' : 'cursor: pointer'}
        >
            {#if showLarger}
                <div>
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
                            on:click={ignoreClick}
                            disabled={$dataRefreshing}
                        >Ignore</button>
                    </div>
                </div>
            {:else}
                <div
                    style='width:20px; text-align:center; margin-right:-5px'
                >!</div>
            {/if}
        </div>
    {/if}
{/key}

<style>
    .refreshDialog {
        position: fixed;
        bottom: 2.2em;
        right: 0;
        border: 2px solid rgb(113, 113, 113);
        background-color: rgb(245, 245, 245);
        background-color: rgba(245, 245, 245, 0.95);
        border-radius: 30px 0 0 30px;
        text-align: center;
        padding: 14pt;
        font-size: 1.1em;
        animation: pulse 8s infinite;
        white-space: nowrap;
    }
    @keyframes pulse {
        15% {
        box-shadow: 0 0 0 12px rgb(246, 246, 74);
        box-shadow: 0 0 0 12px rgba(246, 246, 74, 0.7);
        }
        40% {
        box-shadow: 0 0 0 0 rgb(246, 246, 74);
        box-shadow: 0 0 0 0 rgba(246, 246, 74, 0.5);
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
        width: 7em;
    }
    button:hover {
        background-color: rgb(222, 222, 222);
    }
    .newDataText {
        font-size: 1.15em;
    }
</style>