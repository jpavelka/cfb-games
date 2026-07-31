<script lang="ts">
	import {
		groupConferencesBySubdivision,
		type ConferenceMap,
		type ConferenceTeam
	} from '$lib/game/conferences';
	import {
		settings,
		toggleAccessibleBroadcast,
		toggleFavoriteTeam,
		updateSettings,
		type FavoriteHandling,
		type TeamFilter,
		type Theme
	} from '$lib/game/settings.svelte';

	let {
		open,
		onClose,
		conferences,
		broadcasters
	}: {
		open: boolean;
		onClose: () => void;
		conferences: ConferenceMap;
		broadcasters: string[];
	} = $props();

	let dialogEl: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (open) {
			dialogEl?.showModal();
		} else {
			dialogEl?.close();
		}
	});

	function setMinMatchupScore(raw: string): void {
		const parsed = Number(raw);
		const clamped = Number.isFinite(parsed)
			? Math.min(99, Math.max(0, Math.round(parsed)))
			: settings.minMatchupScore;
		updateSettings({ minMatchupScore: clamped });
	}

	const themes: Array<{ value: Theme; label: string }> = [
		{ value: 'system', label: 'System' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	];

	const teamFilters: Array<{ value: TeamFilter; label: string }> = [
		{ value: 'all', label: 'All' },
		{ value: 'fbs', label: 'FBS' },
		{ value: 'fcs', label: 'FCS' },
		{ value: 'power4', label: 'Power 4' },
		{ value: 'ranked', label: 'Ranked' }
	];

	let pickerOpen = $state(false);
	let favoriteSearch = $state('');
	let reviewOpen = $state(false);

	function closePicker(): void {
		pickerOpen = false;
		favoriteSearch = '';
	}

	// Flat lookup so the "review selections" chips can show a team's name without
	// re-walking every conference.
	const teamById = $derived.by(
		() =>
			new Map<string, ConferenceTeam>(
				[...conferences.values()].flatMap((conference) =>
					conference.teams.map((team): [string, ConferenceTeam] => [team.id, team])
				)
			)
	);

	const favoriteTeams = $derived(
		settings.favoriteTeamIds
			.map((id) => teamById.get(id))
			.filter((team) => team !== undefined)
			.sort((a, b) => a.location.localeCompare(b.location))
	);

	function teamMatches(team: ConferenceTeam, query: string): boolean {
		return (
			team.location.toLowerCase().includes(query) ||
			team.displayName.toLowerCase().includes(query) ||
			team.abbreviation.toLowerCase().includes(query)
		);
	}

	// While searching, every matching conference is shown flat (no need to dig
	// through <details>); browsing with no query keeps them collapsed instead so
	// ~270 teams don't all render open at once.
	const favoriteGroups = $derived.by(() => {
		const query = favoriteSearch.trim().toLowerCase();
		return groupConferencesBySubdivision(conferences)
			.map((group) => ({
				subdivision: group.subdivision,
				conferences: group.conferences
					.map((conference) => ({
						conference,
						teams: query ? conference.teams.filter((team) => teamMatches(team, query)) : conference.teams
					}))
					.filter((entry) => entry.teams.length > 0)
			}))
			.filter((group) => group.conferences.length > 0);
	});

	const favoriteHandlings: Array<{ value: FavoriteHandling; label: string }> = [
		{ value: 'none', label: 'Do nothing' },
		{ value: 'top', label: 'Always bring to top' },
		{ value: 'boost', label: 'Add to matchup score' }
	];

	function setBoostAmount(raw: string): void {
		const parsed = Number(raw);
		const clamped = Number.isFinite(parsed)
			? Math.max(0, Math.round(parsed))
			: settings.favoriteBoostAmount;
		updateSettings({ favoriteBoostAmount: clamped });
	}

	let broadcastPickerOpen = $state(false);
</script>

{#snippet teamList(teams: ConferenceTeam[])}
	<div class="teamList">
		{#each teams as team (team.id)}
			<label class="teamCheckbox">
				<input
					type="checkbox"
					checked={settings.favoriteTeamIds.includes(team.id)}
					onchange={() => toggleFavoriteTeam(team.id)}
				/>
				{team.location}
			</label>
		{/each}
	</div>
{/snippet}

{#snippet broadcastList(names: string[])}
	<div class="teamList">
		{#each names as name (name)}
			<label class="teamCheckbox">
				<input
					type="checkbox"
					checked={settings.accessibleBroadcasts.includes(name)}
					onchange={() => toggleAccessibleBroadcast(name)}
				/>
				{name}
			</label>
		{/each}
	</div>
{/snippet}

<dialog
	bind:this={dialogEl}
	class="modal"
	onclose={onClose}
	onclick={(event) => {
		if (event.target === dialogEl) onClose();
	}}
>
	<div class="content">
		<button class="close" type="button" aria-label="Close" onclick={onClose}>
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
				<path
					d="M2 2l12 12M14 2L2 14"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
				/>
			</svg>
		</button>

		<h2>Settings</h2>

		<section>
			<span class="field">Appearance</span>
			<div class="radioGroup">
				{#each themes as option (option.value)}
					<label class="radio">
						<input
							type="radio"
							name="theme"
							value={option.value}
							checked={settings.theme === option.value}
							onchange={() => updateSettings({ theme: option.value })}
						/>
						{option.label}
					</label>
				{/each}
			</div>
		</section>

		<section>
			<span class="field">Teams</span>
			<div class="radioGroup">
				{#each teamFilters as option (option.value)}
					<label class="radio">
						<input
							type="radio"
							name="teamFilter"
							value={option.value}
							checked={settings.teamFilter === option.value}
							onchange={() => updateSettings({ teamFilter: option.value })}
						/>
						{option.label}
					</label>
				{/each}
			</div>
			<p class="hint">Show only games involving a team from the selected category.</p>
		</section>

		<section>
			<label class="field" for="minMatchupScore">Minimum matchup score</label>
			<div class="scoreRow">
				<input
					id="minMatchupScore"
					type="range"
					min="0"
					max="99"
					value={settings.minMatchupScore}
					oninput={(event) =>
						updateSettings({ minMatchupScore: Number(event.currentTarget.value) })}
				/>
				<input
					class="scoreNumber"
					type="number"
					min="0"
					max="99"
					aria-label="Minimum matchup score"
					value={settings.minMatchupScore}
					onchange={(event) => setMinMatchupScore(event.currentTarget.value)}
				/>
			</div>
			<p class="hint">Hide games below this score. Set to 0 to show every game.</p>
		</section>

		<section>
			<span class="field">Favorite teams</span>
			<div class="pickerHeader">
				<button
					class="pickerToggle"
					type="button"
					aria-expanded={pickerOpen}
					onclick={() => (pickerOpen ? closePicker() : (pickerOpen = true))}
				>
					{pickerOpen ? 'Hide teams' : 'Select teams'}
				</button>
				{#if settings.favoriteTeamIds.length > 0}
					<button
						class="favoriteCount"
						type="button"
						aria-expanded={reviewOpen}
						onclick={() => (reviewOpen = !reviewOpen)}
					>
						{settings.favoriteTeamIds.length} selected
					</button>
				{/if}
			</div>
			{#if reviewOpen && favoriteTeams.length > 0}
				<div class="selectedChips">
					{#each favoriteTeams as team (team.id)}
						<span class="chip">
							{team.location}
							<button
								type="button"
								class="chipRemove"
								aria-label={`Remove ${team.location}`}
								onclick={() => toggleFavoriteTeam(team.id)}
							>
								&times;
							</button>
						</span>
					{/each}
				</div>
			{/if}
			{#if pickerOpen}
				<input
					class="search"
					type="search"
					placeholder="Search teams…"
					aria-label="Search teams"
					bind:value={favoriteSearch}
				/>
				<div class="teamGroups">
					{#each favoriteGroups as group (group.subdivision)}
						<div class="subdivision">
							<h3>{group.subdivision.toUpperCase()}</h3>
							{#each group.conferences as { conference, teams } (conference.id)}
								{#if favoriteSearch.trim()}
									<div class="conference">
										<h4>{conference.shortName}</h4>
										{@render teamList(teams)}
									</div>
								{:else}
									<details class="conference">
										<summary>
											{conference.shortName}
											<span class="count">{teams.length}</span>
										</summary>
										{@render teamList(teams)}
									</details>
								{/if}
							{/each}
						</div>
					{:else}
						<p class="empty">No teams match "{favoriteSearch.trim()}".</p>
					{/each}
				</div>
			{/if}
			<p class="hint">Favorite teams get special treatment in the sort order.</p>
		</section>

		<section>
			<span class="field">Favorite team sort</span>
			<div class="radioGroup">
				{#each favoriteHandlings as option (option.value)}
					<label class="radio">
						<input
							type="radio"
							name="favoriteHandling"
							value={option.value}
							checked={settings.favoriteHandling === option.value}
							onchange={() => updateSettings({ favoriteHandling: option.value })}
						/>
						{option.label}
					</label>
				{/each}
			</div>
			{#if settings.favoriteHandling === 'boost'}
				<div class="boostRow">
					<label for="favoriteBoostAmount">Boost amount</label>
					<input
						id="favoriteBoostAmount"
						class="scoreNumber"
						type="number"
						min="0"
						max="99"
						value={settings.favoriteBoostAmount}
						onchange={(event) => setBoostAmount(event.currentTarget.value)}
					/>
				</div>
			{/if}
			<p class="hint">Affects sort order only — the displayed matchup score doesn't change.</p>
		</section>

		<section>
			<span class="field">Channels</span>
			<div class="pickerHeader">
				<button
					class="pickerToggle"
					type="button"
					aria-expanded={broadcastPickerOpen}
					onclick={() => (broadcastPickerOpen = !broadcastPickerOpen)}
				>
					{broadcastPickerOpen ? 'Hide channels' : 'Select channels'}
				</button>
				{#if settings.accessibleBroadcasts.length > 0}
					<span class="channelCount">
						{settings.accessibleBroadcasts.length} selected
					</span>
				{/if}
			</div>
			{#if broadcastPickerOpen}
				{#if broadcasters.length > 0}
					<div class="teamGroups">
						{@render broadcastList(broadcasters)}
					</div>
				{:else}
					<p class="empty">No channel data available yet.</p>
				{/if}
			{/if}
			<label class="radio">
				<input
					type="checkbox"
					checked={settings.filterByAccessibleBroadcasts}
					onchange={(event) =>
						updateSettings({ filterByAccessibleBroadcasts: event.currentTarget.checked })}
				/>
				Only show games I can watch
			</label>
			<p class="hint">
				Hides games not on a selected channel — including games with no listed national
				broadcaster.
			</p>
		</section>
	</div>
</dialog>

<style>
	.modal {
		width: min(32rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
		padding: 0;
		border: none;
		border-radius: var(--radius-lg);
		background: transparent;
		color: inherit;
		overflow: visible;
	}

	.modal::backdrop {
		background: rgb(0 0 0 / 0.5);
	}

	.content {
		position: relative;
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		padding: var(--space-5);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
	}

	.close {
		position: absolute;
		top: var(--space-5);
		right: var(--space-5);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.close:hover {
		color: var(--color-text);
	}

	h2 {
		margin: 0 0 var(--space-4);
		padding-inline: 2.5rem 0;
		font-size: var(--text-xl);
		letter-spacing: -0.01em;
	}

	section {
		margin-bottom: var(--space-5);
	}

	section:last-child {
		margin-bottom: 0;
	}

	.field {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.scoreRow {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	input[type='range'] {
		flex: 1;
	}

	.scoreNumber {
		width: 4rem;
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface-alt);
		color: inherit;
		font: inherit;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.scoreNumber:hover,
	.scoreNumber:focus-visible {
		border-color: var(--color-accent);
	}

	.radioGroup {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.radio {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.hint {
		margin: var(--space-2) 0 0;
		color: var(--color-text-faint);
		font-size: var(--text-xs);
	}

	.search {
		width: 100%;
		margin-top: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface-alt);
		color: inherit;
		font: inherit;
		font-size: var(--text-sm);
	}

	.search:hover,
	.search:focus-visible {
		border-color: var(--color-accent);
	}

	.pickerHeader {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.pickerToggle {
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface-alt);
		color: inherit;
		font: inherit;
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.pickerToggle:hover {
		border-color: var(--color-accent);
	}

	.favoriteCount {
		padding: 0;
		border: none;
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-size: var(--text-sm);
		text-decoration: underline;
		text-decoration-color: transparent;
		cursor: pointer;
	}

	.favoriteCount:hover,
	.favoriteCount:focus-visible {
		color: var(--color-accent);
		text-decoration-color: currentColor;
	}

	.channelCount {
		padding: 0;
		border: none;
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-size: var(--text-sm);
	}

	.selectedChips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-1) var(--space-1) var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		font-size: var(--text-sm);
	}

	.chipRemove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.1rem;
		height: 1.1rem;
		padding: 0;
		border: none;
		border-radius: var(--radius-full);
		background: none;
		color: var(--color-text-faint);
		font-size: var(--text-sm);
		line-height: 1;
		cursor: pointer;
	}

	.chipRemove:hover {
		background: var(--color-border);
		color: var(--color-text);
	}

	.teamGroups {
		max-height: 14rem;
		margin-top: var(--space-2);
		overflow-y: auto;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-2) var(--space-3);
	}

	.subdivision:not(:last-child) {
		margin-bottom: var(--space-3);
	}

	.subdivision h3 {
		margin: 0 0 var(--space-1);
		color: var(--color-text-faint);
		font-size: var(--text-xs);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.conference summary {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) 0;
		list-style: none;
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
	}

	.conference summary::-webkit-details-marker {
		display: none;
	}

	.conference h4 {
		margin: var(--space-2) 0 var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.conference .count {
		color: var(--color-text-faint);
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
	}

	.teamList {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		padding: 0 0 var(--space-2);
	}

	.teamCheckbox {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.empty {
		margin: 0;
		color: var(--color-text-faint);
		font-size: var(--text-sm);
	}

	.boostRow {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-3);
		font-size: var(--text-sm);
	}
</style>
