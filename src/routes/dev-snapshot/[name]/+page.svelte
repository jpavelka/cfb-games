<script lang="ts">
	import { resolve } from '$app/paths';
	import ScoreboardView from '$lib/components/ScoreboardView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Dev snapshot: {data.name} — College Football Games</title>
</svelte:head>

<p class="notice">
	Dev snapshot: <code>{data.name}</code> — not live data. <a href={resolve('/dev-snapshot')}>← All snapshots</a>
</p>

<ScoreboardView
	scoreboard={data.scoreboard}
	weeks={data.weeks}
	isCurrentWeek={data.isCurrentWeek}
	conferences={data.conferences}
	ratings={data.ratings}
/>

<style>
	.notice {
		margin: 0 0 var(--space-4);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-sm);
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
		font-size: var(--text-sm);
	}

	.notice code {
		font-family: var(--font-numeric);
	}

	.notice a {
		color: inherit;
	}
</style>
