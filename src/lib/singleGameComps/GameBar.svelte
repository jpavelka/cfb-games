<script lang="ts">
    import matchup from '$lib/assets/matchup.svg';
    import scoreboard from '$lib/assets/scoreboard.svg';
    import surprised from '$lib/assets/surprised.svg';
    export let icon : string;
    export let valueNorm : number;
    export let backgroundColor : string = 'white';
    export let hoverName : string = '';
    const iconImg = (
        icon === 'matchup' ? matchup :
        icon === 'scoreboard' ? scoreboard :
        icon === 'surprised' ? surprised :
        undefined
    )
</script>

<div title={hoverName !== '' ? `${hoverName}: ${(100 * valueNorm).toFixed()}/100` : ''} class=gameBarWithIconContainer>
    <img class=barIcon src={iconImg} alt="*">
    <div class=gameBarBackground style='background-color: {backgroundColor}'>
        <div
            class=gameBar
            style='width: {100 * valueNorm}%; background-color: hsl({120 * valueNorm}, 90%, 70%)'
        ></div>
    </div>
</div>

<style>
    .gameBarWithIconContainer {
        display: flex;
        align-items: center;
        margin: 2pt;
    }
    .gameBarBackground {
        height: 8px;
        width: 100%;
        position: relative;
        margin-left: 4px;
        border-left: 2px solid black;
        border-right: 2px solid black;
    }
    .gameBar {
        height: 4px;
        margin: 2px 0px;
        position: absolute;
        left: 0;
    }
    .barIcon {
        font-family: Arial Unicode MS;
        width: 20px;
        text-align: center;
    }
</style>