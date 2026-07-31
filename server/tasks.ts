import { CloudTasksClient } from '@google-cloud/tasks';

/**
 * TS port of the old repo's `tasks/tasks.py::create_task`, kept per-week — every
 * chain enqueues its own next task independently, named after its week so
 * concurrent chains never collide.
 *
 * One deliberate difference from the old version: tasks are OIDC-authenticated
 * (`oidcToken`), so the Cloud Run service can require authentication instead of
 * being publicly POST-able the way the old `--allow-unauthenticated` service was.
 */

const PROJECT = process.env.GCP_PROJECT;
const LOCATION = process.env.TASKS_LOCATION ?? 'us-central1';
const QUEUE = process.env.TASKS_QUEUE ?? 'cfb-scoreboard-refresh';
/** e.g. https://cfb-scoreboard-refresh-xxxxx-uc.a.run.app — this service's own URL. */
const SERVICE_URL = process.env.SERVICE_URL;
/** Service account Cloud Tasks presents to Cloud Run; needs `roles/run.invoker`. */
const TASKS_INVOKER_SERVICE_ACCOUNT = process.env.TASKS_INVOKER_SERVICE_ACCOUNT;

const DISPATCH_DEADLINE_SECONDS = 120;

let client: CloudTasksClient | undefined;
function tasksClient(): CloudTasksClient {
	client ??= new CloudTasksClient();
	return client;
}

function requireConfig(): { project: string; serviceUrl: string; invoker: string } {
	if (!PROJECT || !SERVICE_URL || !TASKS_INVOKER_SERVICE_ACCOUNT) {
		throw new Error(
			'GCP_PROJECT, SERVICE_URL, and TASKS_INVOKER_SERVICE_ACCOUNT env vars are required'
		);
	}
	return { project: PROJECT, serviceUrl: SERVICE_URL, invoker: TASKS_INVOKER_SERVICE_ACCOUNT };
}

export interface RefreshWeekPayload {
	seasonYear: number;
	seasonType: number;
	week: number;
	reschedule: boolean;
	/** ISO timestamp; the chain stops rescheduling itself past this point. */
	rescheduleCutoff?: string;
}

/**
 * Every task for a given week shares this prefix — see `deleteExistingTasksForWeek`.
 * Year-first so it's also a prefix of `seasonTaskNamePrefix` below, which relies on
 * exactly that to sweep every week of a season in one listing.
 */
function weekTaskNamePrefix(payload: { seasonYear: number; seasonType: number; week: number }): string {
	return `refresh-${payload.seasonYear}-${payload.seasonType}-${payload.week}-`;
}

/** Every refresh task for a given season shares this prefix — see `sweepStaleSeasonTasks`. */
function seasonTaskNamePrefix(seasonYear: number): string {
	return `refresh-${seasonYear}-`;
}

/** Timestamp-suffixed so re-enqueuing the same week never collides with an in-flight task of the same name. */
function taskId(payload: RefreshWeekPayload): string {
	const stamp = new Date().toISOString().replace(/[^0-9]/g, '');
	return `${weekTaskNamePrefix(payload)}${stamp}`;
}

function isNotFound(error: unknown): boolean {
	// google-gax errors carry a gRPC status `code`; 5 is NOT_FOUND.
	return typeof error === 'object' && error !== null && (error as { code?: number }).code === 5;
}

/**
 * Delete any other task already queued for this week before adding a new one.
 *
 * This is what keeps at most one task per week in the queue. Without it, a Cloud
 * Tasks retry-duplicate delivery (the queue's delivery is at-least-once, so a slow
 * `/refresh-week` response can get redelivered while the original is still running)
 * or an accidental repeat `/bootstrap` call would each spin up a second, fully
 * independent self-rescheduling chain for the same week — and every cycle after
 * that doubles again.
 *
 * It's self-healing rather than a hard distributed lock: list-then-delete-then-create
 * has a race window, so a genuinely concurrent duplicate can still leave two tasks
 * queued for a moment. But because *every* enqueue first clears out whatever else is
 * queued under this week's name prefix, that never compounds — the next cycle prunes
 * back down to one. A watertight guarantee would need a fencing token (e.g. an
 * optimistic-concurrency write to GCS) rather than just Cloud Tasks list/delete;
 * that's more machinery than this risk currently justifies.
 */
async function deleteTasksMatching(predicate: (shortName: string) => boolean, project: string): Promise<void> {
	const parent = tasksClient().queuePath(project, LOCATION, QUEUE);

	const deletions: Promise<void>[] = [];
	for await (const task of tasksClient().listTasksAsync({ parent })) {
		const shortName = task.name?.split('/').pop();
		if (!shortName || !predicate(shortName)) continue;

		deletions.push(
			tasksClient()
				.deleteTask({ name: task.name })
				.then(() => undefined)
				.catch((error: unknown) => {
					// Already executed/deleted (e.g. a concurrent cleanup beat us to it) — fine.
					if (!isNotFound(error)) throw error;
				})
		);
	}
	await Promise.all(deletions);
}

async function deleteExistingTasksForWeek(payload: { seasonYear: number; seasonType: number; week: number }, project: string): Promise<void> {
	const prefix = weekTaskNamePrefix(payload);
	await deleteTasksMatching((shortName) => shortName.startsWith(prefix), project);
}

/**
 * Delete any queued `refresh-*` task that isn't for `currentSeasonYear` — the
 * per-season counterpart to `deleteExistingTasksForWeek`'s per-week cleanup.
 *
 * Called on every `/check-season` request (see `index.ts`), not just when a season
 * change is detected, so it's also the safety net that mops up a straggler left
 * behind by a race during an actual transition (e.g. a task that was in flight,
 * already past this sweep, when the old season's chains were torn down — it fires
 * once more, re-enqueues once more under the old season's prefix, and gets caught
 * by tomorrow's sweep). Leaves `cleanup-*` tasks alone — different prefix entirely.
 */
export async function sweepStaleSeasonTasks(currentSeasonYear: number): Promise<void> {
	const { project } = requireConfig();
	const currentPrefix = seasonTaskNamePrefix(currentSeasonYear);
	await deleteTasksMatching(
		(shortName) => shortName.startsWith('refresh-') && !shortName.startsWith(currentPrefix),
		project
	);
}

/**
 * Enqueue the next `/refresh-week` call for one week, `delayMs` from now (0 for
 * "as soon as possible" — used by `/bootstrap`'s initial fan-out).
 */
export async function enqueueRefreshTask(payload: RefreshWeekPayload, delayMs: number): Promise<void> {
	const { project, serviceUrl, invoker } = requireConfig();

	await deleteExistingTasksForWeek(payload, project);

	const parent = tasksClient().queuePath(project, LOCATION, QUEUE);
	const name = tasksClient().taskPath(project, LOCATION, QUEUE, taskId(payload));

	await tasksClient().createTask({
		parent,
		task: {
			name,
			httpRequest: {
				httpMethod: 'POST',
				url: `${serviceUrl}/refresh-week`,
				headers: { 'Content-Type': 'application/json' },
				body: Buffer.from(JSON.stringify(payload)),
				oidcToken: { serviceAccountEmail: invoker }
			},
			dispatchDeadline: { seconds: DISPATCH_DEADLINE_SECONDS },
			...(delayMs > 0
				? { scheduleTime: { seconds: Math.floor((Date.now() + delayMs) / 1000) } }
				: {})
		}
	});
}

export interface CleanupOldSeasonPayload {
	oldSeasonYear: number;
	newSeasonYear: number;
	/** How many times `/cleanup-old-season` has re-enqueued itself waiting for new data. */
	attempt?: number;
}

/** Every cleanup task for a given old season shares this prefix. */
function cleanupTaskNamePrefix(oldSeasonYear: number): string {
	return `cleanup-${oldSeasonYear}-`;
}

function cleanupTaskId(oldSeasonYear: number): string {
	const stamp = new Date().toISOString().replace(/[^0-9]/g, '');
	return `${cleanupTaskNamePrefix(oldSeasonYear)}${stamp}`;
}

/**
 * Enqueue (or re-enqueue) the check that deletes `oldSeasonYear`'s GCS files once
 * `newSeasonYear` has data of its own — see `cleanupOldSeason` in `index.ts`.
 * Deletes any existing cleanup task for the same old season first, same
 * at-most-one-in-flight reasoning as `enqueueRefreshTask`.
 */
export async function enqueueCleanupTask(payload: CleanupOldSeasonPayload, delayMs: number): Promise<void> {
	const { project, serviceUrl, invoker } = requireConfig();

	await deleteTasksMatching(
		(shortName) => shortName.startsWith(cleanupTaskNamePrefix(payload.oldSeasonYear)),
		project
	);

	const parent = tasksClient().queuePath(project, LOCATION, QUEUE);
	const name = tasksClient().taskPath(project, LOCATION, QUEUE, cleanupTaskId(payload.oldSeasonYear));

	await tasksClient().createTask({
		parent,
		task: {
			name,
			httpRequest: {
				httpMethod: 'POST',
				url: `${serviceUrl}/cleanup-old-season`,
				headers: { 'Content-Type': 'application/json' },
				body: Buffer.from(JSON.stringify(payload)),
				oidcToken: { serviceAccountEmail: invoker }
			},
			dispatchDeadline: { seconds: DISPATCH_DEADLINE_SECONDS },
			...(delayMs > 0
				? { scheduleTime: { seconds: Math.floor((Date.now() + delayMs) / 1000) } }
				: {})
		}
	});
}
