<script lang='ts'>
    import type { Game } from '$lib/types';
    import GameCard from '$lib/singleGameComps/GameCard.svelte';
    import sortGames from '$lib/gameUtils/sortGames';
    export let games: Array<Game>;
</script>

<div class='gamesContainer'>
    {#if games !== undefined}
        {#each sortGames(games) as game}
            <GameCard game={game}/>
        {/each}
        {#each Array(10).fill('') as s}
            <div class=gameCard>{s}</div>
        {/each}
    {:else}
        <div>An error has occurred - please try again.</div>
    {/if}
</div>

<style>
    .gamesContainer {
        display: flex;
        flex-wrap: wrap;
    }
    .gameCard {
        padding: 0 1em;
        width: 17em;
        max-width: 22em;
        margin: 0 0.25em;
        flex-grow: 1;
        cursor: pointer;
        opacity: 0;
        height: 0;
    }
</style>

