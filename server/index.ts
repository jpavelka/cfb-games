import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { fetchMergedScoreboard, type MergedScoreboard } from '../src/lib/espn/client';
import { fetchEventOdds } from '../src/lib/espn/odds';
import { toScoreboard } from '../src/lib/game/transform';
import { sortGames } from '../src/lib/game/sort';
import { POSTSEASON, REGULAR_SEASON, weekSlug } from '../src/lib/game/weeks';
import { applyBettingFallback, hasUsefulLine } from '../src/lib/game/bettingFallback';
import type { Game } from '../src/lib/game/types';
import {
	saveWeekScoreboard,
	loadWeekScoreboard,
	saveBettingFile,
	loadBettingFile,
	readKnownSeasonYear,
	writeKnownSeasonYear,
	hasAnyFileForSeason,
	deleteWeekFilesForSeason,
	type WeekKey
} from './gcs';
import { getKnownTeamIds } from './knownTeamIds';
import {
	enqueueRefreshTask,
	sweepStaleSeasonTasks,
	enqueueCleanupTask,
	type RefreshWeekPayload,
	type CleanupOldSeasonPayload
} from './tasks';
import { computeNextRefreshDelayMs } from './reschedule';
import { preservePregameOdds } from './preserveOdds';
import { preserveLiveWinProbability } from './preserveWinProbability';
import { mergeCfbdBetting } from './cfbdBetting';
import { fetchCfbdBetting } from './cfbdClient';

/** How long `/cleanup-old-season` waits before checking (or re-checking) for new-season data. */
const CLEANUP_DELAY_MS = 48 * 60 * 60_000;
/** ~8 days of 48h retries before giving up rather than deleting with no new data ever showing up. */
const CLEANUP_MAX_ATTEMPTS = 4;

const PORT = Number(process.env.PORT ?? 8080);

/** On an ESPN fetch or GCS write failure, retry soon rather than let the chain die. */
const ERROR_BACKOFF_MS = 2 * 60_000;

/**
 * Every `(seasonType, week)` the app actually has a route for — same set
 * `toWeekOptions` in `game/transform.ts` builds the week picker from. Weeks outside
 * this set (the off season, or any postseason week we have no slug for) are never
 * worth a task chain.
 */
function reachableWeeks(calendar: MergedScoreboard['calendar']): Array<{ seasonType: number; week: number }> {
	const weeks: Array<{ seasonType: number; week: number }> = [];

	for (const seasonType of [REGULAR_SEASON, POSTSEASON]) {
		const phase = calendar.find((entry) => entry.value === String(seasonType));
		for (const entry of phase?.entries ?? []) {
			const week = Number(entry.value);
			if (!entry.value || !Number.isInteger(week)) continue;
			if (!weekSlug(seasonType, week)) continue;
			weeks.push({ seasonType, week });
		}
	}

	return weeks;
}

/**
 * Clamp a proposed delay to `rescheduleCutoff`, if any. `null` means the cutoff
 * has already passed — the chain should end rather than reschedule.
 */
function clampToCutoff(delayMs: number, rescheduleCutoff: string | undefined, now: number): number | null {
	if (!rescheduleCutoff) return delayMs;
	const cutoffMs = new Date(rescheduleCutoff).getTime();
	if (cutoffMs <= now) return null;
	return Math.min(delayMs, cutoffMs - now);
}

/**
 * Fetch + store one week, then (if `reschedule`) enqueue the next check for that
 * same week. Wrapped so a failure in the fetch/store step still reschedules — an
 * unhandled error here would otherwise kill this week's chain permanently.
 */
async function refreshWeek(payload: RefreshWeekPayload): Promise<void> {
	const { seasonType, week, reschedule, rescheduleCutoff } = payload;
	let games: Game[] = [];
	let failed = false;

	try {
		const merged = await fetchMergedScoreboard({ week, seasonType });
		const board = toScoreboard(merged);

		const weekKey: WeekKey = { seasonYear: payload.seasonYear, seasonType, week };
		// Two GCS reads, no third-party network calls — deliberately kept off this
		// hot polling path (see `refreshBetting` below for where CFBD/ESPN's
		// per-event odds actually get fetched, once a day).
		const [previous, bettingFallback] = await Promise.all([
			// Used two ways below: `preservePregameOdds` carries a game's odds
			// forward once ESPN stops repeating them live, and
			// `preserveLiveWinProbability` carries the live win-probability number
			// forward across a poll that lands on a play ESPN didn't model one for.
			loadWeekScoreboard(weekKey),
			// Once-daily CFBD + ESPN-core-API backfill (see `refreshBetting`) — fills
			// whatever's still missing after `preservePregameOdds`, without
			// overriding anything ESPN's live scoreboard actually supplied.
			loadBettingFile(weekKey)
		]);

		let mergedGames = preservePregameOdds(board.games, previous?.games);
		// ESPN doesn't compute a win-probability value for every play (PATs
		// consistently lack it, and some games' situation goes fully empty for a
		// poll or two even while live) — keep the last-known live number rather
		// than flickering the win-prob bar off between polls. See
		// preserveWinProbability.ts.
		mergedGames = preserveLiveWinProbability(mergedGames, previous?.games);
		if (bettingFallback) {
			const fallbackMap = new Map(Object.entries(bettingFallback));
			mergedGames = mergedGames.map((game) => ({
				...game,
				odds: applyBettingFallback(game.odds, fallbackMap.get(game.id), game.home, game.away)
			}));
		}
		board.games = sortGames(mergedGames);
		games = board.games;

		// Same delay this refresh is about to reschedule itself with (computed again,
		// moments later, down below) — stored here so the file records when the next
		// check is expected alongside `fetchedAt`.
		let nextRefreshAt: Date | undefined;
		if (reschedule) {
			const now = Date.now();
			const delayMs = clampToCutoff(computeNextRefreshDelayMs(games, new Date(now)), rescheduleCutoff, now);
			if (delayMs !== null) nextRefreshAt = new Date(now + delayMs);
		}

		const knownTeamIds = await getKnownTeamIds(payload.seasonYear);
		await saveWeekScoreboard(weekKey, board, knownTeamIds, nextRefreshAt);
	} catch (error) {
		failed = true;
		console.error(`refresh-week failed for seasonType=${seasonType} week=${week}`, error);
	}

	if (!reschedule) return;

	const now = Date.now();
	const delayMs = clampToCutoff(
		failed ? ERROR_BACKOFF_MS : computeNextRefreshDelayMs(games, new Date(now)),
		rescheduleCutoff,
		now
	);
	if (delayMs === null) return; // past the cutoff: let this chain end.

	await enqueueRefreshTask(payload, delayMs);
}

/**
 * Once-a-day job: fetch CFBD's betting lines + pregame win probability for the
 * *current* week, then back-fill any game CFBD has no line for by calling
 * ESPN's per-event core-API odds endpoint (`fetchEventOdds`) — confirmed to
 * cover real gaps CFBD misses, especially for smaller FCS matchups (see the
 * live-win-probability investigation). Writes the merged result to GCS;
 * `refreshWeek` reads it back on every poll via `loadBettingFile`.
 *
 * Deliberately isolated from `refreshWeek`'s hot polling path: CFBD and the
 * per-event ESPN calls only ever happen here, once a day, never on the
 * 10s-cadence live-game loop.
 */
async function refreshBetting(): Promise<{
	seasonYear: number;
	seasonType: number;
	week: number;
	gamesCovered: number;
	backfilled: number;
}> {
	const apiKey = process.env.CFBD_API_KEY;
	if (!apiKey) throw new Error('CFBD_API_KEY env var is required');

	// Same "no params -> now" rule as bootstrap()/checkSeason() — the current
	// week is whatever ESPN says it is right now.
	const merged = await fetchMergedScoreboard();
	const seasonTypeParam = merged.season.type === POSTSEASON ? 'postseason' : 'regular';

	const { lines, winProbabilities } = await fetchCfbdBetting(
		merged.season.year,
		merged.week.number,
		seasonTypeParam,
		apiKey
	);
	const betting = mergeCfbdBetting(lines, winProbabilities);

	let backfilled = 0;
	await Promise.all(
		merged.events.map(async ({ event }) => {
			if (!event.id || hasUsefulLine(betting[event.id])) return;
			const espnOdds = await fetchEventOdds(event.id);
			if (!espnOdds) return;
			betting[event.id] = { ...betting[event.id], ...espnOdds };
			backfilled += 1;
		})
	);

	const weekKey: WeekKey = { seasonYear: merged.season.year, seasonType: merged.season.type, week: merged.week.number };
	await saveBettingFile(weekKey, betting);

	return { ...weekKey, gamesCovered: Object.keys(betting).length, backfilled };
}

interface BootstrapPayload {
	reschedule?: boolean;
	rescheduleCutoff?: string;
}

/**
 * Read ESPN's calendar and start one independent self-rescheduling chain per week,
 * for whichever season ESPN currently answers for. Also records that season as the
 * known one (see `gcs.ts`'s `writeKnownSeasonYear`), so a manual `/bootstrap` and
 * the automatic `/check-season` never disagree about what's current. Does *not*
 * touch old-season GCS files — `/bootstrap` is "(re)start the current season now",
 * not "handle a season transition"; only `checkSeason` does that.
 */
async function bootstrap(payload: BootstrapPayload): Promise<{ weeksStarted: number; seasonYear: number }> {
	// No week/season params -> ESPN answers for "now", which is the only correct way
	// to ask (see README.md's "no date arithmetic" rule) and happens to carry the
	// full calendar regardless of which week it resolves to.
	const merged = await fetchMergedScoreboard();
	const weeks = reachableWeeks(merged.calendar);
	const reschedule = payload.reschedule ?? true;
	const seasonYear = merged.season.year;

	await Promise.all(
		weeks.map((week) =>
			enqueueRefreshTask({ ...week, seasonYear, reschedule, rescheduleCutoff: payload.rescheduleCutoff }, 0)
		)
	);
	await writeKnownSeasonYear(seasonYear);

	return { weeksStarted: weeks.length, seasonYear };
}

/**
 * Detect whether ESPN's current season has changed since the last check and, if
 * so, restart the task chains for the new season and schedule cleanup of the old
 * season's GCS files. Meant to be hit on a schedule (see `scripts/deploy.sh`'s
 * Cloud Scheduler job) rather than manually.
 */
async function checkSeason(): Promise<{ action: 'no-change' | 'bootstrapped' | 'season-changed'; seasonYear: number }> {
	// Same "no params -> now" rule as bootstrap() above.
	const merged = await fetchMergedScoreboard();
	const seasonYear = merged.season.year;

	// Always sweep, not just on a detected change — cheap, and it's the safety net
	// that mops up a straggler task left behind by a race during an actual
	// transition (see `sweepStaleSeasonTasks`'s own doc comment).
	await sweepStaleSeasonTasks(seasonYear);

	const knownSeasonYear = await readKnownSeasonYear();
	if (knownSeasonYear === seasonYear) {
		return { action: 'no-change', seasonYear };
	}

	const weeks = reachableWeeks(merged.calendar);
	await Promise.all(
		weeks.map((week) => enqueueRefreshTask({ ...week, seasonYear, reschedule: true }, 0))
	);
	await writeKnownSeasonYear(seasonYear);

	// No previously known season (first-ever `/check-season` run) -> nothing old to
	// clean up.
	if (knownSeasonYear !== null) {
		await enqueueCleanupTask({ oldSeasonYear: knownSeasonYear, newSeasonYear: seasonYear }, CLEANUP_DELAY_MS);
	}

	return { action: knownSeasonYear === null ? 'bootstrapped' : 'season-changed', seasonYear };
}

/**
 * Delete `oldSeasonYear`'s GCS files once `newSeasonYear` actually has data of its
 * own — self-rescheduling on the same delay if it doesn't yet, same pattern as
 * `refreshWeek`'s chain, capped so a season that (for whatever reason) never gets
 * bootstrapped doesn't leave this retrying forever.
 */
async function cleanupOldSeason(payload: CleanupOldSeasonPayload): Promise<void> {
	const attempt = payload.attempt ?? 0;

	if (await hasAnyFileForSeason(payload.newSeasonYear)) {
		await deleteWeekFilesForSeason(payload.oldSeasonYear);
		return;
	}

	if (attempt >= CLEANUP_MAX_ATTEMPTS) {
		console.error(
			`Giving up waiting for season ${payload.newSeasonYear} data before cleaning up season ${payload.oldSeasonYear}'s files`
		);
		return;
	}

	await enqueueCleanupTask({ ...payload, attempt: attempt + 1 }, CLEANUP_DELAY_MS);
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) chunks.push(chunk as Buffer);
	const raw = Buffer.concat(chunks).toString('utf8').trim();
	return raw ? JSON.parse(raw) : {};
}

function respond(res: ServerResponse, status: number, body: string): void {
	res.writeHead(status, { 'content-type': 'text/plain' }).end(body);
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
	if (req.method === 'POST' && req.url === '/refresh-week') {
		const payload = (await readJsonBody(req)) as Partial<RefreshWeekPayload>;
		if (
			typeof payload.week !== 'number' ||
			typeof payload.seasonType !== 'number' ||
			typeof payload.seasonYear !== 'number'
		) {
			respond(res, 400, 'seasonYear, seasonType, and week are required\n');
			return;
		}
		await refreshWeek({
			seasonYear: payload.seasonYear,
			seasonType: payload.seasonType,
			week: payload.week,
			reschedule: payload.reschedule ?? false,
			rescheduleCutoff: payload.rescheduleCutoff
		});
		respond(res, 200, 'ok\n');
		return;
	}

	if (req.method === 'POST' && req.url === '/bootstrap') {
		const payload = (await readJsonBody(req)) as BootstrapPayload;
		const { weeksStarted, seasonYear } = await bootstrap(payload);
		respond(res, 200, `started ${weeksStarted} week chains for season ${seasonYear}\n`);
		return;
	}

	if (req.method === 'POST' && req.url === '/check-season') {
		const { action, seasonYear } = await checkSeason();
		respond(res, 200, `${action} (season ${seasonYear})\n`);
		return;
	}

	if (req.method === 'POST' && req.url === '/refresh-betting') {
		const result = await refreshBetting();
		respond(
			res,
			200,
			`betting refreshed for season ${result.seasonYear} week ${result.week}: ${result.gamesCovered} games covered, ${result.backfilled} backfilled from ESPN\n`
		);
		return;
	}

	if (req.method === 'POST' && req.url === '/cleanup-old-season') {
		const payload = (await readJsonBody(req)) as Partial<CleanupOldSeasonPayload>;
		if (typeof payload.oldSeasonYear !== 'number' || typeof payload.newSeasonYear !== 'number') {
			respond(res, 400, 'oldSeasonYear and newSeasonYear are required\n');
			return;
		}
		await cleanupOldSeason({
			oldSeasonYear: payload.oldSeasonYear,
			newSeasonYear: payload.newSeasonYear,
			attempt: payload.attempt
		});
		respond(res, 200, 'ok\n');
		return;
	}

	respond(res, 404, 'not found\n');
}

const server = createServer((req, res) => {
	void handleRequest(req, res).catch((error: unknown) => {
		console.error('Unhandled request error', error);
		if (!res.headersSent) respond(res, 500, 'error\n');
	});
});

server.listen(PORT, () => {
	console.log(`cfb-scoreboard-refresh listening on :${PORT}`);
});
