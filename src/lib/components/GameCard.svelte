<script lang="ts">
	import TeamRow from './TeamRow.svelte';
	import {
		formatBroadcasts,
		formatGameDate,
		formatKickoffTime,
		formatSpread,
		formatStatusLine,
		formatVenue,
		formatWinProbability
	} from '$lib/format';
	import { matchupScore, matchupScoreColor, type RatingMap } from '$lib/game/ratings';
	import { settings } from '$lib/game/settings.svelte';
	import { winProbBarColors } from '$lib/game/teamColors';
	import type { Game } from '$lib/game/types';

	let {
		game,
		ratings,
		showDate = false,
		onSelect
	}: { game: Game; ratings: RatingMap; showDate?: boolean; onSelect: (game: Game) => void } =
		$props();

	// Scores only exist once a game has started, and are meaningless for games
	// that never finished.
	const showScore = $derived(
		game.status.state !== 'pre' && !game.status.canceled && !game.status.postponed
	);
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

	// Only shown once there's room to the right of the (now width-capped)
	// matchup column — see `.side` below.
	const venueText = $derived(formatVenue(game));
	const context = $derived(
		[game.conferenceGame ? 'Conference game' : 'Non-conference game', game.neutralSite ? 'Neutral site' : undefined]
			.filter((part): part is string => Boolean(part))
			.join(' · ')
	);
	// Both win-pct fields come from the same moneyline pair, so either both are
	// present or neither is (see `GameOdds.homeWinPct`). Once the game is live
	// or final, the actual score speaks for itself — a pregame odds snapshot
	// would be stale and misleading next to it.
	const winProb = $derived(
		game.status.state === 'pre' &&
			game.odds?.homeWinPct !== undefined &&
			game.odds?.awayWinPct !== undefined
			? { home: game.odds.homeWinPct, away: game.odds.awayWinPct }
			: undefined
	);
	const winProbColors = $derived(winProbBarColors(game.home, game.away));
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

	<div class="right">
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

		<div class="side">
			{#if winProb}
				<div class="winProb" title="Win probability">
					<div class="bar">
						<span
							class="segment"
							style:width="{winProb.away}%"
							style:background={winProbColors.away}
						></span>
						<span
							class="segment"
							style:width="{winProb.home}%"
							style:background={winProbColors.home}
						></span>
					</div>
					<div class="winProbLabels">
						<span>{game.away.abbreviation || game.away.location} {formatWinProbability(game.odds, game.away)}</span>
						<span>{game.home.abbreviation || game.home.location} {formatWinProbability(game.odds, game.home)}</span>
					</div>
				</div>
			{/if}
			<p class="context">{context}</p>
			{#if venueText}
				<p class="venue">{venueText}</p>
			{/if}
		</div>
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
		border-left-color: var(--color-favorite);
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

	.right {
		display: flex;
		gap: var(--space-4);
		min-width: 0;
	}

	.matchup {
		display: flex;
		flex-direction: column;
		flex: none;
		gap: var(--space-1);
		width: 100%;
		max-width: 18rem;
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

	/*
	 * Freed-up space to the right of the (width-capped) matchup column, once
	 * the card is wide enough for the page to have already hit --content-width
	 * — below that, the matchup column needs the full row to itself.
	 */
	.side {
		display: none;
	}

	@media (min-width: 46rem) {
		.side {
			display: flex;
			flex: 1 1 auto;
			flex-direction: column;
			justify-content: center;
			gap: var(--space-1);
			min-width: 0;
			padding-top: 2px;
			color: var(--color-text-faint);
			font-size: var(--text-xs);
		}
	}

	.winProb {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin-bottom: var(--space-1);
	}

	.bar {
		display: flex;
		height: 6px;
		overflow: hidden;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
	}

	.winProbLabels {
		display: flex;
		justify-content: space-between;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.context,
	.venue {
		margin: 0;
	}
</style>
