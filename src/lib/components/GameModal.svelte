<script lang="ts">
	import TeamLogo from './TeamLogo.svelte';
	import { broadcastLink } from '$lib/game/broadcastLinks';
	import {
		formatConferenceName,
		formatKickoffDate,
		formatKickoffTime,
		formatMoneyline,
		formatRecord,
		formatSpread,
		formatStatusLine,
		formatVenue,
		formatWinProbability
	} from '$lib/format';
	import type { ConferenceMap } from '$lib/game/conferences';
	import { matchupScore, matchupScoreColor, teamStrength, type RatingMap } from '$lib/game/ratings';
	import { winProbBarColors } from '$lib/game/teamColors';
	import type { Game } from '$lib/game/types';
	import { winsipediaLink } from '$lib/game/winsipediaLink';

	let {
		game,
		onClose,
		conferences,
		ratings
	}: { game: Game | null; onClose: () => void; conferences: ConferenceMap; ratings: RatingMap } =
		$props();

	let dialogEl: HTMLDialogElement | undefined = $state();

	// The dialog element outlives any one game — only open/close in response to
	// `game` changing, never re-render its guts out from under an open modal.
	$effect(() => {
		if (game) {
			dialogEl?.showModal();
		} else {
			dialogEl?.close();
		}
	});

	const showScore = $derived(
		game ? game.status.state !== 'pre' && !game.status.canceled && !game.status.postponed : false
	);
	const isLive = $derived(game?.status.state === 'in');
	const statusLine = $derived(game ? formatStatusLine(game) : '');
	const venue = $derived(game ? formatVenue(game) : undefined);
	const spreadText = $derived(game ? formatSpread(game) : undefined);
	const moneylineText = $derived.by(() => {
		if (!game) return undefined;
		const parts = game.teams
			.map((team) => {
				const value = formatMoneyline(game.odds, team);
				return value ? `${team.abbreviation || team.location} ${value}` : undefined;
			})
			.filter((part): part is string => part !== undefined);
		return parts.length === 2 ? parts.join(' · ') : undefined;
	});
	const matchup = $derived(game ? matchupScore(game, ratings) : null);
	const winsipedia = $derived(game ? winsipediaLink(game) : undefined);
	// Once the game is live or final, the actual score speaks for itself — a
	// pregame odds snapshot would be stale and misleading next to it.
	const winProb = $derived(
		game &&
			game.status.state === 'pre' &&
			game.odds?.homeWinPct !== undefined &&
			game.odds?.awayWinPct !== undefined
			? { home: game.odds.homeWinPct, away: game.odds.awayWinPct }
			: undefined
	);
	const winProbColors = $derived(game ? winProbBarColors(game.home, game.away) : undefined);
</script>

<dialog
	bind:this={dialogEl}
	class="modal"
	onclose={onClose}
	onclick={(event) => {
		// The dialog's box shrink-wraps .content exactly, so a click that lands on
		// the dialog itself (rather than bubbling up from a descendant) can only be
		// a click on the ::backdrop — the standard native-<dialog> light-dismiss check.
		if (event.target === dialogEl) onClose();
	}}
>
	{#if game}
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

			{#if game.eventName}
				<p class="event">{game.eventName}</p>
			{/if}

			<p class="conferenceGame">{game.conferenceGame ? 'Conference game' : 'Non-conference game'}</p>

			<p class="status" class:live={isLive}>{statusLine}</p>

			<div class="teams">
				{#each game.teams as team, i (team.homeAway)}
					<div class="team" class:winner={team.isWinner === true}>
						<TeamLogo {team} size={56} />
						<span class="name">
							{#if team.rank}<span class="rank">{team.rank}</span>{/if}
							{team.location}
						</span>
						<div class="meta">
							{#if formatRecord(team)}
								<span class="record">{formatRecord(team)}</span>
							{:else}
								<span class="record missing fallback-full">Record not available</span>
								<span class="record missing fallback-short">Record not found</span>
							{/if}
							{#if formatConferenceName(team, conferences)}
								<span class="conference">{formatConferenceName(team, conferences)}</span>
							{:else}
								<span class="conference missing fallback-full">Conference not available</span>
								<span class="conference missing fallback-short">Conf not found</span>
							{/if}
							<span class="strength">Strength {teamStrength(team, ratings)}</span>
							{#if winProb && formatWinProbability(game.odds, team)}
								<span class="winPct">{formatWinProbability(game.odds, team)} to win</span>
							{/if}
						</div>
					</div>
					{#if i === 0 && showScore}
						<div class="scoreCenter">
							<span class="score" class:winner={game.teams[0].isWinner === true}>
								{game.teams[0].score ?? '–'}
							</span>
							<span class="scoreDash">–</span>
							<span class="score" class:winner={game.teams[1].isWinner === true}>
								{game.teams[1].score ?? '–'}
							</span>
						</div>
					{/if}
				{/each}
			</div>

			{#if winProb && winProbColors}
				<div class="winProbBar" title="Win probability">
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
				</div>
			{/if}

			<dl class="details">
				{#if matchup !== null}
					<div>
						<dt>Matchup score</dt>
						<dd>
							<span class="matchupScore" style:background={matchupScoreColor(matchup)}>
								{matchup}
							</span>
						</dd>
					</div>
				{/if}
				<div>
					<dt>Kickoff</dt>
					<dd>{formatKickoffDate(game.kickoff)} · {formatKickoffTime(game)}</dd>
				</div>
				{#if game.broadcasts.length}
					<div>
						<dt>Broadcast</dt>
						<dd>
							{#each game.broadcasts as name, i (name)}
								{#if i > 0}<span class="dot">·</span>{/if}
								{@const link = broadcastLink(name, game)}
								{#if link}
									<a href={link} target="_blank" rel="noopener noreferrer">{name}</a>
								{:else}
									{name}
								{/if}
							{/each}
						</dd>
					</div>
				{/if}
				{#if venue}
					<div>
						<dt>Location</dt>
						<dd>{game.neutralSite ? `Neutral site · ${venue}` : venue}</dd>
					</div>
				{/if}
				<div>
					<dt>Betting</dt>
					<dd>
						{#if spreadText || game.odds?.overUnder !== undefined}
							{#if spreadText}{spreadText}{/if}
							{#if spreadText && game.odds?.overUnder !== undefined}
								<span class="dot">·</span>
							{/if}
							{#if game.odds?.overUnder !== undefined}O/U {game.odds.overUnder}{/if}
						{:else}
							<span class="muted">Not available</span>
						{/if}
					</dd>
				</div>
				{#if moneylineText}
					<div>
						<dt>Moneyline</dt>
						<dd>{moneylineText}</dd>
					</div>
				{/if}
			</dl>

			<p class="linksHeading">ESPN links</p>
			<div class="links">
				<a href={game.espnUrl} target="_blank" rel="noopener noreferrer">Gamecast</a>
				{#if game.status.state !== 'pre'}
					<a
						href={`https://www.espn.com/college-football/boxscore/_/gameId/${game.id}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						Box Score
					</a>
				{/if}
				{#each game.teams as team (team.homeAway)}
					{#if team.location !== 'TBD'}
						<a
							href={`https://www.espn.com/college-football/team/_/id/${team.id}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							{team.location}
						</a>
					{/if}
				{/each}
			</div>

			{#if winsipedia}
				<p class="linksHeading">History</p>
				<div class="links">
					<a href={winsipedia} target="_blank" rel="noopener noreferrer">
						Winsipedia: all-time series
					</a>
				</div>
			{/if}
		</div>
	{/if}
</dialog>

<style>
	.modal {
		width: min(28rem, calc(100vw - 2rem));
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

	.event {
		margin: 0 0 var(--space-2);
		padding-inline: 2.5rem;
		color: var(--color-accent);
		font-size: var(--text-sm);
		font-weight: 600;
		text-align: center;
	}

	.conferenceGame {
		margin: 0 0 var(--space-2);
		padding-inline: 2.5rem;
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		text-align: center;
	}

	.status {
		margin: 0 0 var(--space-3);
		padding-inline: 2.5rem;
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-weight: 600;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.status.live {
		color: var(--color-live);
	}

	.teams {
		display: flex;
		justify-content: space-around;
		gap: var(--space-3);
		margin-bottom: var(--space-2);
	}

	.winProbBar {
		margin: 0 0 var(--space-4);
	}

	.winProbBar .bar {
		display: flex;
		height: 10px;
		overflow: hidden;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
	}

	.team {
		display: flex;
		flex: 1 1 0;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		min-width: 0;
		text-align: center;
	}

	.team :global(.logo),
	.team :global(.fallback) {
		margin-bottom: var(--space-1);
	}

	.name {
		min-width: 0;
		font-weight: 600;
		overflow-wrap: break-word;
	}

	.winner .name {
		font-weight: 700;
	}

	.rank {
		margin-right: var(--space-1);
		color: var(--color-text-faint);
		font-size: var(--text-xs);
		font-weight: 700;
	}

	.meta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
		margin-top: -2px;
		line-height: 1.25;
	}

	/* Keep every stat to a single line so a long fallback string can't wrap and
	   push that team's rows out of alignment with the other team's. */
	.meta > span {
		white-space: nowrap;
	}

	.conference {
		color: var(--color-text-faint);
		font-size: var(--text-xs);
	}

	.record {
		color: var(--color-text-faint);
		font-size: var(--text-xs);
	}

	.strength {
		color: var(--color-text-faint);
		font-size: var(--text-xs);
	}

	.missing {
		font-style: italic;
	}

	.fallback-short {
		display: none;
	}

	/* Swap in the shorter fallback wording once the modal itself is this narrow. */
	@media (max-width: 480px) {
		.fallback-full {
			display: none;
		}

		.fallback-short {
			display: inline;
		}
	}

	.matchupScore {
		padding: 0 var(--space-2);
		border-radius: var(--radius-sm);
		/* Background is set inline per-score (see matchupScoreColor); the fill is
		   fixed rather than theme-dependent, so the text ink stays fixed too. */
		color: #1a1a1a;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.winPct {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: 600;
	}

	.scoreCenter {
		display: flex;
		align-items: center;
		align-self: flex-start;
		gap: var(--space-1);
		height: 56px;
		margin-inline: calc(var(--space-3) * -1);
		font-family: var(--font-numeric);
		font-size: var(--text-3xl);
		font-variant-numeric: tabular-nums;
	}

	.score.winner {
		font-weight: 700;
	}

	.scoreDash {
		color: var(--color-text-faint);
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0 0 var(--space-4);
		padding: var(--space-3) 0;
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
		font-size: var(--text-sm);
	}

	.details > div {
		display: flex;
		justify-content: space-between;
		gap: var(--space-3);
	}

	dt {
		color: var(--color-text-muted);
	}

	dd {
		margin: 0;
		text-align: right;
	}

	dd a {
		color: var(--color-accent);
	}

	dd a:hover {
		text-decoration: underline;
	}

	.dot {
		margin: 0 var(--space-1);
	}

	.muted {
		color: var(--color-text-faint);
		font-style: italic;
	}

	.linksHeading {
		margin: var(--space-3) 0 var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: 600;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-1) var(--space-3);
		font-size: var(--text-sm);
	}

	.links a {
		color: var(--color-accent);
	}

	.links a:hover {
		text-decoration: underline;
	}
</style>
