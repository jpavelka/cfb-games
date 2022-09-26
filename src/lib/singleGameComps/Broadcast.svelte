<script lang='ts'>
    import type { Game } from "$lib/types"

    export let game: Game;

    const espnChannels = [
        'ABC', 'ACCN', 'ACCNX', 'BIG12|ESPN+', 'ESPN', 'ESPN+', 'ESPN2', 'ESPN3',
        'ESPNN', 'ESPNRM', 'ESPNU', 'LHN', 'SECN', 'SECN+'
    ];
    const broadcastText = 'Broadcast: ' + game.broadcastStr;
</script>

{#if game.broadcastChannels.length > 0}
    {#if game.broadcastChannels.filter(c => espnChannels.includes(c)).length > 0}
        <a href={'https://www.espn.com/watch/player/_/eventCalendarId/' + game.id}>
            {broadcastText}
        </a>
    {:else}
        {broadcastText}
    {/if}
{/if}
