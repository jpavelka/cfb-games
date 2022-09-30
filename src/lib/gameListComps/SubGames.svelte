<script lang='ts'>
    import { displaySubGroups, gameSortStyles } from '$lib/stores';
    import { get } from 'svelte/store';
    import AllGames from '$lib/gameListComps/AllGames.svelte';
    import { slide } from 'svelte/transition';
    import type { GameGrouping } from '$lib/types';
    import { groupByKey } from "$lib/utils";
    export let allSubData: Array<GameGrouping>;
    export let previousSubGroupKey: string | undefined;
    export let subGroupHierarchy: Array<string>;
    export let hierarchyLevel: number;
    export let hideGroup: {[key: string]: boolean};
    export let postCheckClickFunc: Function;
    const changeGroupHide = (s: string) => {
        if (Object.keys(hideGroup).includes(s)){
            hideGroup[s] = !hideGroup[s];
        } else {
            hideGroup[s] = true;
        }
    }
    const dsgKeys = allSubData.map(subData => groupByKey(subData.commonStr, previousSubGroupKey));
    const checkClickFunc = (k: string) => {
        displaySubGroups.update(dsg => {
            if (!Object.keys(dsg).includes(k)){
                dsg[k] = false;
            }
            dsg[k] = !dsg[k]
            return dsg
        })
    }
    const sortStyleChangeFunc = (event: Event, k: string) => {
        if (!!!event.target) {
            return
        }
        const target = event.target as HTMLInputElement;
        gameSortStyles[k].store.update(() => target.value);
        postCheckClickFunc();
    }
</script>

{#each allSubData as subData, i}
    <div class='subGroup'>
        <h2 class='gameGroupHeader' on:click={() => changeGroupHide(subData.commonStr)}>
            {subData.commonStr}
            <span class='headerArrow'>
                {#if hideGroup[subData.commonStr]}
                    &#9660;
                {:else}
                    &#9658;
                {/if}
            </span>
        </h2>
        {#if !hideGroup[subData.commonStr]}
            <div transition:slide|local>
                {#if Object.keys(gameSortStyles).includes(subData.commonStr)}
                    <div class=sortStyleSelectContainer>
                        Sort by: <span class=sortStyleSelect>
                            <select
                                class=smallerSelect
                                name={subData.commonStr + 'SortStyle'}
                                on:change={e => sortStyleChangeFunc(e, subData.commonStr)}
                            >
                                {#each gameSortStyles[subData.commonStr].choices as x}
                                    <option 
                                        value={x}
                                        selected={x === get(gameSortStyles[subData.commonStr].store)}
                                    >{x}</option>
                                {/each}
                            </select>
                        </span>
                    </div>
                {/if}
                {#if hierarchyLevel < subGroupHierarchy.length - 1 && ['Upcoming Games', 'Completed Games'].includes(subData.commonStr)}
                    <div class="groupCheck">
                        <input
                            class="groupCheck pointer"
                            type="checkbox"
                            id={dsgKeys[i]}
                            checked={$displaySubGroups[dsgKeys[i]]}
                            on:click={() => checkClickFunc(dsgKeys[i])}
                        >
                        <label class=pointer for={dsgKeys[i]}>Group by {subGroupHierarchy[hierarchyLevel + 1]}</label>
                    </div>
                    {#if !$displaySubGroups[dsgKeys[i]]}
                        <AllGames games={subData.games}></AllGames>
                    {:else}
                        <svelte:self
                            allSubData={subData.subGames}
                            hideGroup={hideGroup}
                            previousSubGroupKey={dsgKeys[i]}
                            subGroupHierarchy={subGroupHierarchy}
                            hierarchyLevel={hierarchyLevel + 1}
                            postCheckClickFunc={postCheckClickFunc}
                        ></svelte:self>
                    {/if}
                {:else}
                    <AllGames games={subData.games}></AllGames>
                {/if}
            </div>
        {/if}
    </div>
{/each}

<style>
    .subGroup {
        margin-left: 0.5em;
    }
    .headerArrow {
        font-size: 0.8em;
        position: relative;
        top: -1px;
    }
    .gameGroupHeader {
        font-size: 1.9em;
        margin-bottom: -0;
        cursor: pointer;
        margin-top: 0.2em;
    }
    .groupCheck {
        padding: 0.3em;
        font-size: 1.1em;
    }
    .pointer {
        cursor: pointer;
    }
    .sortStyleSelectContainer {
        padding: 0.3em;
        margin-left: 0.3em;
    }
    .sortStyleSelect {
        margin-left: 0.3em;
    }
    .smallerSelect {
        padding-top: 0.2em;
        padding-bottom: 0.2em;
    }
</style>