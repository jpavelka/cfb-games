/**
 * Shapes for the subset of ESPN's unofficial scoreboard payload that we read.
 *
 * ESPN publishes no schema, no version, and no deprecation policy for this API,
 * so nearly every field here is optional on purpose: a missing field should be a
 * `undefined` check in `game/transform.ts`, never a runtime crash. Nothing outside
 * `src/lib/espn/` should import these types — the app models live in `game/types.ts`.
 */

/** ESPN's own status vocabulary. Cancellations/postponements arrive as `post`. */
export type EspnGameState = 'pre' | 'in' | 'post';

export interface EspnScoreboardResponse {
	leagues?: EspnLeague[];
	season?: { type?: number; year?: number };
	week?: { number?: number };
	events?: EspnEvent[];
}

export interface EspnLeague {
	calendar?: EspnCalendarType[];
	calendarStartDate?: string;
	calendarEndDate?: string;
}

/** One season phase: "Regular Season" (value "2"), "Postseason" ("3"), "Off Season" ("4"). */
export interface EspnCalendarType {
	label?: string;
	value?: string;
	startDate?: string;
	endDate?: string;
	entries?: EspnCalendarEntry[];
}

export interface EspnCalendarEntry {
	/** e.g. "Week 1" */
	label?: string;
	alternateLabel?: string;
	/** e.g. "Aug 22-Sep 7" */
	detail?: string;
	/** The week number, as a string. */
	value?: string;
	startDate?: string;
	endDate?: string;
}

export interface EspnEvent {
	id: string;
	date?: string;
	/** e.g. "North Carolina Tar Heels at TCU Horned Frogs" */
	name?: string;
	/** e.g. "UNC VS TCU" */
	shortName?: string;
	season?: { year?: number; type?: number };
	week?: { number?: number };
	competitions?: EspnCompetition[];
	status?: EspnStatus;
}

export interface EspnCompetition {
	id?: string;
	date?: string;
	/** `false` means the kickoff time is not yet known; `date` is then a placeholder. */
	timeValid?: boolean;
	neutralSite?: boolean;
	conferenceCompetition?: boolean;
	venue?: EspnVenue;
	competitors?: EspnCompetitor[];
	notes?: EspnNote[];
	status?: EspnStatus;
	/** A single pre-joined channel string, e.g. "ESPN". */
	broadcast?: string;
	broadcasts?: EspnBroadcast[];
	geoBroadcasts?: EspnGeoBroadcast[];
	/** Absent on most games and explicitly `null` on some — always use `odds?.[0]`. */
	odds?: EspnOdds[] | null;
	/** Only present while a game is live. */
	situation?: EspnSituation;
}

export interface EspnSituation {
	down?: number;
	distance?: number;
	yardLine?: number;
	/** e.g. "2nd & 7 at OU 35" */
	downDistanceText?: string;
	/** e.g. "2nd & 7" */
	shortDownDistanceText?: string;
	/** e.g. "OU 35" */
	possessionText?: string;
	/** Team id of the team with possession. */
	possession?: string;
	isRedZone?: boolean;
	lastPlay?: {
		text?: string;
		/** 0-1 scale. Absent on plays before ESPN's win-probability model kicks in (e.g. the opening kickoff). */
		probability?: { homeWinPercentage?: number; awayWinPercentage?: number };
	};
}

export interface EspnStatus {
	clock?: number;
	displayClock?: string;
	period?: number;
	type?: {
		id?: string;
		name?: string;
		state?: EspnGameState;
		completed?: boolean;
		/** e.g. "Final", "Scheduled", "Canceled", "Postponed" */
		description?: string;
		/** e.g. "Final", "Sat, August 29th at 12:00 PM EDT" */
		detail?: string;
		/** e.g. "Final", "8/29 - 12:00 PM EDT", "TBD" */
		shortDetail?: string;
	};
}

export interface EspnCompetitor {
	id?: string;
	homeAway?: 'home' | 'away';
	order?: number;
	/** A stringified integer, e.g. "28". */
	score?: string;
	/** Present on completed games only. */
	winner?: boolean;
	/** `current: 99` is ESPN's sentinel for "unranked". */
	curatedRank?: { current?: number };
	/**
	 * `type` is only stable for 'total' and 'vsconf'. The home/away entries are
	 * named 'homerecord'/'awayrecord' in some seasons and 'home'/'road' in others,
	 * so never read those by name or by position.
	 */
	records?: Array<{ name?: string; type?: string; summary?: string }>;
	team?: EspnTeam;
	/** Score by period (quarter, then OT). Present once the game has started. */
	linescores?: Array<{ value?: number; period?: number }>;
}

export interface EspnTeam {
	id?: string;
	/** e.g. "TCU" */
	location?: string;
	/** e.g. "Horned Frogs" */
	name?: string;
	abbreviation?: string;
	displayName?: string;
	shortDisplayName?: string;
	/** Six hex digits with NO leading "#". */
	color?: string;
	alternateColor?: string;
	/** Absent for a small number of teams. */
	logo?: string;
	/** An opaque numeric string; the payload carries no id→name mapping. */
	conferenceId?: string;
}

export interface EspnVenue {
	fullName?: string;
	indoor?: boolean;
	address?: { city?: string; state?: string; country?: string };
}

/** e.g. `{ type: 'event', headline: 'Aer Lingus College Football Classic' }` */
export interface EspnNote {
	type?: string;
	headline?: string;
}

export interface EspnBroadcast {
	/** 'national' | 'home' | 'away' */
	market?: string;
	names?: string[];
}

export interface EspnGeoBroadcast {
	market?: { type?: string };
	media?: { shortName?: string };
}

export interface EspnOdds {
	provider?: { id?: string; name?: string };
	/** e.g. "TCU -6.5" */
	details?: string;
	overUnder?: number;
	spread?: number;
	homeTeamOdds?: { favorite?: boolean };
	awayTeamOdds?: { favorite?: boolean };
	/** American odds, e.g. `{ close: { odds: "-250" } }`. Absent on many games. */
	moneyline?: {
		home?: { close?: { odds?: string } };
		away?: { close?: { odds?: string } };
	};
}
