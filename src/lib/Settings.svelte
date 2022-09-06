<!-- todo: favorite teams, channels, hide strength bars, sort styles (situation, interest score, etc) -->
<script lang="ts">
    import { settingsVisible as visible} from "$lib/stores";
    const handleClose = () => {
        visible.update(() => false);
    }
    const closeIfOutsideClick = (event: MouseEvent) => {
        if (!!!event.target) {
            return
        }
        const target = event.target as HTMLElement
        if (target.classList.contains('backgroundDiv')){
            handleClose();
        }
    }
    export let getGameData;
    export let includeFCS;
</script>

<div 
    class='backgroundDiv'
    class:invisible="{!$visible}"
    on:click={(event) => closeIfOutsideClick(event)}
>
    <div class='settingsContent'>
        <h1 style='text-align: center'>Settings</h1>
        <input
            type="checkbox"
            id=includeFCS
            checked={$includeFCS === 't'}
            on:click={() => {
                includeFCS.update(x => x === 't' ? 'f' : 't');
                getGameData();
            }}
        >
        <label for=includeFCS>Include FCS</label>
    </div>
</div>

<style>
    .backgroundDiv {
        position: fixed; /* Stay in place */
        z-index: 1; /* Sit on top */
        padding-top: 100px; /* Location of the box */
        left: 0;
        top: 0;
        width: 100%; /* Full width */
        height: 100%; /* Full height */
        overflow: auto; /* Enable scroll if needed */
        background-color: rgb(0,0,0); /* Fallback color */
        background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
    }
    .settingsContent {
        position: relative;
        background-color: #fefefe;
        margin: auto;
        padding: 5pt;
        border: 1px solid #888;
        width: 80%;
        max-height: 80%;
        overflow: scroll;
        box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2),0 6px 20px 0 rgba(0,0,0);
    }
    .invisible {
        display: none;
    }
</style>