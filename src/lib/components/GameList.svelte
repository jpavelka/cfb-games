<script lang="ts">
	import GameCard from './GameCard.svelte';
	import GameModal from './GameModal.svelte';
	import matchupIcon from '$lib/assets/matchup.svg';
	import scoreboardIcon from '$lib/assets/scoreboard.svg';
	import surpriseIcon from '$lib/assets/surprised.svg';
	import { formatDayHeading } from '$lib/format';
	import type { ConferenceMap } from '$lib/game/conferences';
	import {
		sortByCombinedCurrentScore,
		sortByCombinedScore,
		sortByInterest,
		type CurrentScoreWeights,
		type FavoriteSort,
		type RatingMap,
		type ScoreWeights
	} from '$lib/game/ratings';
	import { isDarkMode, settings, updateSettings } from '$lib/game/settings.svelte';
	import { groupByDay as buildDays, groupByStatus, localDayKey, sortGames } from '$lib/game/sort';
	import type { Game } from '$lib/game/types';

	let {
		games,
		conferences,
		ratings
	}: {
		games: Game[];
		conferences: ConferenceMap;
		ratings: RatingMap;
	} = $props();

	const favorites: FavoriteSort = $derived({
		teamIds: new Set(settings.favoriteTeamIds),
		handling: settings.favoriteHandling,
		boostAmount: settings.favoriteBoostAmount
	});

	// The Custom-mode slider runs 0 (all matchup) to 100 (all surprise); each
	// side's weight is how close the slider sits to that side.
	const weights: ScoreWeights = $derived({
		matchup: (100 - settings.customSortMix) / 100,
		surprise: settings.customSortMix / 100
	});

	// Every section sorts by matchup score, except Completed, where the user
	// picks matchup, surprise, or a custom weighted blend of both — see
	// `completedSortMode` in settings and the "Sort by" control below —
	// Upcoming, where the user picks matchup or actual kickoff time — see
	// `upcomingSortMode` — and Current, where the user picks situation,
	// matchup, (live) surprise score, or a custom three-way blend set via
	// the triangle below — see `currentSortMode`.
	function sortSection(sectionGames: Game[], sectionKey: string): Game[] {
		if (sectionKey === 'upcoming' && settings.upcomingSortMode === 'kickoff') {
			return sortGames(sectionGames);
		}

		if (sectionKey === 'current') {
			if (settings.currentSortMode === 'custom') {
				return sortByCombinedCurrentScore(
					sectionGames,
					ratings,
					settings.currentSortWeights,
					favorites
				);
			}
			return sortByInterest(sectionGames, ratings, favorites, {
				metric: settings.currentSortMode,
				tiebreakMetric: settings.currentSortMode === 'matchup' ? 'situation' : 'matchup'
			});
		}

		if (sectionKey !== 'completed') return sortByInterest(sectionGames, ratings, favorites);

		if (settings.completedSortMode === 'custom') {
			return sortByCombinedScore(sectionGames, ratings, weights, favorites);
		}
		return settings.completedSortMode === 'surprise'
			? sortByInterest(sectionGames, ratings, favorites, {
					metric: 'surprise',
					tiebreakMetric: 'matchup'
				})
			: sortByInterest(sectionGames, ratings, favorites, {
					metric: 'matchup',
					tiebreakMetric: 'surprise'
				});
	}

	function setCustomSortMix(raw: string): void {
		const parsed = Number(raw);
		updateSettings({
			customSortMix: Number.isFinite(parsed)
				? Math.min(100, Math.max(0, parsed))
				: settings.customSortMix
		});
	}

	function setCurrentSortWeight(metric: keyof CurrentScoreWeights, raw: string): void {
		const parsed = Number(raw);
		if (!Number.isFinite(parsed)) return;
		updateSettings({
			currentSortWeights: {
				...settings.currentSortWeights,
				[metric]: Math.min(100, Math.max(0, parsed))
			}
		});
	}

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
				games: sortSection(day.games, section.key),
				slots: day.slots.map((slot) => ({
					...slot,
					games: sortSection(slot.games, section.key)
				}))
			})),
			flatGames: sortSection(section.games, section.key)
		}))
	);
	const DAY_GROUPABLE = new Set(['upcoming', 'completed']);

	// Every day starts ungrouped by kickoff time except today's, which starts
	// grouped (kickoff time matters most for a game that's about to start or
	// already underway); a day only needs an entry here once its own checkbox
	// is toggled away from that default.
	const todayKey = localDayKey(new Date());

	// Each day-groupable section (Upcoming, Completed) has its own independent
	// "Group by Day" toggle, keyed by section — flipping one doesn't affect the
	// other. Upcoming defaults on only when it actually has a game kicking off
	// today (per the browser's clock) — that's the one case where the day
	// breakdown adds anything on first load. Completed always defaults to off,
	// since a finished day's games don't need the same at-a-glance framing.
	function defaultGroupByDay(sectionKey: string): boolean {
		if (sectionKey === 'completed') return false;
		return sections.some(
			(section) => section.key === 'upcoming' && section.days.some((day) => day.key === todayKey)
		);
	}
	let groupByDayBySection: Record<string, boolean> = $state({});

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
	<details class="statusSection" open ontoggle={handleHeaderToggle}>
		<summary onclick={(event) => handleHeaderClick(event, 0)}>
			<h2 bind:clientHeight={sectionHeadingHeights[section.key]}>
				<span class="chevron" aria-hidden="true"></span>
				{section.label}
				<span class="count">{section.games.length}</span>
			</h2>
		</summary>

		{#if section.key === 'current'}
			<div class="sortToggle">
				<span class="sortLabel">Sort:</span>
				<label class="radio">
					<input
						type="radio"
						name="currentSortMode"
						value="matchup"
						checked={settings.currentSortMode === 'matchup'}
						onchange={() => updateSettings({ currentSortMode: 'matchup' })}
					/>
					Matchup
				</label>
				<label class="radio">
					<input
						type="radio"
						name="currentSortMode"
						value="situation"
						checked={settings.currentSortMode === 'situation'}
						onchange={() => updateSettings({ currentSortMode: 'situation' })}
					/>
					Situation
				</label>
				<label class="radio">
					<input
						type="radio"
						name="currentSortMode"
						value="surprise"
						checked={settings.currentSortMode === 'surprise'}
						onchange={() => updateSettings({ currentSortMode: 'surprise' })}
					/>
					Surprise
				</label>
				<label class="radio">
					<input
						type="radio"
						name="currentSortMode"
						value="custom"
						checked={settings.currentSortMode === 'custom'}
						onchange={() => updateSettings({ currentSortMode: 'custom' })}
					/>
					Custom
				</label>
			</div>

			{#if settings.currentSortMode === 'custom'}
				<div class="weightSliders">
					<div class="weightRow">
						<span class="weightLabel">
							<img class="scoreIcon" src={matchupIcon} alt="" />
							Matchup
						</span>
						<input
							class="weightSlider"
							type="range"
							min="0"
							max="100"
							aria-label="Matchup score weight"
							value={settings.currentSortWeights.matchup}
							oninput={(event) => setCurrentSortWeight('matchup', event.currentTarget.value)}
						/>
						<span class="weightValue">{settings.currentSortWeights.matchup}</span>
					</div>
					<div class="weightRow">
						<span class="weightLabel">
							<img class="scoreIcon" class:inverted={isDarkMode()} src={scoreboardIcon} alt="" />
							Situation
						</span>
						<input
							class="weightSlider"
							type="range"
							min="0"
							max="100"
							aria-label="Situation score weight"
							value={settings.currentSortWeights.situation}
							oninput={(event) => setCurrentSortWeight('situation', event.currentTarget.value)}
						/>
						<span class="weightValue">{settings.currentSortWeights.situation}</span>
					</div>
					<div class="weightRow">
						<span class="weightLabel">
							<img class="scoreIcon" src={surpriseIcon} alt="" />
							Surprise
						</span>
						<input
							class="weightSlider"
							type="range"
							min="0"
							max="100"
							aria-label="Surprise score weight"
							value={settings.currentSortWeights.surprise}
							oninput={(event) => setCurrentSortWeight('surprise', event.currentTarget.value)}
						/>
						<span class="weightValue">{settings.currentSortWeights.surprise}</span>
					</div>
				</div>
			{/if}
		{/if}

		{#if section.key === 'upcoming'}
			<div class="sortToggle">
				<span class="sortLabel">Sort:</span>
				<label class="radio">
					<input
						type="radio"
						name="upcomingSortMode"
						value="matchup"
						checked={settings.upcomingSortMode === 'matchup'}
						onchange={() => updateSettings({ upcomingSortMode: 'matchup' })}
					/>
					Matchup
				</label>
				<label class="radio">
					<input
						type="radio"
						name="upcomingSortMode"
						value="kickoff"
						checked={settings.upcomingSortMode === 'kickoff'}
						onchange={() => updateSettings({ upcomingSortMode: 'kickoff' })}
					/>
					Kickoff Time
				</label>
			</div>
		{/if}

		{#if section.key === 'completed'}
			<div class="sortToggle">
				<span class="sortLabel">Sort:</span>
				<label class="radio">
					<input
						type="radio"
						name="completedSortMode"
						value="matchup"
						checked={settings.completedSortMode === 'matchup'}
						onchange={() => updateSettings({ completedSortMode: 'matchup' })}
					/>
					Matchup
				</label>
				<label class="radio">
					<input
						type="radio"
						name="completedSortMode"
						value="surprise"
						checked={settings.completedSortMode === 'surprise'}
						onchange={() => updateSettings({ completedSortMode: 'surprise' })}
					/>
					Surprise
				</label>
				<label class="radio">
					<input
						type="radio"
						name="completedSortMode"
						value="custom"
						checked={settings.completedSortMode === 'custom'}
						onchange={() => updateSettings({ completedSortMode: 'custom' })}
					/>
					Custom
				</label>
			</div>

			{#if settings.completedSortMode === 'custom'}
				<div class="mixRow">
					<span class="mixLabel">
						<img class="scoreIcon" src={matchupIcon} alt="" />
						Matchup
					</span>
					<input
						class="mixSlider"
						type="range"
						min="0"
						max="100"
						aria-label="Matchup vs. surprise weight"
						value={settings.customSortMix}
						oninput={(event) => setCustomSortMix(event.currentTarget.value)}
					/>
					<span class="mixLabel">
						<img class="scoreIcon" src={surpriseIcon} alt="" />
						Surprise
					</span>
				</div>
			{/if}
		{/if}

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
						Group by Time of Day
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

	.sortToggle {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.8rem;
		margin-bottom: var(--space-3);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.sortToggle .radio {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		cursor: pointer;
	}

	.sortToggle .radio input[type='radio'] {
		margin: 0;
		position: relative;
		top: -1px;
	}

	.mixRow {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.mixSlider {
		flex: 1;
		max-width: 16rem;
	}

	.mixLabel {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	.scoreIcon {
		flex: none;
		width: 14px;
		height: 14px;
	}

	.scoreIcon.inverted {
		filter: invert(1);
	}

	.weightSliders {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.weightRow {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.weightLabel {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: var(--space-1);
		width: 5.5rem;
	}

	.weightSlider {
		flex: 1;
		max-width: 16rem;
	}

	.weightValue {
		flex: none;
		width: 1.75rem;
		text-align: right;
		color: var(--color-text);
		font-variant-numeric: tabular-nums;
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
		margin-bottom: 0;
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
