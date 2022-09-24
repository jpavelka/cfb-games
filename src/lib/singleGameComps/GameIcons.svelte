<script lang='ts'>
    import type { Game } from "$lib/types"
    import favoriteTeamIcon from '$lib/assets/heartRed.svg';
    import upsetIcon from '$lib/assets/slingshot.svg';

    export let game: Game;
    export let includeDescription: boolean;
    export let hoverDescription: boolean;

    const setup = [{
            include: game.upset,
            text: 'Upset',
            img: upsetIcon
        }, {
            include: game.favoriteTeamGame,
            text: 'Favorite team',
            img: favoriteTeamIcon
        }
    ]
</script>


<div class=iconContainer>
    {#each setup as obj}
        {#if obj.include}
            <img
                title={hoverDescription ? obj.text : ''}
                class=gameIcon
                src={obj.img}
                alt="*"
            >
            {#if includeDescription}
                <span class=iconLabel>{obj.text}</span>
            {/if}
        {/if}
    {/each}
</div>

<style>
    .iconContainer {
        display:flex;
    }
    .gameIcon {
        height: 100%;
        padding: 0pt 1pt;
        font-size: 2em;
    }
    .iconLabel {
        white-space: nowrap;
        margin-left: 0.25em;
        margin-right: 0.75em;
    }
</style>