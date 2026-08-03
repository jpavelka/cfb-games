import { base } from '$app/paths';
import type { WeekTarget, WeekOption } from './weeks';

interface CurrentWeek extends WeekTarget {
	slug: string;
}

interface WeeksFile {
	season: { year: number };
	weeks: WeekOption[];
	currentWeek: CurrentWeek | null;
	/**
	 * Last calendar day (`YYYY-MM-DD`) belonging to "Week 0", or `null` if this
	 * season's merged ESPN Week 1 doesn't need splitting. Precomputed daily by
	 * `scripts/fetch-weeks.ts` (see `$lib/game/openingWeek`'s `splitOpeningWeek`)
	 * so nothing downstream has to fetch Week 1's games just to find out.
	 */
	openingWeekCutoff: string | null;
}

const EMPTY: WeeksFile = { season: { year: 0 }, weeks: [], currentWeek: null, openingWeekCutoff: null };

/**
 * Memoized for the life of the page's JS session: `loadWeekOptions`,
 * `loadSeasonYear`, `loadCurrentWeek`, and `loadOpeningWeekCutoff` below all read
 * through this one function, and `loadScoreboard` (see `load.ts`) alone calls two
 * of them per week navigation — without memoizing here, picking a new week from
 * the dropdown re-fetched this same static file multiple times over. Safe to
 * cache indefinitely: `weeks.json` only ever changes via a full site
 * rebuild+redeploy, which requires a hard reload to see anyway, and a hard reload
 * already wipes this module-level variable along with everything else (no
 * service worker, `ssr = false`).
 */
let weeksFilePromise: Promise<WeeksFile> | null = null;

/**
 * Loaded from `static/data/weeks.json` (see `scripts/fetch-weeks.ts`), refreshed
 * daily by GitHub Actions — not read off a live scoreboard fetch. A missing/
 * unreadable file yields an empty result rather than failing the page (mirrors
 * `loadConferenceMap`/`loadRatingMap`).
 *
 * This is the week picker's source whenever `loadScoreboard` (see `load.ts`) reads
 * a week from the storage bucket instead of live ESPN — the stored file has no
 * calendar to read `weeks` off of. It's also the *only* source for which week is
 * current: `fetch-weeks.ts` is the one place that asks ESPN for "now", so nothing
 * else needs to.
 */
async function loadWeeksFile(fetchImpl: typeof fetch = fetch): Promise<WeeksFile> {
	if (weeksFilePromise) return weeksFilePromise;

	weeksFilePromise = (async () => {
		try {
			const response = await fetchImpl(`${base}/data/weeks.json`);
			if (!response.ok) return EMPTY;

			return (await response.json()) as WeeksFile;
		} catch (error) {
			console.warn('Could not load week schedule data', error);
			return EMPTY;
		}
	})();

	// Don't let a transient failure poison the cache for the rest of the
	// session — an empty result (missing file, network blip) should be retried
	// on the next call rather than remembered forever.
	weeksFilePromise.then((result) => {
		if (result === EMPTY) weeksFilePromise = null;
	});

	return weeksFilePromise;
}

export async function loadWeekOptions(fetchImpl: typeof fetch = fetch): Promise<WeekOption[]> {
	return (await loadWeeksFile(fetchImpl)).weeks;
}

/**
 * The season year `fetch-weeks.ts` last saw ESPN consider current, or `null` if
 * that's unknown (missing/unreadable `weeks.json`). This is the frontend's only
 * source for the season year — there's no live ESPN call here, by design (see
 * `load.ts`) — and is how `loadScoreboard` builds a GCS key that matches what
 * `server/gcs.ts` writes (`games-{seasonYear}-{seasonType}-{week}.json`).
 */
export async function loadSeasonYear(fetchImpl: typeof fetch = fetch): Promise<number | null> {
	return (await loadWeeksFile(fetchImpl)).season.year || null;
}

/** Which week `fetch-weeks.ts` last saw ESPN consider current, or `null` if that's unknown/unmapped. */
export async function loadCurrentWeek(fetchImpl: typeof fetch = fetch): Promise<CurrentWeek | null> {
	return (await loadWeeksFile(fetchImpl)).currentWeek;
}

/**
 * The opening-week split cutoff `fetch-weeks.ts` last computed, or `null` if no
 * split is needed this season. See `WeeksFile.openingWeekCutoff` above.
 */
export async function loadOpeningWeekCutoff(fetchImpl: typeof fetch = fetch): Promise<string | null> {
	return (await loadWeeksFile(fetchImpl)).openingWeekCutoff;
}
