<script lang="ts">
	import TeamLogo from './TeamLogo.svelte';
	import cfpIcon from '$lib/assets/cfp.svg';
	import { formatRecord, formatTeamSpread } from '$lib/format';
	import { formatPlayoffOdds } from '$lib/game/playoffOdds';
	import { settings } from '$lib/game/settings.svelte';
	import type { GameOdds, GameTeam } from '$lib/game/types';

	let {
		team,
		odds,
		showScore = false,
		hasPossession = false,
		possessionInferredReason,
		playoffOdds
	}: {
		team: GameTeam;
		odds?: GameOdds;
		showScore?: boolean;
		hasPossession?: boolean;
		possessionInferredReason?: 'after-score' | 'timeout';
		/** Chance (0-100) to make the playoff; only passed for probable playoff teams. */
		playoffOdds?: number;
	} = $props();

	const possessionTitle = $derived(
		possessionInferredReason === 'after-score'
			? 'Likely receiving the kickoff'
			: possessionInferredReason === 'timeout'
				? 'Has possession (unconfirmed, inferred from timeout)'
				: 'Has possession'
	);

	const record = $derived(formatRecord(team));
	const spread = $derived(formatTeamSpread(odds, team));
	// Only dim the loser once a result exists, and never on a tie.
	const isLoser = $derived(showScore && team.isWinner === false);
	const isFavorite = $derived(settings.favoriteTeamIds.includes(team.id));
</script>

<div class="team" class:winner={team.isWinner === true} class:loser={isLoser}>
	<TeamLogo {team} />

	<span class="identity">
		<span class="line">
			{#if team.rank}
				<span class="rank">{team.rank}</span>
			{/if}
			<span class="name">{team.location}</span>
			{#if spread}
				<span class="spread">{spread}</span>
			{/if}
			{#if hasPossession}
				<span
					class="possession"
					class:after-score={possessionInferredReason === 'after-score'}
					title={possessionTitle}
				>
					🏈
				</span>
			{/if}
			{#if playoffOdds !== undefined}
				<img
					class="playoffIcon"
					src={cfpIcon}
					alt="Playoff implications"
					title="Playoff odds: {formatPlayoffOdds(playoffOdds)}"
				/>
			{/if}
			{#if isFavorite}
				<span class="favorite" title="Favorite team">★</span>
			{/if}
		</span>
		{#if record}
			<span class="record">{record}</span>
		{/if}
	</span>

	{#if showScore}
		<span class="score">{team.score ?? '–'}</span>
	{/if}
</div>

<style>
	.team {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
	}

	.identity {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-width: 0;
	}

	.line {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		min-width: 0;
	}

	.rank {
		flex: none;
		color: var(--color-text-faint);
		font-size: var(--text-xs);
		font-weight: 700;
	}

	.favorite {
		flex: none;
		color: var(--color-favorite);
		font-size: var(--text-xs);
	}

	/* Sized to the team name's text, so it adds no height to the row. */
	.playoffIcon {
		flex: none;
		width: 0.8em;
		height: 0.8em;
		align-self: center;
		position: relative;
		top: 0.05em;
	}

	/* Tuck the star in next to the icon: replaces the row's gap with a smaller one. */
	.playoffIcon + .favorite {
		margin-left: calc(var(--space-1) - var(--space-2));
	}

	.possession {
		flex: none;
		font-size: var(--text-xs);
	}

	/* A prediction of who receives the coming kickoff, not a confirmed snap. */
	.possession.after-score {
		opacity: 0.55;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.winner .name {
		font-weight: 700;
	}

	.loser {
		color: var(--color-text-muted);
	}

	.spread {
		flex: none;
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: 600;
	}

	.record {
		flex: none;
		color: var(--color-text-faint);
		font-size: var(--text-xs);
	}

	.score {
		margin-left: auto;
		padding-left: var(--space-2);
		font-family: var(--font-numeric);
		font-size: var(--text-lg);
		font-variant-numeric: tabular-nums;
	}

	.winner .score {
		font-weight: 700;
	}
</style>
