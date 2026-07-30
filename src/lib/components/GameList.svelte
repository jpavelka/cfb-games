<script lang="ts">
	import GameCard from './GameCard.svelte';
	import GameModal from './GameModal.svelte';
	import { formatDayHeading } from '$lib/format';
	import type { ConferenceMap } from '$lib/game/conferences';
	import { sortByInterest, type FavoriteSort, type RatingMap } from '$lib/game/ratings';
	import { settings } from '$lib/game/settings.svelte';
	import { groupByDay as buildDays } from '$lib/game/sort';
	import type { Game } from '$lib/game/types';

	let {
		games,
		conferences,
		ratings
	}: { games: Game[]; conferences: ConferenceMap; ratings: RatingMap } = $props();

	const favorites: FavoriteSort = $derived({
		teamIds: new Set(settings.favoriteTeamIds),
		handling: settings.favoriteHandling,
		boostAmount: settings.favoriteBoostAmount
	});

	// A week spans Tuesday through Saturday, so day headings do the heavy lifting
	// for scannability across days; within a day/slot, games are reordered by
	// interest (see `sortByInterest`) rather than kept chronological.
	const days = $derived(
		buildDays(games).map((day) => ({
			...day,
			games: sortByInterest(day.games, ratings, favorites),
			slots: day.slots.map((slot) => ({
				...slot,
				games: sortByInterest(slot.games, ratings, favorites)
			}))
		}))
	);
	const flatGames = $derived(sortByInterest(games, ratings, favorites));

	let groupByDay = $state(true);
	// Each day starts grouped by kickoff time (the current default behavior);
	// a day only needs an entry here once its own checkbox is toggled off.
	let ungroupedByTime: Record<string, boolean> = $state({});

	let selectedGame: Game | null = $state(null);
</script>

<label class="toggle">
	<input type="checkbox" bind:checked={groupByDay} />
	Group by Day
</label>

{#if groupByDay}
	{#each days as day (day.key)}
		<details class="day" open>
			<summary>
				<h2>
					<span class="chevron" aria-hidden="true"></span>
					{formatDayHeading(day.date)}
					<span class="count">{day.games.length}</span>
				</h2>
			</summary>

			<label class="toggle timeToggle">
				<input
					type="checkbox"
					checked={!ungroupedByTime[day.key]}
					onchange={(event) => (ungroupedByTime[day.key] = !event.currentTarget.checked)}
				/>
				Group by Kickoff Time
			</label>

			{#if ungroupedByTime[day.key]}
				<div class="games">
					{#each day.games as game (game.id)}
						<GameCard {game} {ratings} onSelect={(selected) => (selectedGame = selected)} />
					{/each}
				</div>
			{:else}
				{#each day.slots as slot (slot.key)}
					<details class="slot" open>
						<summary>
							<h3>
								<span class="chevron" aria-hidden="true"></span>
								{slot.label}
								<span class="count">{slot.games.length}</span>
							</h3>
						</summary>

						<div class="games">
							{#each slot.games as game (game.id)}
								<GameCard {game} {ratings} onSelect={(selected) => (selectedGame = selected)} />
							{/each}
						</div>
					</details>
				{/each}
			{/if}
		</details>
	{/each}
{:else}
	<div class="games">
		{#each flatGames as game (game.id)}
			<GameCard {game} {ratings} showDate onSelect={(selected) => (selectedGame = selected)} />
		{/each}
	</div>
{/if}

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

	.day > summary .chevron {
		margin-right: var(--space-1);
	}

	.day:not([open]) > summary .chevron,
	.slot:not([open]) > summary .chevron {
		transform: rotate(45deg);
	}

	h2 {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		position: sticky;
		top: 0;
		z-index: 1;
		margin: 0 0 var(--space-3);
		padding: var(--space-2) 0;
		background: var(--color-bg);
		font-size: var(--text-lg);
	}

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
