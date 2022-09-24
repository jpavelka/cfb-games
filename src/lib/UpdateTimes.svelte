<script lang="ts">
    import { onMount } from "svelte";

    export let lastUpdateStr: string;
    export let nextUpdateStr: string | undefined;

    const lastUpdate = new Date(lastUpdateStr);
    const nextUpdate = nextUpdateStr === undefined ? undefined : new Date(nextUpdateStr);
    let now = new Date();
    onMount(() => {
        const interval = setInterval(() => {
            now = new Date();
        }, 5000);
        return () => {
            clearInterval(interval);
        };
    });
    $:lastUpdateDispStr = intervalStr(lastUpdate, now);
    $:nextUpdateDispStr = nextUpdate === undefined ? '' : intervalStr(now, nextUpdate);
    const intervalStr = (dttm1: Date, dttm2: Date) => {
        let secs = (dttm2.getTime() - dttm1.getTime()) / 1000;
        if (secs < 0) {
            return ''
        }
        if (secs < 59.5) {
            return strFromNumAndUnit(Math.max(Math.round(secs / 5) * 5, 5), 'second')
        }
        const mins = secs / 60;
        if (mins < 9.5) {
            return strFromNumAndUnit(Math.round(mins), 'minute')
        }
        if (mins < 59.5) {
            return strFromNumAndUnit(Math.round(mins / 5) * 5, 'minute')
        }
        const hours = mins / 60;
        if (hours < 23.5) {
            return strFromNumAndUnit(Math.round(hours), 'hour')
        }
        const days = hours / 24;
        return strFromNumAndUnit(Math.round(days), 'day')
    }
    const strFromNumAndUnit = (num: number, unit: string) => {
        return num + ' ' + unit + (num === 1 ? '' : 's')
    }
</script>

<div>
    Last update: {lastUpdateDispStr} ago
    {#if nextUpdate !== undefined}
        {nextUpdateDispStr === '' ? (
            ' - Refresh for new data'

        ) : (
            ' - Next update: ' + nextUpdateDispStr
        )}
    {/if}
</div>
