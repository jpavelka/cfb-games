import { devigMoneyline } from './transform';
import type { GameOdds, GameTeam } from './types';

/**
 * One game's worth of collegefootballdata.com (+ ESPN core-API backfill) data,
 * as written by `server/index.ts`'s once-daily `refreshBetting` job to the
 * per-week `betting-{seasonYear}-{seasonType}-{week}.json` GCS file (keyed by
 * ESPN game id — CFBD and ESPN share the same game id space). `refreshWeek`
 * reads it back and applies it server-side via `applyBettingFallback` below, so
 * by the time a `Game` reaches the browser its `odds` are already fully merged
 * — nothing client-side needs to know this fallback exists.
 *
 * `spread` follows CFBD's convention (signed, relative to the home team:
 * negative means the home team is favored), unlike `GameOdds.spread` which is
 * always a magnitude — `applyBettingFallback` below converts between the two.
 */
export interface BettingFallbackEntry {
	provider?: string;
	spread?: number;
	overUnder?: number;
	homeMoneyline?: number;
	awayMoneyline?: number;
	/** 0-1, from CFBD's `/metrics/wp/pregame`. */
	homeWinProbability?: number;
}

export type BettingFallbackMap = Map<string, BettingFallbackEntry>;

/**
 * Whether this game already has a real line — i.e. whether it's worth spending
 * a per-event ESPN core-API request to backfill it. Used only by
 * `refreshBetting`'s once-daily job, never on the scoreboard's hot polling path.
 */
export function hasUsefulLine(entry: BettingFallbackEntry | undefined): boolean {
	return entry?.spread !== undefined || entry?.homeMoneyline !== undefined || entry?.awayMoneyline !== undefined;
}

/**
 * Fills in whatever pieces of `odds` ESPN didn't have, from CFBD's fallback
 * data — never overrides a field ESPN actually supplied. Spread/over-under/
 * moneyline are filled independently; win probability is derived from
 * whichever moneyline ends up available (ESPN's or CFBD's) via the same devig
 * math `transform.ts` uses for live ESPN odds, falling back to CFBD's own
 * pregame win probability only when no moneyline is available at all.
 */
export function applyBettingFallback(
	odds: GameOdds | undefined,
	fallback: BettingFallbackEntry | undefined,
	home: GameTeam,
	away: GameTeam
): GameOdds | undefined {
	if (!fallback) return odds;

	const merged: GameOdds = { ...odds };

	if (merged.spread === undefined && fallback.spread !== undefined) {
		merged.spread = Math.abs(fallback.spread);
		merged.favoriteHomeAway = fallback.spread < 0 ? 'home' : fallback.spread > 0 ? 'away' : undefined;
		merged.provider ??= fallback.provider;
		merged.details ??= merged.favoriteHomeAway
			? `${(merged.favoriteHomeAway === 'home' ? home : away).abbreviation} -${merged.spread}`
			: undefined;
	}

	if (merged.overUnder === undefined) {
		merged.overUnder = fallback.overUnder;
	}

	if (merged.moneylineHome === undefined && merged.moneylineAway === undefined) {
		merged.moneylineHome = fallback.homeMoneyline;
		merged.moneylineAway = fallback.awayMoneyline;
	}

	if (merged.homeWinPct === undefined || merged.awayWinPct === undefined) {
		if (merged.moneylineHome !== undefined && merged.moneylineAway !== undefined) {
			const winPct = devigMoneyline(merged.moneylineHome, merged.moneylineAway);
			merged.homeWinPct = winPct?.homeWinPct;
			merged.awayWinPct = winPct?.awayWinPct;
		} else if (fallback.homeWinProbability !== undefined) {
			merged.homeWinPct = fallback.homeWinProbability * 100;
			merged.awayWinPct = 100 - merged.homeWinPct;
		}
	}

	const hasAnything =
		merged.spread !== undefined ||
		merged.overUnder !== undefined ||
		merged.details !== undefined ||
		merged.moneylineHome !== undefined ||
		merged.moneylineAway !== undefined;

	return hasAnything ? merged : undefined;
}
