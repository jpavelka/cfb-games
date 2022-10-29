<script lang='ts'>
    import type { Game } from "$lib/types";

    export let game: Game;

    const broadcastObjs = [
        {
            channels: [
                'ABC', 'ACCN', 'ACCNX', 'BIG12|ESPN+', 'ESPN', 'ESPN+', 'ESPN2', 'ESPN3',
                'ESPNN', 'ESPNRM', 'ESPNU', 'LHN', 'SECN', 'SECN+'
            ],
            linkFunc: (game: Game) => {
                return 'https://www.espn.com/watch/player/_/om-navmethod/espn%3Acollege-football%3Ascoreboard/eventCalendarId/' + game.id
            }
        }, {
            channels: [
                'FOX', 'FS1', 'FS2', 'BTN'
            ],
            linkFunc: (game: Game) => {
                let link = 'https://www.foxsports.com/live/';
                if (game.broadcastChannels.length === 1 && game.broadcastStr !== 'FOX'){
                    link += game.broadcastStr.toLowerCase();
                }
                return link
            }
        }, {
            channels: [
                'CBS', 'CBSSN'
            ],
            linkFunc: (game: Game) => {
                let link = 'https://www.cbssports.com/';
                if (game.broadcastChannels.includes('CBS')){
                    link += 'watch/live'
                } else {
                    link += 'cbs-sports-network'
                }
                return link
            }
        }, {
            channels: ['PAC12'],
            linkFunc: (game: Game) => {
                return 'https://pac-12.com/live'
            }
        }, {
            channels: ['NFL NET'],
            linkFunc: (game: Game) => {
                return 'https://www.nfl.com/network/watch/nfl-network-live'
            }
        }, {
            channels: ['NBC'],
            linkFunc: (game: Game) => {
                return 'https://www.nbcsports.com/live'
            }
        }, {
            channels: ['Peacock'],
            linkFunc: (game: Game) => {
                return 'https://www.peacocktv.com/'
            }
        }
    ]
    let linkFunc: Function | undefined;
    for (const channel of game.broadcastChannels) {
        let breakAll = false;
        for (const broadObj of broadcastObjs) {
            if (broadObj.channels.includes(channel)) {
                linkFunc = broadObj.linkFunc;
                breakAll = true;
                break;
            }
        }
        if (breakAll) {
            break;
        }
    }
    const broadcastText = 'Broadcast: ' + game.broadcastStr;
</script>

{#if game.broadcastChannels.length > 0}
    {#if !!linkFunc}
        <a href={linkFunc(game)} target='_blank'>
            {broadcastText}
        </a>
    {:else}
        {broadcastText}
    {/if}
{/if}
