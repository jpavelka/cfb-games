<script lang="ts">
    import {
        filterOnChannels, settingsHideChannels, allChannels,
        settingsScrollY, excludedChannels, channelFilterCurrentOnly
    } from "$lib/stores";
    import { slide } from 'svelte/transition';
    
    export let getGameDataNoScroll: Function
    export let updateSettingsScrollY: Function

    const changeHideChannels = () => {
        settingsScrollY.update(x => updateSettingsScrollY(x));
        settingsHideChannels.update(x => !x);
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
</script>

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
<div class=checkboxWrapper>
    <input
        id='channelFilterCurrentOnly'
        type='checkbox'
        checked={$channelFilterCurrentOnly === 'y'}
        disabled={$filterOnChannels === 'n'}
        on:click={() => {
            channelFilterCurrentOnly.update(x => x === 'y' ? 'n' : 'y');
            getGameDataNoScroll();
        }}
    ><label for='channelFilterCurrentOnly' 
    class:disabled={$filterOnChannels === 'n'}>Apply to current games only</label>
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
    <div class=checkboxesWrapper transition:slide|local>
        <div class=checkboxesWrapper>
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

<style>
    .disabled {
        color: gray;
    }
</style>