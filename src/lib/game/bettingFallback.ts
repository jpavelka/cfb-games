import { base } from '$app/paths';
import { devigMoneyline } from './transform';
import type { GameOdds, GameTeam } from './types';

/**
 * One game's worth of collegefootballdata.com data, as written by
 * `scripts/fetch-betting.ts` to `static/data/betting.json` (keyed by ESPN game
 * id — CFBD and ESPN share the same game id space).
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
 * Loaded from `static/data/betting.json` by default, refreshed daily by GitHub
 * Actions — not fetched live at view time (same rule as `sagarin.json`/
 * `loadRatingMap`). A missing/unreadable file yields an empty map rather than
 * failing the page.
 *
 * `path` can be overridden to point at a dev-only backup instead — see
 * `/dev-snapshot/[name]` and `scripts/build-local-betting-backup.ts`.
 */
export async function loadBettingFallback(
	fetchImpl: typeof fetch = fetch,
	path: string = `${base}/data/betting.json`
): Promise<BettingFallbackMap> {
	try {
		const response = await fetchImpl(path);
		if (!response.ok) return new Map();

		const data = (await response.json()) as Record<string, BettingFallbackEntry>;
		return new Map(Object.entries(data));
	} catch (error) {
		console.warn('Could not load CFBD betting fallback data', error);
		return new Map();
	}
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
