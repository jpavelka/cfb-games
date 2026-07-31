import { error } from '@sveltejs/kit';
import { sortGames } from './sort';
import { fromStoredScoreboard, loadStoredScoreboard } from './storage';
import type { TeamMap } from './teams';
import { loadSeasonYear, loadWeekOptions } from './weekOptions';
import type { Scoreboard } from './types';
import type { WeekTarget } from './weeks';

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
 * re-runs the load for a retry.
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

	const [stored, weeks, teamMap] = await Promise.all([
		loadStoredScoreboard({ ...target, seasonYear }, fetchImpl),
		loadWeekOptions(fetchImpl),
		teams
	]);

	if (!stored) {
		error(503, `No stored scoreboard for week ${target.week} (season type ${target.seasonType})`);
	}

	const board = fromStoredScoreboard(stored, weeks, teamMap);
	return { ...board, games: sortGames(board.games, 'chronological') };
}
