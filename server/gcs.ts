import { Storage } from '@google-cloud/storage';
import type { Scoreboard } from '../src/lib/game/types';
import { toStoredScoreboard } from '../src/lib/game/storedScoreboard';

/**
 * Public-read GCS bucket the static frontend fetches these files from directly —
 * same role as the old repo's `weekly-scoreboard-data` bucket. Bucket creation,
 * public-read IAM, and CORS are deploy-time setup (see the plan), not this file's
 * job.
 *
 * The frontend has no equivalent env var (it's a static `adapter-static` build —
 * see `src/lib/game/storage.ts`'s `BUCKET_BASE_URL`), so a bucket rename means
 * updating both by hand.
 */
const BUCKET_NAME = process.env.SCOREBOARD_BUCKET;

function bucket() {
	if (!BUCKET_NAME) throw new Error('SCOREBOARD_BUCKET env var is required');
	return new Storage().bucket(BUCKET_NAME);
}

export interface WeekKey {
	seasonYear: number;
	seasonType: number;
	week: number;
}

/**
 * One file per week, overwritten on every refresh — no subdivision segment needed
 * (subdivisions are always FBS+FCS). Analogous to the old repo's
 * `games_{season}_{season_type}_{week}_{subdivisions}.json`.
 *
 * Year-first so "every file for season 2025" is one prefix — see
 * `hasAnyFileForSeason`/`deleteWeekFilesForSeason` below, which rely on exactly that.
 */
export function weekFileName({ seasonYear, seasonType, week }: WeekKey): string {
	return `games-${seasonYear}-${seasonType}-${week}.json`;
}

function seasonFilePrefix(seasonYear: number): string {
	return `games-${seasonYear}-`;
}

export async function saveWeekScoreboard(key: WeekKey, board: Scoreboard): Promise<void> {
	const file = bucket().file(weekFileName(key));
	// Only what's actually used by the UI gets written — see storedScoreboard.ts for
	// exactly what's dropped and why (the full `Scoreboard`/`Game` also carry the
	// season-wide week picker list and a handful of fields no component reads).
	//
	// `kickoff`/`fetchedAt` are `Date`s; JSON.stringify serializes them via
	// `Date#toJSON` to ISO strings, which the frontend loader revives.
	await file.save(JSON.stringify(toStoredScoreboard(board)), {
		contentType: 'application/json',
		metadata: {
			// Mirrors ESPN's own `cache-control: max-age=10` so a CDN/browser cache in
			// front of the bucket can't hold a stale week for long.
			cacheControl: 'public, max-age=10'
		}
	});
}

/**
 * The backend's own record of which season it last bootstrapped — read by
 * `checkSeason` in `index.ts` to decide whether ESPN's current season has changed
 * since the last check. Not read by the frontend (which infers the season from
 * `static/data/weeks.json` instead — see `src/lib/game/weekOptions.ts`).
 */
const SEASON_STATE_FILE = 'season-state.json';

interface SeasonState {
	seasonYear: number;
}

/** `null` when the file doesn't exist yet — the very first `/check-season` run. */
export async function readKnownSeasonYear(): Promise<number | null> {
	try {
		const [contents] = await bucket().file(SEASON_STATE_FILE).download();
		const state = JSON.parse(contents.toString('utf8')) as SeasonState;
		return state.seasonYear;
	} catch (error) {
		if ((error as { code?: number }).code === 404) return null;
		throw error;
	}
}

export async function writeKnownSeasonYear(seasonYear: number): Promise<void> {
	const state: SeasonState = { seasonYear };
	await bucket().file(SEASON_STATE_FILE).save(JSON.stringify(state), {
		contentType: 'application/json'
	});
}

/** Whether at least one week has been written for `seasonYear` yet. */
export async function hasAnyFileForSeason(seasonYear: number): Promise<boolean> {
	const [files] = await bucket().getFiles({ prefix: seasonFilePrefix(seasonYear), maxResults: 1 });
	return files.length > 0;
}

/** Deletes every week file for `seasonYear` — the previous season, once the new one has data. */
export async function deleteWeekFilesForSeason(seasonYear: number): Promise<void> {
	const [files] = await bucket().getFiles({ prefix: seasonFilePrefix(seasonYear) });
	await Promise.all(
		files.map((file) =>
			file.delete().catch((error: unknown) => {
				// Already gone (e.g. a concurrent/retried cleanup beat us to it) — fine.
				if ((error as { code?: number }).code !== 404) throw error;
			})
		)
	);
}
