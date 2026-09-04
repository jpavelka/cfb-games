<script lang="ts">
	import TeamRow from './TeamRow.svelte';
	import matchupIcon from '$lib/assets/matchup.svg';
	import scoreboardIcon from '$lib/assets/scoreboard.svg';
	import surpriseIcon from '$lib/assets/surprised.svg';
	import {
		formatBroadcasts,
		formatConferenceContext,
		formatFieldPosition,
		formatGameDate,
		formatKickoffTime,
		formatPeriodLabels,
		formatSpread,
		formatStatusLine,
		formatVenue,
		formatWinProbability
	} from '$lib/format';
	import { matchupScore, matchupScoreColor, type RatingMap } from '$lib/game/ratings';
	import { isDarkMode, settings } from '$lib/game/settings.svelte';
	import { situationScore, situationScoreColor } from '$lib/game/situationScore';
	import { liveSurpriseScore, surpriseScore, surpriseScoreColor } from '$lib/game/surprise';
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
	// `surpriseScore` only returns non-null once a game is final, `liveSurpriseScore`
	// only while one is in progress — never both, so this always reflects the
	// game's current state without needing to branch on it here.
	const surprise = $derived(surpriseScore(game) ?? liveSurpriseScore(game));
	const situation = $derived(isLive ? situationScore(game) : null);
	const hasFavorite = $derived(
		game.teams.some((team) => settings.favoriteTeamIds.includes(team.id))
	);
	// Matchup score badge shows the boost actually applied to this game's sort
	// position — not just "a favorite is playing" — so it stays silent when
	// `favoriteHandling` is 'top' or 'none', where the score itself is untouched.
	const showBoost = $derived(hasFavorite && settings.favoriteHandling === 'boost');

	// Only shown once there's room to the right of the (now width-capped)
	// matchup column — see `.side` below.
	const venueText = $derived(formatVenue(game));
	const context = $derived(
		[formatConferenceContext(game), game.neutralSite ? 'Neutral site' : undefined]
			.filter((part): part is string => Boolean(part))
			.join(' · ')
	);
	const fieldPosition = $derived(isLive ? formatFieldPosition(game) : undefined);
	// Splits "2nd & 7" into "2" + "nd" (superscripted, see `.ordinal`) + " & 7" —
	// purely typographic, so it stays here rather than in `formatFieldPosition`.
	const downOrdinal = $derived.by(() => {
		const match = fieldPosition?.downDistance.match(/^(\d+)(st|nd|rd|th)(.*)$/);
		if (!match) return undefined;
		const [, number, suffix, rest] = match;
		return { number, suffix, rest };
	});
	// Pregame-only and live-only — the card only ever has room for one win-prob
	// bar at a time, and a game is never both, so these two never compete for
	// the same slot. (The modal, which has room for both at once, keeps them
	// fully independent instead — see GameModal.svelte.)
	const pregameWinProb = $derived(
		game.status.state === 'pre' && game.odds?.homeWinPct !== undefined && game.odds?.awayWinPct !== undefined
			? { home: game.odds.homeWinPct, away: game.odds.awayWinPct }
			: undefined
	);
	const liveWinProb = $derived(
		isLive && game.situation?.homeWinPct !== undefined && game.situation?.awayWinPct !== undefined
			? { home: game.situation.homeWinPct, away: game.situation.awayWinPct }
			: undefined
	);
	const winProbColors = $derived(winProbBarColors(game.home, game.away));

	// Quarter-by-quarter score, once a game is complete. `.length` on both sides
	// guards the (very rare) case where ESPN omits linescores for one competitor.
	const periodScores = $derived(
		game.status.state === 'post' && game.away.periodScores?.length && game.home.periodScores?.length
			? { away: game.away.periodScores, home: game.home.periodScores }
			: undefined
	);
	const periodLabels = $derived(
		periodScores
			? formatPeriodLabels(Math.max(periodScores.away.length, periodScores.home.length))
			: undefined
	);
</script>

<button type="button" class="card" class:favorite={hasFavorite} onclick={() => onSelect(game)}>
	<div class="time" class:live={isLive} class:tbd={game.kickoffTbd}>
		{#if showDate && !isLive}
			<span class="date">{formatGameDate(game)}</span>
		{/if}
		<span class="kickoff">{showScore ? statusLine : formatKickoffTime(game)}</span>
		{#if fieldPosition}
			<p class="downDistance">
				{#if downOrdinal}
					{downOrdinal.number}<sup class="ordinal">{downOrdinal.suffix}</sup>{downOrdinal.rest}
				{:else}
					{fieldPosition.downDistance}
				{/if}
				<span class="yardLine">{fieldPosition.yardLine}</span>
			</p>
		{/if}
		{#if matchup !== null}
			<span class="scoreBadge" title="Matchup score">
				<img class="scoreIcon" src={matchupIcon} alt="" />
				<span class="matchupScore" style:background={matchupScoreColor(matchup)}>{matchup}</span>
				{#if showBoost}
					<span class="boost" title="Favorite team boost">+{settings.favoriteBoostAmount}</span>
				{/if}
			</span>
		{/if}
		{#if isLive}
			<span class="scoreBadge" title="Situation score">
				<img
					class="scoreIcon"
					class:inverted={isDarkMode()}
					src={scoreboardIcon}
					alt=""
				/>
				<span class="matchupScore" style:background={situationScoreColor(situation ?? 0)}
					>{situation ?? '–'}</span
				>
			</span>
		{/if}
		{#if showScore}
			<span class="scoreBadge" title={'Surprise score'}>
				<img class="scoreIcon" src={surpriseIcon} alt="" />
				<span class="matchupScore" style:background={surpriseScoreColor(surprise ?? 0)}
					>{surprise ?? '–'}</span
				>
			</span>
		{/if}
	</div>

	<div class="right">
		<div class="matchup">
			{#if game.eventName}
				<p class="event">{game.eventName}</p>
			{/if}

			{#each game.teams as team (team.homeAway)}
				<TeamRow
					{team}
					odds={game.odds}
					{showScore}
					hasPossession={isLive && team.id === game.situation?.possessionTeamId}
					possessionInferredReason={game.situation?.possessionInferredReason}
				/>
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
			{#if pregameWinProb}
				<div class="winProb" title="Pregame win probability">
					<div class="bar">
						<span
							class="segment"
							style:width="{pregameWinProb.away}%"
							style:background={winProbColors.away}
						></span>
						<span
							class="segment"
							style:width="{pregameWinProb.home}%"
							style:background={winProbColors.home}
						></span>
					</div>
					<div class="teamWinProbLabels">
						<span>{game.away.abbreviation || game.away.location} {formatWinProbability(pregameWinProb.away)}</span>
						<span class="winProbLabel">Projected Winner</span>
						<span>{game.home.abbreviation || game.home.location} {formatWinProbability(pregameWinProb.home)}</span>
					</div>
				</div>
			{/if}
			{#if liveWinProb}
				<div class="winProb" title="Live win probability">
					<div class="bar">
						<span
							class="segment"
							style:width="{liveWinProb.away}%"
							style:background={winProbColors.away}
						></span>
						<span
							class="segment"
							style:width="{liveWinProb.home}%"
							style:background={winProbColors.home}
						></span>
					</div>
					<div class="teamWinProbLabels">
						<span>{game.away.abbreviation || game.away.location} {formatWinProbability(liveWinProb.away)}</span>
						<span class="winProbLabel live">Live Win Probability</span>
						<span>{game.home.abbreviation || game.home.location} {formatWinProbability(liveWinProb.home)}</span>
					</div>
				</div>
			{/if}
			{#if periodScores && periodLabels}
				<div class="linescoreScroll">
					<table class="linescore" title="Score by quarter">
						<thead>
							<tr>
								<th class="teamCol"></th>
								{#each periodLabels as label (label)}
									<th>{label}</th>
								{/each}
								<th class="totalCol">T</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<th class="teamCol" scope="row">{game.away.abbreviation || game.away.location}</th>
								{#each periodLabels as _, index (index)}
									<td>{periodScores.away[index] ?? '–'}</td>
								{/each}
								<td class="totalCol">{game.away.score}</td>
							</tr>
							<tr>
								<th class="teamCol" scope="row">{game.home.abbreviation || game.home.location}</th>
								{#each periodLabels as _, index (index)}
									<td>{periodScores.home[index] ?? '–'}</td>
								{/each}
								<td class="totalCol">{game.home.score}</td>
							</tr>
						</tbody>
					</table>
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
		font-weight: 600;
	}

	.scoreBadge {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.matchupScore {
		padding: 0 var(--space-1);
		border-radius: var(--radius-sm);
		/* Background is set inline per-score (see matchupScoreColor/
		   surpriseScoreColor); the fill is fixed rather than theme-dependent, so
		   the text ink stays fixed too. */
		color: #1a1a1a;
		font-size: var(--text-xs);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.scoreIcon {
		width: 16px;
		height: 16px;
	}

	/* The situation icon is a solid black silhouette (unlike the full-color
	   matchup/surprise icons), so it disappears against a dark background
	   without this — see `isDarkMode()` in GameCard's script. */
	.scoreIcon.inverted {
		filter: invert(1);
	}

	.boost {
		color: var(--color-favorite);
		font-size: 0.65rem;
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
		.right {
			gap: var(--space-3);
		}

		.side {
			display: flex;
			flex: 1 1 auto;
			flex-direction: column;
			justify-content: center;
			gap: var(--space-1);
			min-width: 0;
			padding-top: 2px;
			padding-left: var(--space-3);
			border-left: 1px solid var(--color-border);
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

	.winProbLabel {
		color: var(--color-text-faint);
		font-size: var(--text-xs);
		font-weight: 200;
		opacity: 0.9;
	}

	.winProbLabel.live {
		color: var(--color-live);
		font-weight: 600;
		opacity: 1;
	}

	.bar {
		display: flex;
		height: 6px;
		overflow: hidden;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
	}

	.teamWinProbLabels {
		display: flex;
		justify-content: space-between;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	/* Scrolls horizontally rather than wrapping/shrinking columns when a game
	   has gone to enough overtimes to outgrow `.side`'s width. */
	.linescoreScroll {
		overflow-x: auto;
		margin-bottom: var(--space-1);
	}

	.linescore {
		border-collapse: collapse;
		table-layout: fixed;
		font-variant-numeric: tabular-nums;
	}

	/* Fixed, equal-width period columns so scores line up under their header
	   regardless of digit count — with the default auto layout, each column
	   sized to its own widest content, so the gap before each (right-aligned)
	   number varied column to column. */
	.linescore th,
	.linescore td {
		width: 1.5em;
		padding: 0 5pt;
		font-weight: 400;
		text-align: center;
	}

	/* Pinned to the left edge of the scroll container so the team abbreviation
	   stays visible no matter how far a many-overtime game scrolls. */
	.linescore .teamCol {
		position: sticky;
		left: 0;
		width: 2.75em;
		padding-right: var(--space-2);
		background: var(--color-surface);
		text-align: left;
		white-space: nowrap;
	}

	/* Pinned to the right edge of the scroll container so the final score stays
	   visible no matter how far a many-overtime game scrolls. */
	.linescore .totalCol {
		position: sticky;
		right: 0;
		padding-left: var(--space-2);
		border-left: 1px solid var(--color-border);
		background: var(--color-surface);
		font-weight: 600;
	}

	.linescore thead th {
		padding-bottom: 2px;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-faint);
	}

	.linescore tbody th {
		font-weight: 600;
	}

	.downDistance {
		margin: 0;
		font-size: var(--text-xs);
		font-weight: 600;
	}

	.ordinal {
		font-size: 0.7em;
	}

	.yardLine {
		font-size: 0.9em;
		color: var(--color-text-faint);
	}

	.context,
	.venue {
		margin: 0;
	}
</style>
