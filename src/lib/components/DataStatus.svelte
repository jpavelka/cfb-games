<script lang="ts">
	import { dataStatus } from '$lib/game/dataStatus.svelte';
	import { formatNextRefresh, formatRelativeUpdate } from '$lib/format';

	/** Ticks the relative strings below without re-fetching anything. */
	let now = $state(new Date());

	$effect(() => {
		const interval = setInterval(() => {
			now = new Date();
		}, 15_000);
		return () => clearInterval(interval);
	});
</script>

{#if dataStatus.fetchedAt}
	<span class="status">
		{formatRelativeUpdate(dataStatus.fetchedAt, now)}
		{#if dataStatus.nextRefreshAt}
			· {formatNextRefresh(dataStatus.nextRefreshAt, now)}
		{/if}
	</span>
{/if}

<style>
	.status {
		white-space: nowrap;
	}
</style>
