import { error } from '@sveltejs/kit';
import { sortGames } from './sort';
import { fromStoredScoreboard, loadStoredScoreboard } from './storage';
import type { TeamMap } from './teams';
import { loadSeasonYear, loadWeekOptions } from './weekOptions';
import type { Scoreboard } from './types';
import type { WeekTarget } from './weeks';

/**
 * In-memory, per-session cache of already-fetched weeks, keyed the same way as
 * `storage.ts`'s GCS filename. Lets navigating back to a week already viewed
 * this visit (e.g. via the week-picker dropdown) reuse that data instead of
 * re-fetching from GCS — see `isFresh` below for the staleness rule. A hard
 * browser reload always misses it: this is a plain module-level `Map` in an
 * `ssr = false` app with no service worker, so a reload discards the whole JS
 * module graph and starts this empty again, with no special-casing needed.
 */
const scoreboardCache = new Map<string, Scoreboard>();

function cacheKey(target: WeekTarget, seasonYear: number): string {
	return `${seasonYear}-${target.seasonType}-${target.week}`;
}

/**
 * Whether a cached board is still good to serve as-is. `nextRefreshAt` is the
 * backend's own timestamp for when it will next overwrite this week's GCS file
 * (see `server/index.ts`); once that passes, the bucket may hold newer data.
 * Absent entirely means no refresh is even scheduled (a one-off manual refresh,
 * or a chain that's ended) — nothing better is coming, so keep serving it.
 */
function isFresh(board: Scoreboard, now: Date = new Date()): boolean {
	return board.nextRefreshAt === undefined || now.getTime() < board.nextRefreshAt.getTime();
}

/**
 * Fetch one week and map it onto the app model, reading exclusively from the GCS
 * bucket `server/` (the refresh service) publishes to — same data, refreshed on a
 * schedule by the backend, without every visitor's browser making its own ESPN
 * request. No live ESPN fallback: if the bucket has nothing for `target` (not
 * bootstrapped, a network blip), this throws rather than silently masking it with
 * a live fetch.
 *
 * There's deliberately no "give me whatever's current" mode here — the bucket is
 * keyed by week/seasonType, so answering that requires knowing which week is
 * current first. `weekOptions.ts`'s `loadCurrentWeek` answers that from
 * `fetch-weeks.ts`'s own (once-daily) ESPN call; callers resolve a `target` from
 * that before calling this.
 *
 * The promise is deliberately *not* awaited by callers' `load` functions: the page
 * awaits it in the template so it can show a loading state, and `invalidateAll()`
 * re-runs the load for a retry. A failed load is never written into the cache
 * below, so that retry always falls through to a real fetch.
 */
export async function loadScoreboard(
	target: WeekTarget,
	teams: Promise<TeamMap> | TeamMap,
	fetchImpl: typeof fetch = fetch
): Promise<Scoreboard> {
	// The GCS key is season-scoped (`games-{seasonYear}-{seasonType}-{week}.json`),
	// so the season year has to be known before the stored-scoreboard fetch can even
	// be attempted — see `storage.ts`'s `weekFileName`.
	const seasonYear = await loadSeasonYear(fetchImpl);
	if (seasonYear === null) {
		error(503, 'Current season is not available');
	}

	const key = cacheKey(target, seasonYear);
	const cached = scoreboardCache.get(key);
	if (cached && isFresh(cached)) {
		return cached;
	}

	const [stored, weeks, teamMap] = await Promise.all([
		loadStoredScoreboard({ ...target, seasonYear }, fetchImpl),
		loadWeekOptions(fetchImpl),
		teams
	]);

	if (!stored) {
		error(503, `No stored scoreboard for week ${target.week} (season type ${target.seasonType})`);
	}

	const board = fromStoredScoreboard(stored, weeks, teamMap);
	const result = { ...board, games: sortGames(board.games, 'chronological') };
	scoreboardCache.set(key, result);
	return result;
}
