<script lang="ts">
	import TeamRow from './TeamRow.svelte';
	import {
		formatBroadcasts,
		formatGameDate,
		formatKickoffTime,
		formatSpread,
		formatStatusLine
	} from '$lib/format';
	import { matchupScore, matchupScoreColor, type RatingMap } from '$lib/game/ratings';
	import { settings } from '$lib/game/settings.svelte';
	import type { Game } from '$lib/game/types';

	let {
		game,
		ratings,
		showDate = false,
		onSelect
	}: { game: Game; ratings: RatingMap; showDate?: boolean; onSelect: (game: Game) => void } =
		$props();

	// Scores only exist once a game has started.
	const showScore = $derived(game.status.state !== 'pre');
	const isLive = $derived(game.status.state === 'in');
	const statusLine = $derived(formatStatusLine(game));
	const broadcasts = $derived(formatBroadcasts(game));
	// A real (non-zero) spread now shows on the favored team's own row instead;
	// this only carries "Even" or ESPN's raw text when there's no team to pin it to.
	const spread = $derived(game.odds?.spread ? undefined : formatSpread(game));

	const meta = $derived([broadcasts, spread].filter((part): part is string => Boolean(part)));
	const matchup = $derived(matchupScore(game, ratings));
	const hasFavorite = $derived(
		game.teams.some((team) => settings.favoriteTeamIds.includes(team.id))
	);
</script>

<button type="button" class="card" class:favorite={hasFavorite} onclick={() => onSelect(game)}>
	<div class="time" class:live={isLive} class:tbd={game.kickoffTbd}>
		{#if showDate}
			<span class="date">{formatGameDate(game)}</span>
		{/if}
		<span class="kickoff">{showScore ? statusLine : formatKickoffTime(game)}</span>
		{#if isLive}
			<span class="badge">Live</span>
		{/if}
		{#if matchup !== null}
			<span class="matchupScore" style:background={matchupScoreColor(matchup)} title="Matchup score">
				{matchup}
			</span>
		{/if}
	</div>

	<div class="matchup">
		{#if game.eventName}
			<p class="event">{game.eventName}</p>
		{/if}

		{#each game.teams as team (team.homeAway)}
			<TeamRow {team} odds={game.odds} {showScore} />
		{/each}

		{#if meta.length}
			<p class="meta">
				{#each meta as part, index (part)}
					{#if index > 0}<span class="dot">·</span>{/if}{part}
				{/each}
			</p>
		{/if}
	</div>
</button>

<style>
	.card {
		display: grid;
		grid-template-columns: 4.5rem 1fr;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition:
			border-color var(--transition),
			box-shadow var(--transition);
	}

	.card.favorite {
		border-left-color: var(--color-accent);
	}

	.card:hover {
		border-color: var(--color-accent);
		box-shadow: var(--shadow-sm);
	}

	.time {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
		padding-top: 2px;
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}

	.date {
		color: var(--color-text-faint);
		font-size: var(--text-xs);
		font-weight: 600;
	}

	.time.tbd .kickoff {
		color: var(--color-text-faint);
		font-style: italic;
	}

	.time.live {
		color: var(--color-live);
		font-weight: 600;
	}

	.badge {
		padding: 0 var(--space-1);
		border-radius: var(--radius-sm);
		background: var(--color-live-bg);
		color: var(--color-live);
		font-size: var(--text-xs);
		font-weight: 700;
		text-transform: uppercase;
	}

	.matchupScore {
		padding: 0 var(--space-1);
		border-radius: var(--radius-sm);
		/* Background is set inline per-score (see matchupScoreColor); the fill is
		   fixed rather than theme-dependent, so the text ink stays fixed too. */
		color: #1a1a1a;
		font-size: var(--text-xs);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.matchup {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.event {
		margin: 0 0 var(--space-1);
		color: var(--color-accent);
		font-size: var(--text-xs);
		font-weight: 600;
	}

	.meta {
		margin: var(--space-1) 0 0;
		color: var(--color-text-faint);
		font-size: var(--text-xs);
	}

	.dot {
		margin: 0 var(--space-1);
	}
</style>
