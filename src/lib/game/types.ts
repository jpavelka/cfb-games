import type { Subdivision } from '$lib/espn/client';
import type { WeekOption } from './weeks';

/**
 * The app's own game model.
 *
 * Two rules keep this honest, and both are reactions to how the previous version of
 * this app went wrong:
 *
 *  1. No formatted display strings live here. `dateStr`, `hourStr`, `broadcastStr`
 *     and friends used to be precomputed onto the game object, which coupled the
 *     model to one locale and one layout. Formatting belongs to `$lib/format.ts`
 *     and happens at render time.
 *  2. Nothing here is ESPN-shaped. Sentinels are already decoded (rank 99 → no
 *     rank), strings are already parsed (score "28" → 28), and colors are already
 *     normalized. Consumers never need to know ESPN's conventions.
 */

export type GameState = 'pre' | 'in' | 'post';

export interface GameStatus {
	state: GameState;
	completed: boolean;
	/** e.g. "Final", "Scheduled", "Canceled" */
	description: string;
	/** e.g. "Final", "Sat, August 29th at 12:00 PM EDT" */
	detail: string;
	/** e.g. "Final", "8/29 - 12:00 PM EDT", "TBD" */
	shortDetail: string;
	period?: number;
	displayClock?: string;
	/** ESPN reports these as `post` with a telltale description; decoded here. */
	canceled: boolean;
	postponed: boolean;
}

export interface GameTeam {
	id: string;
	homeAway: 'home' | 'away';
	/** e.g. "TCU" — the short form used in listings. */
	location: string;
	/** e.g. "Horned Frogs" */
	name?: string;
	/** e.g. "TCU Horned Frogs" */
	displayName: string;
	abbreviation: string;
	logoUrl?: string;
	/** ESPN's dark-background variant of `logoUrl`, when derivable. */
	darkLogoUrl?: string;
	/** Validated and '#'-prefixed, or absent. */
	color?: string;
	altColor?: string;
	/** Set only when the team is actually ranked (1–25). */
	rank?: number;
	/** Overall record, e.g. "3-2". */
	record?: string;
	/** Conference record, e.g. "1-0". */
	conferenceRecord?: string;
	/** Opaque id ESPN never names in this payload — resolve via `$lib/game/conferences`. */
	conferenceId?: string;
	score?: number;
	/** Only meaningful once the game is complete. */
	isWinner?: boolean;
	isOddsFavorite?: boolean;
}

export interface GameOdds {
	provider?: string;
	/** Always the magnitude; pair with `favoriteHomeAway` for direction. */
	spread?: number;
	overUnder?: number;
	favoriteHomeAway?: 'home' | 'away';
	/** ESPN's own rendering, e.g. "TCU -6.5". */
	details?: string;
	/** American odds, e.g. -250 or +205. Present only when ESPN has a moneyline. */
	moneylineHome?: number;
	moneylineAway?: number;
	/**
	 * Implied win probability (0-100) derived from the moneyline, with the
	 * bookmaker's vig removed so the two sides sum to 100. Present only when
	 * both `moneylineHome` and `moneylineAway` are.
	 */
	homeWinPct?: number;
	awayWinPct?: number;
}

export interface GameVenue {
	name?: string;
	city?: string;
	state?: string;
	country?: string;
	indoor?: boolean;
}

export interface Game {
	id: string;
	name: string;
	shortName: string;
	kickoff: Date;
	/**
	 * True when ESPN does not yet know the kickoff time. `kickoff` is then a
	 * placeholder (midnight Eastern on the intended date) and must not be shown
	 * as a real time.
	 */
	kickoffTbd: boolean;
	status: GameStatus;
	away: GameTeam;
	home: GameTeam;
	/** `[away, home]` — conventional display order. */
	teams: readonly [GameTeam, GameTeam];
	/** National channel names, deduplicated. Often empty. */
	broadcasts: string[];
	venue?: GameVenue;
	neutralSite: boolean;
	conferenceGame: boolean;
	/** Bowl or showcase name, from the event notes. */
	eventName?: string;
	odds?: GameOdds;
	subdivisions: Subdivision[];
	espnUrl: string;
}

export interface WeekInfo {
	seasonYear: number;
	seasonType: number;
	weekNumber: number;
	/** e.g. "Week 1" — taken from ESPN's calendar when available. */
	label: string;
	/** This week's route slug, or null in the off season. See `$lib/game/weeks`. */
	slug: string | null;
}

export interface Scoreboard {
	week: WeekInfo;
	/** Every week of this season, for the picker. From ESPN's calendar. */
	weeks: WeekOption[];
	games: Game[];
	fetchedAt: Date;
	partialErrors: Array<{ subdivision: Subdivision; message: string }>;
	/** Events ESPN returned that we could not parse. Surfaced for debugging only. */
	skippedCount: number;
}
