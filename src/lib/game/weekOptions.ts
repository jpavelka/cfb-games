import { base } from '$app/paths';
import type { WeekTarget, WeekOption } from './weeks';

interface CurrentWeek extends WeekTarget {
	slug: string;
}

interface WeeksFile {
	season: { year: number };
	weeks: WeekOption[];
	currentWeek: CurrentWeek | null;
}

const EMPTY: WeeksFile = { season: { year: 0 }, weeks: [], currentWeek: null };

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
	try {
		const response = await fetchImpl(`${base}/data/weeks.json`);
		if (!response.ok) return EMPTY;

		return (await response.json()) as WeeksFile;
	} catch (error) {
		console.warn('Could not load week schedule data', error);
		return EMPTY;
	}
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
