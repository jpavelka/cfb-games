import type { Subdivision } from '$lib/espn/client';
import type { Game, GameOdds, GameState, GameTeam, Scoreboard, WeekInfo } from './types';

/**
 * The on-disk/wire contract between `server/` (writes this to GCS) and
 * `loadStoredScoreboard` in `storage.ts` (reads it back) — deliberately smaller
 * than the live `Scoreboard`/`Game` models used everywhere else in the app.
 *
 * Two kinds of trimming, both checked against every component and util that reads
 * a `Game` before removing anything (see the field-by-field audit that produced
 * this list):
 *
 *  - `Scoreboard.weeks` (the full season's week-picker list) and `skippedCount` are
 *    dropped entirely. `weeks` is calendar/navigation metadata, not this week's
 *    game data — storing it would duplicate the same ~20-entry list verbatim in
 *    every week's file. `skippedCount` is computed by `toScoreboard()` but never
 *    rendered anywhere.
 *  - A handful of per-game/per-team fields are set by `toGame()` in `transform.ts`
 *    but never read by any component: `Game.name`, `status.completed`,
 *    `status.detail`, `venue.indoor`, `odds.provider`, `GameTeam.altColor`,
 *    `GameTeam.isOddsFavorite`.
 *
 * If a component starts needing one of the dropped fields, add it back here first
 * — don't just widen this back to `Scoreboard`/`Game` wholesale.
 */

export interface StoredGameStatus {
	state: GameState;
	description: string;
	shortDetail: string;
	period?: number;
	displayClock?: string;
	canceled: boolean;
	postponed: boolean;
}

export interface StoredGameTeam {
	id: string;
	homeAway: 'home' | 'away';
	location: string;
	name?: string;
	displayName: string;
	abbreviation: string;
	logoUrl?: string;
	darkLogoUrl?: string;
	color?: string;
	rank?: number;
	record?: string;
	conferenceRecord?: string;
	conferenceId?: string;
	score?: number;
	isWinner?: boolean;
}

export interface StoredGameOdds {
	spread?: number;
	overUnder?: number;
	favoriteHomeAway?: 'home' | 'away';
	details?: string;
	moneylineHome?: number;
	moneylineAway?: number;
	homeWinPct?: number;
	awayWinPct?: number;
}

export interface StoredGameVenue {
	name?: string;
	city?: string;
	state?: string;
	country?: string;
}

export interface StoredGame {
	id: string;
	shortName: string;
	kickoff: Date;
	kickoffTbd: boolean;
	status: StoredGameStatus;
	away: StoredGameTeam;
	home: StoredGameTeam;
	teams: readonly [StoredGameTeam, StoredGameTeam];
	broadcasts: string[];
	venue?: StoredGameVenue;
	neutralSite: boolean;
	conferenceGame: boolean;
	eventName?: string;
	odds?: StoredGameOdds;
	subdivisions: Subdivision[];
	espnUrl: string;
}

export interface StoredScoreboard {
	week: WeekInfo;
	games: StoredGame[];
	fetchedAt: Date;
	/** When the next `/refresh-week` for this week is scheduled. Absent if nothing is scheduled (e.g. a one-off manual refresh, or a chain that just ended). */
	nextRefreshAt?: Date;
	partialErrors: Scoreboard['partialErrors'];
}

function toStoredTeam(team: GameTeam): StoredGameTeam {
	return {
		id: team.id,
		homeAway: team.homeAway,
		location: team.location,
		name: team.name,
		displayName: team.displayName,
		abbreviation: team.abbreviation,
		logoUrl: team.logoUrl,
		darkLogoUrl: team.darkLogoUrl,
		color: team.color,
		rank: team.rank,
		record: team.record,
		conferenceRecord: team.conferenceRecord,
		conferenceId: team.conferenceId,
		score: team.score,
		isWinner: team.isWinner
	};
}

function toStoredOdds(odds: GameOdds): StoredGameOdds {
	return {
		spread: odds.spread,
		overUnder: odds.overUnder,
		favoriteHomeAway: odds.favoriteHomeAway,
		details: odds.details,
		moneylineHome: odds.moneylineHome,
		moneylineAway: odds.moneylineAway,
		homeWinPct: odds.homeWinPct,
		awayWinPct: odds.awayWinPct
	};
}

function toStoredGame(game: Game): StoredGame {
	const away = toStoredTeam(game.away);
	const home = toStoredTeam(game.home);

	return {
		id: game.id,
		shortName: game.shortName,
		kickoff: game.kickoff,
		kickoffTbd: game.kickoffTbd,
		status: {
			state: game.status.state,
			description: game.status.description,
			shortDetail: game.status.shortDetail,
			period: game.status.period,
			displayClock: game.status.displayClock,
			canceled: game.status.canceled,
			postponed: game.status.postponed
		},
		away,
		home,
		teams: [away, home],
		broadcasts: game.broadcasts,
		venue: game.venue
			? {
					name: game.venue.name,
					city: game.venue.city,
					state: game.venue.state,
					country: game.venue.country
				}
			: undefined,
		neutralSite: game.neutralSite,
		conferenceGame: game.conferenceGame,
		eventName: game.eventName,
		odds: game.odds ? toStoredOdds(game.odds) : undefined,
		subdivisions: game.subdivisions,
		espnUrl: game.espnUrl
	};
}

/** Project a live `Scoreboard` down to what actually gets written to storage. */
export function toStoredScoreboard(board: Scoreboard, nextRefreshAt?: Date): StoredScoreboard {
	return {
		week: board.week,
		games: board.games.map(toStoredGame),
		fetchedAt: board.fetchedAt,
		nextRefreshAt,
		partialErrors: board.partialErrors
	};
}
