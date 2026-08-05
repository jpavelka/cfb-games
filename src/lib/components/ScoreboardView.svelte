<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ErrorState from '$lib/components/ErrorState.svelte';
	import GameList from '$lib/components/GameList.svelte';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import WeekPicker from '$lib/components/WeekPicker.svelte';
	import type { ConferenceMap } from '$lib/game/conferences';
	import {
		filterByBroadcastAccess,
		filterByMinScore,
		filterByTeam,
		filterByTeamCategory
	} from '$lib/game/filter';
	import { setDataStatus } from '$lib/game/dataStatus.svelte';
	import type { RatingMap } from '$lib/game/ratings';
	import { settings } from '$lib/game/settings.svelte';
	import type { Scoreboard } from '$lib/game/types';
	import type { WeekOption } from '$lib/game/weeks';

	let {
		scoreboard,
		weeks,
		requested = null,
		isCurrentWeek,
		conferences,
		ratings
	}: {
		scoreboard: Promise<Scoreboard>;
		/**
		 * The week picker's option list — loaded independently of any single week's
		 * own scoreboard fetch (see `+layout.ts`), so the picker can still offer a way
		 * out when `scoreboard` itself rejects.
		 */
		weeks: Promise<WeekOption[]>;
		/**
		 * The week slug this route asked for, or null on `/`, which shows whichever
		 * week ESPN considers current.
		 */
		requested?: string | null;
		/**
		 * Whether the week this navigation asked for is the one ESPN currently
		 * considers current — computed fresh in this route's own `load()` (see
		 * `+page.ts`), so it's tied to *this* navigation rather than left over from
		 * whichever week was on screen before. Drives both the "← Current week"
		 * link and `GameList`'s "Group by Day" default for the Upcoming section
		 * (Completed always defaults to ungrouped).
		 */
		isCurrentWeek: Promise<boolean>;
		conferences: ConferenceMap;
		ratings: RatingMap;
	} = $props();

	let search = $state('');

	// Bundled so the `{#await}` block below (and everything mounted inside it,
	// including `GameList`) only (re)creates once per navigation, with both
	// values already resolved — no separate reactive correction that could race
	// a fast navigation.
	const boardAndCurrent = $derived(Promise.all([scoreboard, isCurrentWeek]));

	// Footer reads `dataStatus` (see `dataStatus.svelte.ts`) rather than the `board`
	// bound inside the `{:then}` block below, since it's a sibling of this
	// component in `+layout.svelte` with no direct access to that promise.
	// Cleared while a new week is loading (or on failure) rather than left showing
	// the previous week's timing, which would otherwise read as current.
	$effect(() => {
		let cancelled = false;
		setDataStatus(null);
		scoreboard
			.then((board) => {
				if (!cancelled) setDataStatus(board);
			})
			.catch(() => {
				if (!cancelled) setDataStatus(null);
			});
		return () => {
			cancelled = true;
		};
	});
</script>

{#await boardAndCurrent}
	<div class="week">
		{#await weeks then weeksList}
			<WeekPicker weeks={weeksList} selected={requested} />
		{/await}
	</div>
	<LoadingState />
{:then [board, currentWeek]}
	{@const filteredGames = filterByBroadcastAccess(
		filterByTeamCategory(
			filterByMinScore(filterByTeam(board.games, search), ratings, settings.minMatchupScore),
			settings.teamFilter
		),
		settings.accessibleBroadcasts,
		settings.filterByAccessibleBroadcasts
	)}
	<div class="week">
		<h2>{board.week.label}</h2>
		<span class="season">{board.week.seasonYear}</span>
		{#await weeks then weeksList}
			<WeekPicker weeks={weeksList} selected={board.week.slug} />
		{/await}
	</div>

	<div class="toolbar">
		<input
			class="search"
			type="search"
			placeholder="Search teams or events…"
			aria-label="Search teams or events"
			bind:value={search}
		/>
	</div>

	<div class="meta">
		{#if requested !== null && !currentWeek}
			<a class="current" href={resolve('/')}>← Current week</a>
		{/if}
		<span class="count">{filteredGames.length} games</span>
	</div>

	{#if requested !== null && board.week.slug !== requested}
		<p class="notice">
			The {board.week.seasonYear} season has no <code>/{requested}</code> — ESPN answered with
			{board.week.label} instead.
		</p>
	{/if}

	{#if board.partialErrors.length}
		<p class="notice">
			Some games may be missing — the
			{board.partialErrors.map((error) => error.subdivision.toUpperCase()).join(' and ')}
			request to ESPN failed.
		</p>
	{/if}

	{#if board.games.length === 0}
		<p class="empty">No games scheduled for {board.week.label}.</p>
	{:else if filteredGames.length === 0}
		<p class="empty">
			{#if search.trim()}
				No games match "{search.trim()}".
			{:else}
				No games match your filters.
			{/if}
		</p>
	{:else}
		<GameList games={filteredGames} {conferences} {ratings} isCurrentWeek={currentWeek} />
	{/if}
{:catch error}
	<div class="week">
		{#await weeks then weeksList}
			<WeekPicker weeks={weeksList} selected={requested} />
		{/await}
	</div>
	<ErrorState message={error.message} onRetry={() => invalidateAll()} />
{/await}

<style>
	.week {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	h2 {
		margin: 0;
		font-size: var(--text-2xl);
		letter-spacing: -0.01em;
	}

	.season {
		color: var(--color-text-muted);
		font-size: var(--text-lg);
	}

	.week :global(select) {
		margin-left: auto;
	}

	.toolbar {
		margin-bottom: var(--space-3);
	}

	.search {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface-alt);
		color: inherit;
		font: inherit;
		font-size: var(--text-sm);
		transition: border-color var(--transition);
	}

	.search:hover,
	.search:focus-visible {
		border-color: var(--color-accent);
	}

	.meta {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
		font-size: var(--text-sm);
	}

	.current {
		color: var(--color-accent);
	}

	.current:hover {
		text-decoration: underline;
	}

	.count {
		margin-left: auto;
		color: var(--color-text-faint);
	}

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

	.empty {
		padding: var(--space-6) var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text-muted);
		text-align: center;
	}
</style>
