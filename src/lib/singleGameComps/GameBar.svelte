<script lang="ts">
    import matchup from '$lib/assets/matchup.svg';
    import scoreboard from '$lib/assets/scoreboard.svg';
    import surprised from '$lib/assets/surprised.svg';
    export let valueNorm : number;
    export let icon : string = '';
    export let backgroundColor : string = 'white';
    export let hoverName : string = '';
    export let orientation : string = 'horizontal';
    export let containerStyleOverride : string = '';
    const iconImg = (
        icon === 'matchup' ? matchup :
        icon === 'scoreboard' ? scoreboard :
        icon === 'surprised' ? surprised :
        undefined
    )
    const backgroundStyle = `background-color: ${backgroundColor}; border-color: ${backgroundColor};`
</script>

<div 
    title={hoverName !== '' ? `${hoverName}: ${(100 * valueNorm).toFixed()}/100` : ''}
    class=gameBarWithIconContainer
    class:vertical={orientation === 'vertical'}
    style={containerStyleOverride}
>
    {#if !!iconImg}
        <img class=barIcon src={iconImg} alt="*">
    {/if}
    <div
        class=gameBarBackground
        style={backgroundStyle}
    >
        <div
            class=gameBar
            style='width: {100 * valueNorm}%; background-color: hsl({90 * valueNorm + 10}, 90%, 70%)'
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
        border-left: 2px solid;
        border-right: 2px solid;
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
    .vertical {
        transform: rotate(270deg);
    }
</style>