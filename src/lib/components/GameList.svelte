<script lang="ts">
	import GameCard from './GameCard.svelte';
	import GameModal from './GameModal.svelte';
	import { formatDayHeading } from '$lib/format';
	import type { ConferenceMap } from '$lib/game/conferences';
	import { sortByInterest, type FavoriteSort, type RatingMap } from '$lib/game/ratings';
	import { settings } from '$lib/game/settings.svelte';
	import { groupByDay as buildDays, groupByStatus, localDayKey } from '$lib/game/sort';
	import type { Game } from '$lib/game/types';

	let {
		games,
		conferences,
		ratings,
		isCurrentWeek = true
	}: {
		games: Game[];
		conferences: ConferenceMap;
		ratings: RatingMap;
		/** Whether this week is the one ESPN currently considers current — the
		 * only week that starts grouped by day; every other week starts flat. */
		isCurrentWeek?: boolean;
	} = $props();

	const favorites: FavoriteSort = $derived({
		teamIds: new Set(settings.favoriteTeamIds),
		handling: settings.favoriteHandling,
		boostAmount: settings.favoriteBoostAmount
	});

	// Games are first split into status sections (Current, Upcoming, Completed,
	// Postponed, Canceled — see `groupByStatus`); only Upcoming/Completed go on to
	// the day/slot breakdown below, since the other sections are usually small
	// and a day heading would add noise rather than help. Within each bucket,
	// day headings do the heavy lifting for scannability across days; within a
	// day/slot, games are reordered by interest (see `sortByInterest`) rather
	// than kept chronological.
	const sections = $derived(
		groupByStatus(games).map((section) => ({
			...section,
			days: buildDays(section.games).map((day) => ({
				...day,
				games: sortByInterest(day.games, ratings, favorites),
				slots: day.slots.map((slot) => ({
					...slot,
					games: sortByInterest(slot.games, ratings, favorites)
				}))
			})),
			flatGames: sortByInterest(section.games, ratings, favorites)
		}))
	);
	const DAY_GROUPABLE = new Set(['upcoming', 'completed']);

	// Each day-groupable section (Upcoming, Completed) has its own independent
	// "Group by Day" toggle, keyed by section — flipping one doesn't affect the
	// other. Upcoming defaults to `isCurrentWeek`; Completed always defaults to
	// off, since a finished day's games don't need the same at-a-glance framing
	// upcoming ones do.
	function defaultGroupByDay(sectionKey: string): boolean {
		return sectionKey === 'completed' ? false : isCurrentWeek;
	}
	let groupByDayBySection: Record<string, boolean> = $state({});

	// Every day starts ungrouped by kickoff time except today's, which starts
	// grouped (kickoff time matters most for a game that's about to start or
	// already underway); a day only needs an entry here once its own checkbox
	// is toggled away from that default.
	const todayKey = localDayKey(new Date());
	// Composite section+day key, since Upcoming and Completed can each have a
	// day group for the same calendar date.
	const dayStateKey = (sectionKey: string, key: string) => `${sectionKey}:${key}`;
	let groupedByTime: Record<string, boolean> = $state({});

	// Measured per day so slot headings tuck in right below the day heading
	// even if it wraps to more than one line.
	let dayHeadingHeights: Record<string, number> = $state({});

	// Measured per status section so a nested day heading tucks in right below
	// it, same reasoning as `dayHeadingHeights`.
	let sectionHeadingHeights: Record<string, number> = $state({});

	// Collapsing a pinned header's section shrinks its sticky containing
	// block out from under it, so it jumps out of view instead of staying
	// put. Captured on click (before the native toggle runs) and consumed
	// on the following `toggle` event to nudge the scroll position back.
	let pendingHeaderCorrection: { offset: number } | null = null;

	function handleHeaderClick(event: MouseEvent, offset: number) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		pendingHeaderCorrection = Math.abs(rect.top - offset) < 1 ? { offset } : null;
	}

	function handleHeaderToggle(event: Event) {
		if (!pendingHeaderCorrection) return;
		const { offset } = pendingHeaderCorrection;
		pendingHeaderCorrection = null;

		const summaryEl = (event.currentTarget as HTMLElement).querySelector(':scope > summary');
		if (!summaryEl) return;

		requestAnimationFrame(() => {
			const delta = summaryEl.getBoundingClientRect().top - offset;
			if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
		});
	}

	let selectedGame: Game | null = $state(null);
</script>

{#snippet gamesList(list: Game[], showDate: boolean)}
	<div class="games">
		{#each list as game (game.id)}
			<GameCard {game} {ratings} {showDate} onSelect={(selected) => (selectedGame = selected)} />
		{/each}
	</div>
{/snippet}

{#each sections as section (section.key)}
	<details class="statusSection" class:live={section.key === 'current'} open ontoggle={handleHeaderToggle}>
		<summary onclick={(event) => handleHeaderClick(event, 0)}>
			<h2 bind:clientHeight={sectionHeadingHeights[section.key]}>
				<span class="chevron" aria-hidden="true"></span>
				{section.label}
				<span class="count">{section.games.length}</span>
			</h2>
		</summary>

		{#if DAY_GROUPABLE.has(section.key)}
			<label class="toggle">
				<input
					type="checkbox"
					checked={groupByDayBySection[section.key] ?? defaultGroupByDay(section.key)}
					onchange={(event) => (groupByDayBySection[section.key] = event.currentTarget.checked)}
				/>
				Group by Day
			</label>
		{/if}

		{#if DAY_GROUPABLE.has(section.key) && (groupByDayBySection[section.key] ?? defaultGroupByDay(section.key))}
			{@const sectionOffset = sectionHeadingHeights[section.key] ?? 0}
			{#each section.days as day (day.key)}
				{@const stateKey = dayStateKey(section.key, day.key)}
				<details class="day" open ontoggle={handleHeaderToggle}>
					<summary
						style="top: {sectionOffset}px"
						onclick={(event) => handleHeaderClick(event, sectionOffset)}
					>
						<h2 bind:clientHeight={dayHeadingHeights[stateKey]}>
							<span class="chevron" aria-hidden="true"></span>
							{formatDayHeading(day.date)}
							<span class="count">{day.games.length}</span>
						</h2>
					</summary>

					<label class="toggle timeToggle">
						<input
							type="checkbox"
							checked={groupedByTime[stateKey] ?? day.key === todayKey}
							onchange={(event) => (groupedByTime[stateKey] = event.currentTarget.checked)}
						/>
						Group by Kickoff Time
					</label>

					{#if !(groupedByTime[stateKey] ?? day.key === todayKey)}
						{@render gamesList(day.games, false)}
					{:else}
						{#each day.slots as slot (slot.key)}
							<details class="slot" open ontoggle={handleHeaderToggle}>
								<summary
									style="top: {sectionOffset + (dayHeadingHeights[stateKey] ?? 0)}px"
									onclick={(event) =>
										handleHeaderClick(event, sectionOffset + (dayHeadingHeights[stateKey] ?? 0))}
								>
									<h3>
										<span class="chevron" aria-hidden="true"></span>
										{slot.label}
										<span class="count">{slot.games.length}</span>
									</h3>
								</summary>

								{@render gamesList(slot.games, false)}
							</details>
						{/each}
					{/if}
				</details>
			{/each}
		{:else}
			{@render gamesList(section.flatGames, true)}
		{/if}
	</details>
{/each}

<GameModal game={selectedGame} onClose={() => (selectedGame = null)} {conferences} {ratings} />

<style>
	.toggle {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.timeToggle {
		margin-bottom: var(--space-3);
	}

	.statusSection {
		margin-bottom: var(--space-6);
	}

	.statusSection:not([open]) {
		margin-bottom: var(--space-2);
	}

	.day {
		margin-bottom: var(--space-6);
	}

	.day:not([open]) {
		margin-bottom: var(--space-2);
	}

	summary {
		list-style: none;
		cursor: pointer;
	}

	.statusSection > summary {
		position: sticky;
		top: 0;
		z-index: 3;
	}

	.day > summary {
		position: sticky;
		z-index: 2;
	}

	.slot > summary {
		position: sticky;
		z-index: 1;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	.chevron {
		flex: none;
		width: 0.6em;
		height: 0.6em;
		border-right: 2px solid currentColor;
		border-bottom: 2px solid currentColor;
		transform: rotate(-45deg);
		transition: transform 0.15s ease;
	}

	.statusSection > summary .chevron,
	.day > summary .chevron {
		margin-right: var(--space-1);
	}

	.statusSection:not([open]) > summary .chevron,
	.day:not([open]) > summary .chevron,
	.slot:not([open]) > summary .chevron {
		transform: rotate(45deg);
	}

	h2 {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: 0 0 var(--space-3);
		padding: var(--space-2) 0;
		background: var(--color-bg);
		font-size: var(--text-lg);
	}

	.statusSection > summary h2 {
		font-size: var(--text-xl);
	}

	.statusSection.live > summary h2 {
		background: var(--color-live-bg);
		color: var(--color-live);
	}

	.statusSection:not([open]) h2,
	.day:not([open]) h2 {
		margin-bottom: 0;
	}

	.count {
		padding: 0 var(--space-2);
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.slot {
		margin-bottom: var(--space-4);
	}

	.slot:last-child {
		margin-bottom: 0;
	}

	.slot:not([open]) {
		margin-bottom: var(--space-1);
	}

	h3 {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: 0 0 var(--space-2);
		padding: var(--space-1) 0;
		background: var(--color-bg);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.slot:not([open]) h3 {
		margin-bottom: 0;
	}

	.games {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
</style>
