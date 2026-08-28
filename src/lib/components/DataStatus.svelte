<script lang="ts">
	import { invalidateAll } from '$app/navigation';
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

	// Once the backend's own scheduled check time has passed, a click is
	// guaranteed to actually fetch something new — `load.ts`'s `isFresh()` stops
	// trusting its cache at this exact same threshold — so this is the moment to
	// turn the passive countdown into a clickable refresh.
	const isDue = $derived(dataStatus.nextRefreshAt !== null && now.getTime() >= dataStatus.nextRefreshAt.getTime());

	let refreshing = $state(false);

	async function refresh() {
		refreshing = true;
		try {
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}
</script>

{#if dataStatus.fetchedAt}
	<span class="status">
		{formatRelativeUpdate(dataStatus.fetchedAt, now)}
		{#if dataStatus.nextRefreshAt}
			·
			{#if isDue}
				<button type="button" class="refresh" disabled={refreshing} onclick={refresh}>
					{formatNextRefresh(dataStatus.nextRefreshAt, now)}
				</button>
			{:else}
				{formatNextRefresh(dataStatus.nextRefreshAt, now)}
			{/if}
		{/if}
	</span>
{/if}

<style>
	.status {
		white-space: nowrap;
	}

	/* Reset to render at the exact same box size as the plain text it replaces —
	   the footer's height is measured by a ResizeObserver in +layout.svelte, so
	   this must not shift layout when it appears. */
	.refresh {
		margin: 0;
		padding: 0;
		border: none;
		background: none;
		color: var(--color-accent);
		font: inherit;
		line-height: inherit;
		cursor: pointer;
	}

	.refresh:hover,
	.refresh:focus-visible {
		text-decoration: underline;
	}

	.refresh:disabled {
		color: inherit;
		cursor: default;
	}
</style>
