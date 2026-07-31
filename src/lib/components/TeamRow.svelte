<script lang="ts">
	import TeamLogo from './TeamLogo.svelte';
	import { formatRecord, formatTeamSpread } from '$lib/format';
	import { settings } from '$lib/game/settings.svelte';
	import type { GameOdds, GameTeam } from '$lib/game/types';

	let {
		team,
		odds,
		showScore = false
	}: {
		team: GameTeam;
		odds?: GameOdds;
		showScore?: boolean;
	} = $props();

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
