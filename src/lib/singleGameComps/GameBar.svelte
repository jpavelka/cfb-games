<script lang="ts">
    export let icon : string;
    export let valueNorm : number;
    export let backgroundColor : string = 'white';
</script>

<div class=gameBarWithIconContainer>
    <img class=barIcon src="./{icon}.svg" alt="*">
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
        margin-left: 2pt;
    }
    .gameBar {
        height: 4px;
        margin: 2px;
        position: absolute;
        left: 0;
    }
    .barIcon {
        font-family: Arial Unicode MS;
        width: 20px;
        text-align: center;
    }
</style>