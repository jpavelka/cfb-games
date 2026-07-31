import { fetchDivisionTeamIds } from '../src/lib/espn/teams';

/** Durable, barely-changes data — a season's FBS/FCS/D2 rosters don't shift mid-week. */
const CACHE_TTL_MS = 12 * 60 * 60_000;

let cache: { seasonYear: number; ids: Set<string>; fetchedAt: number } | null = null;

/**
 * The current season's FBS/FCS/D2 team ids, cached in memory per process. Used by
 * `refreshWeek` (see `index.ts`) to decide whether a game's opponent needs its
 * display info written inline (`fallback` in `storedScoreboard.ts`) rather than
 * relying on the client resolving it from `static/data/teams.json` — which only
 * ever lists FBS/FCS/D2 teams itself.
 *
 * Cached rather than re-walked on every `/refresh-week` call (which can fire quite
 * often for an active week) — the underlying ESPN group tree does not change fast
 * enough to justify that.
 */
export async function getKnownTeamIds(seasonYear: number): Promise<Set<string>> {
	const now = Date.now();
	if (cache && cache.seasonYear === seasonYear && now - cache.fetchedAt < CACHE_TTL_MS) {
		return cache.ids;
	}

	const divisionTeams = await fetchDivisionTeamIds(seasonYear);
	const ids = new Set(divisionTeams.keys());
	cache = { seasonYear, ids, fetchedAt: now };
	return ids;
}
