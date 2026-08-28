import { gunzipSync, gzipSync } from 'node:zlib';
import { Storage } from '@google-cloud/storage';
import type { BettingFallbackEntry } from '../src/lib/game/bettingFallback';
import type { Scoreboard } from '../src/lib/game/types';
import { toStoredScoreboard, type StoredScoreboard } from '../src/lib/game/storedScoreboard';

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

/** One file per week, same key shape as `weekFileName` — see `refreshBetting` in `index.ts`. */
function bettingFileName({ seasonYear, seasonType, week }: WeekKey): string {
	return `betting-${seasonYear}-${seasonType}-${week}.json`;
}

function seasonFilePrefixes(seasonYear: number): string[] {
	return [`games-${seasonYear}-`, `betting-${seasonYear}-`];
}

/**
 * Downloads and JSON-parses one file, transparently handling both a raw gzip
 * buffer and one GCS already decompressed for us ("decompressive transcoding"
 * can happen depending on the request, so `.download()`'s output isn't
 * guaranteed either way even though every file here is saved with
 * `contentEncoding: gzip`). `null` when the file doesn't exist yet.
 */
async function downloadJson<T>(filename: string): Promise<T | null> {
	try {
		const [contents] = await bucket().file(filename).download();
		const isGzipped = contents.length >= 2 && contents[0] === 0x1f && contents[1] === 0x8b;
		const text = (isGzipped ? gunzipSync(contents) : contents).toString('utf8');
		return JSON.parse(text) as T;
	} catch (error) {
		if ((error as { code?: number }).code === 404) return null;
		throw error;
	}
}

export async function saveWeekScoreboard(
	key: WeekKey,
	board: Scoreboard,
	knownTeamIds: Set<string>,
	nextRefreshAt?: Date
): Promise<void> {
	const file = bucket().file(weekFileName(key));
	// Only what's actually used by the UI gets written — see storedScoreboard.ts for
	// exactly what's dropped and why (the full `Scoreboard`/`Game` also carry the
	// season-wide week picker list and a handful of fields no component reads).
	//
	// `kickoff`/`fetchedAt`/`nextRefreshAt` are `Date`s; JSON.stringify serializes them
	// via `Date#toJSON` to ISO strings, which the frontend loader revives.
	//
	// Stored gzipped (~90% smaller for a full week's games) since the frontend fetches
	// this straight from GCS every 10s during a live game — every browser decompresses
	// `Content-Encoding: gzip` transparently, no client changes needed.
	const json = JSON.stringify(toStoredScoreboard(board, knownTeamIds, nextRefreshAt));
	await file.save(gzipSync(json), {
		contentType: 'application/json',
		metadata: {
			contentEncoding: 'gzip',
			// Mirrors ESPN's own `cache-control: max-age=10` so a CDN/browser cache in
			// front of the bucket can't hold a stale week for long.
			cacheControl: 'public, max-age=10'
		}
	});
}

/**
 * Reads back a week's previously-saved file, if any — used by `refreshWeek` (see
 * `preserveOdds.ts`) to carry forward data ESPN stops repeating once a game goes
 * live, rather than letting the next overwrite silently lose it. `null` when
 * nothing's been saved for this week yet (first-ever refresh of the season/week).
 */
export async function loadWeekScoreboard(key: WeekKey): Promise<StoredScoreboard | null> {
	return downloadJson<StoredScoreboard>(weekFileName(key));
}

/**
 * Once-a-day CFBD + ESPN-core-API betting fallback data for one week (see
 * `refreshBetting` in `index.ts`) — a separate, much-less-frequently-written file
 * from the scoreboard itself, since it never changes intra-day. `refreshWeek`
 * reads it back on every poll via `loadBettingFile` and applies it with
 * `applyBettingFallback`, so a game's `odds` are already fully merged by the time
 * they reach the browser.
 */
export async function saveBettingFile(key: WeekKey, betting: Record<string, BettingFallbackEntry>): Promise<void> {
	const file = bucket().file(bettingFileName(key));
	const json = JSON.stringify(betting);
	await file.save(gzipSync(json), {
		contentType: 'application/json',
		metadata: {
			contentEncoding: 'gzip',
			// Refreshed once a day, not every 10s like the scoreboard — a longer TTL
			// just saves a redundant GCS round trip on every intervening poll.
			cacheControl: 'public, max-age=3600'
		}
	});
}

/** `null` when nothing's been saved for this week yet, or `refreshBetting` hasn't run today. */
export async function loadBettingFile(key: WeekKey): Promise<Record<string, BettingFallbackEntry> | null> {
	return downloadJson<Record<string, BettingFallbackEntry>>(bettingFileName(key));
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
	const [files] = await bucket().getFiles({ prefix: seasonFilePrefixes(seasonYear)[0], maxResults: 1 });
	return files.length > 0;
}

/** Deletes every week's scoreboard *and* betting file for `seasonYear` — the previous season, once the new one has data. */
export async function deleteWeekFilesForSeason(seasonYear: number): Promise<void> {
	const fileLists = await Promise.all(
		seasonFilePrefixes(seasonYear).map((prefix) => bucket().getFiles({ prefix }).then(([files]) => files))
	);
	await Promise.all(
		fileLists.flat().map((file) =>
			file.delete().catch((error: unknown) => {
				// Already gone (e.g. a concurrent/retried cleanup beat us to it) — fine.
				if ((error as { code?: number }).code !== 404) throw error;
			})
		)
	);
}
