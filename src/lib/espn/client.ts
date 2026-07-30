import type { EspnCalendarType, EspnEvent, EspnScoreboardResponse } from './types';

export const SCOREBOARD_URL =
	'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';

/** ESPN's `groups` codes for the two divisions we care about. */
export const GROUPS = { fbs: '80', fcs: '81' } as const;

export type Subdivision = keyof typeof GROUPS;

export const ALL_SUBDIVISIONS: readonly Subdivision[] = ['fbs', 'fcs'];

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Which week to ask for. Omit every field and ESPN returns the *current* week —
 * that is the only correct way to determine "now". Never compute dates locally.
 */
export interface ScoreboardQuery {
	/** The season year. ESPN confusingly takes this as the `dates` param. */
	seasonYear?: number;
	week?: number;
	/** 2 = regular season, 3 = postseason. */
	seasonType?: number;
}

export class EspnFetchError extends Error {
	readonly status?: number;

	constructor(message: string, options?: { status?: number; cause?: unknown }) {
		super(message, { cause: options?.cause });
		this.name = 'EspnFetchError';
		this.status = options?.status;
	}
}

export function buildScoreboardUrl(subdivision: Subdivision, query: ScoreboardQuery = {}): string {
	const url = new URL(SCOREBOARD_URL);
	url.searchParams.set('groups', GROUPS[subdivision]);
	// Insurance against ESPN's default page size; a no-op while `groups` is set.
	url.searchParams.set('limit', '400');

	// Only send week selectors when all the information is present. A partial
	// selection makes ESPN fall back in surprising ways.
	if (query.seasonYear !== undefined) url.searchParams.set('dates', String(query.seasonYear));
	if (query.week !== undefined) url.searchParams.set('week', String(query.week));
	if (query.seasonType !== undefined) url.searchParams.set('seasontype', String(query.seasonType));

	return url.toString();
}

export async function fetchScoreboard(
	subdivision: Subdivision,
	query: ScoreboardQuery = {},
	options: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<EspnScoreboardResponse> {
	const { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = options;
	const url = buildScoreboardUrl(subdivision, query);

	let response: Response;
	try {
		// ⚠️ DO NOT ADD REQUEST HEADERS OR A `cache`/`mode`/`credentials` OPTION HERE.
		//
		// ESPN answers GET with `access-control-allow-origin: *`, but answers the CORS
		// preflight OPTIONS with 403. Any header that is not CORS-safelisted (including
		// `Accept` and anything `cache: 'reload'` adds) promotes this to a preflighted
		// request, which then fails — in browsers only. curl and Node keep working, so
		// the breakage is invisible outside a real browser. `signal` is safe: it is not
		// a header.
		//
		// We also deliberately send no cache-buster: ESPN returns `cache-control:
		// max-age=10`, which is exactly the freshness we want on an API with no
		// published rate limits.
		response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
	} catch (cause) {
		const timedOut = cause instanceof DOMException && cause.name === 'TimeoutError';
		throw new EspnFetchError(
			timedOut ? 'The request to ESPN timed out.' : 'Could not reach ESPN.',
			{ cause }
		);
	}

	if (!response.ok) {
		throw new EspnFetchError(`ESPN returned HTTP ${response.status}.`, {
			status: response.status
		});
	}

	try {
		return (await response.json()) as EspnScoreboardResponse;
	} catch (cause) {
		throw new EspnFetchError('ESPN returned a response that was not valid JSON.', { cause });
	}
}

export interface MergedEvent {
	event: EspnEvent;
	/** Which division queries returned this game. Both means an FBS-vs-FCS matchup. */
	subdivisions: Subdivision[];
}

export interface MergedScoreboard {
	season: { year: number; type: number };
	week: { number: number };
	calendar: EspnCalendarType[];
	events: MergedEvent[];
	/** Divisions whose request failed. Non-fatal: we render what we did get. */
	partialErrors: Array<{ subdivision: Subdivision; message: string }>;
}

/**
 * Combine per-division responses into one event list, deduplicated by event id.
 *
 * The FBS and FCS queries genuinely overlap — a game between an FBS and an FCS team
 * is returned by both — so a naive concatenation double-counts roughly a quarter of
 * the schedule. Note that group membership alone cannot tell you *which* team is
 * which; it only tells you the matchup crosses divisions.
 */
export function mergeScoreboards(
	results: Array<{ subdivision: Subdivision; response: EspnScoreboardResponse }>
): Omit<MergedScoreboard, 'partialErrors'> {
	const byId = new Map<string, MergedEvent>();

	for (const { subdivision, response } of results) {
		for (const event of response.events ?? []) {
			if (!event?.id) continue;

			const existing = byId.get(event.id);
			if (existing) {
				if (!existing.subdivisions.includes(subdivision)) {
					existing.subdivisions.push(subdivision);
				}
			} else {
				byId.set(event.id, { event, subdivisions: [subdivision] });
			}
		}
	}

	// Season/week/calendar are identical across divisions, so the first successful
	// response is as good an authority as any.
	const first = results[0]?.response;

	return {
		season: {
			year: first?.season?.year ?? new Date().getUTCFullYear(),
			type: first?.season?.type ?? 2
		},
		week: { number: first?.week?.number ?? 1 },
		calendar: first?.leagues?.[0]?.calendar ?? [],
		events: [...byId.values()]
	};
}

/**
 * Fetch every division in parallel and merge the results.
 *
 * Only throws if *all* requests fail; a single division failing is reported through
 * `partialErrors` so the UI can show the games it does have.
 */
export async function fetchMergedScoreboard(
	query: ScoreboardQuery = {},
	options: {
		subdivisions?: readonly Subdivision[];
		timeoutMs?: number;
		fetchImpl?: typeof fetch;
	} = {}
): Promise<MergedScoreboard> {
	const { subdivisions = ALL_SUBDIVISIONS, ...fetchOptions } = options;

	const settled = await Promise.allSettled(
		subdivisions.map((subdivision) => fetchScoreboard(subdivision, query, fetchOptions))
	);

	const succeeded: Array<{ subdivision: Subdivision; response: EspnScoreboardResponse }> = [];
	const partialErrors: MergedScoreboard['partialErrors'] = [];

	settled.forEach((result, index) => {
		const subdivision = subdivisions[index];
		if (result.status === 'fulfilled') {
			succeeded.push({ subdivision, response: result.value });
		} else {
			const reason: unknown = result.reason;
			partialErrors.push({
				subdivision,
				message: reason instanceof Error ? reason.message : String(reason)
			});
		}
	});

	if (succeeded.length === 0) {
		const detail = partialErrors.map((error) => error.message).join(' ');
		throw new EspnFetchError(`Could not load games from ESPN. ${detail}`.trim());
	}

	return { ...mergeScoreboards(succeeded), partialErrors };
}
