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

	/** Matches `formatNextRefresh`'s own "refresh for new data" lag. */
	const DUE_LAG_MS = 3_000;

	// Once the backend's own scheduled check time has passed (plus a few
	// seconds' grace — `load.ts`'s `isFresh()` stops trusting its cache at the
	// unlagged threshold, so a click here is guaranteed to fetch something new
	// well before this fires), turn the passive countdown into a clickable
	// refresh — right as its label flips to "Refresh for new data", not before.
	const isDue = $derived(
		dataStatus.nextRefreshAt !== null && now.getTime() >= dataStatus.nextRefreshAt.getTime() + DUE_LAG_MS
	);

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
