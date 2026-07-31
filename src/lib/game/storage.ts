import type { StoredGame, StoredScoreboard } from './storedScoreboard';
import type { Game, Scoreboard } from './types';
import type { WeekOption } from './weeks';

/**
 * The GCS bucket `server/` (the refresh service) writes to — one public JSON file
 * per week, `games-{seasonYear}-{seasonType}-{week}.json`.
 *
 * Must match `SCOREBOARD_BUCKET` in `server/gcs.ts` (set via `.env.deploy`'s
 * `BUCKET_NAME` — see `scripts/deploy.sh`). Not read from an env var here since
 * this is a static `adapter-static` build with no server runtime; a bucket rename
 * means updating both by hand.
 */
const BUCKET_BASE_URL = 'https://storage.googleapis.com/cfb-scoreboard-data';

export interface WeekKey {
	seasonYear: number;
	seasonType: number;
	week: number;
}

function weekFileName({ seasonYear, seasonType, week }: WeekKey): string {
	return `games-${seasonYear}-${seasonType}-${week}.json`;
}

/**
 * Fetch one week's scoreboard from storage instead of live from ESPN.
 *
 * Mirrors `loadConferenceMap`'s failure style: returns `null` on any problem
 * (a week that hasn't been bootstrapped yet, a network error) rather than
 * throwing. Callers should fall back to a live ESPN fetch on `null` — see
 * `loadScoreboard` in `load.ts`, which also handles reconstituting the full
 * `Scoreboard` this returns a trimmed projection of (via `fromStoredScoreboard`
 * below).
 */
export async function loadStoredScoreboard(
	key: WeekKey,
	fetchImpl: typeof fetch = fetch
): Promise<StoredScoreboard | null> {
	try {
		const response = await fetchImpl(`${BUCKET_BASE_URL}/${weekFileName(key)}`);
		if (!response.ok) return null;

		const data = (await response.json()) as StoredScoreboard;
		return {
			...data,
			fetchedAt: new Date(data.fetchedAt),
			games: data.games.map((game) => ({ ...game, kickoff: new Date(game.kickoff) }))
		};
	} catch (error) {
		console.warn('Could not load stored scoreboard', error);
		return null;
	}
}

/**
 * `toStoredGame` (see `storedScoreboard.ts`) drops a handful of fields no
 * component reads (`Game.name`, `status.completed`, `status.detail`, ...), but
 * `Game`/`GameStatus` still declare them required — widening those types just to
 * accommodate storage would let a real live-data bug (e.g. a genuinely missing
 * name) slip through unnoticed. So they're reconstructed here instead, with
 * cheap stand-ins that are reasonable if anything ever does read them.
 */
function toGame(stored: StoredGame): Game {
	return {
		...stored,
		name: `${stored.away.displayName} at ${stored.home.displayName}`,
		status: {
			...stored.status,
			completed: stored.status.state === 'post' && !stored.status.canceled,
			detail: stored.status.shortDetail
		}
	};
}

/**
 * Reconstruct a full `Scoreboard` from a stored week plus the season's week
 * picker list — the stored file itself has no `weeks` (see `storedScoreboard.ts`
 * for why); `weeks` comes from `loadWeekOptions` instead. `skippedCount` is
 * always 0: unparseable ESPN events are dropped before `server/` ever writes a
 * file, so there's nothing left to count.
 */
export function fromStoredScoreboard(stored: StoredScoreboard, weeks: WeekOption[]): Scoreboard {
	return {
		week: stored.week,
		weeks,
		games: stored.games.map(toGame),
		fetchedAt: stored.fetchedAt,
		partialErrors: stored.partialErrors,
		skippedCount: 0
	};
}
