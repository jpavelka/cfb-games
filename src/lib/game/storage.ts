import type { StoredGame, StoredGameTeam, StoredScoreboard, StoredTeamFallback } from './storedScoreboard';
import type { TeamInfo, TeamMap } from './teams';
import type { Game, GameTeam, Scoreboard } from './types';
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
			nextRefreshAt: data.nextRefreshAt ? new Date(data.nextRefreshAt) : undefined,
			games: data.games.map((game) => ({ ...game, kickoff: new Date(game.kickoff) }))
		};
	} catch (error) {
		console.warn('Could not load stored scoreboard', error);
		return null;
	}
}

type TeamDisplayInfo = TeamInfo | StoredTeamFallback;

/**
 * A stored team carries only its id and live game state — its durable display
 * info (name/colors/logos/conference) is either inline as `fallback` (a team
 * outside FBS/FCS/D2, see `storedScoreboard.ts`) or has to be looked up from the
 * already-loaded `teams.json` map by id. Falls back to a minimal id-as-name stand-in
 * (and a console warning) in the unlikely case neither source has it — e.g. a
 * `teams.json` directory gap — so a single unresolved team can't blank the page.
 */
function resolveTeamDisplay(stored: StoredGameTeam, teams: TeamMap): TeamDisplayInfo {
	if (stored.fallback) return stored.fallback;

	const info = teams.get(stored.id);
	if (info) return info;

	console.warn(`No team info found for id ${stored.id} in teams.json — rendering a minimal stand-in`);
	return { location: stored.id, displayName: stored.id, abbreviation: stored.id };
}

function toGameTeam(stored: StoredGameTeam, teams: TeamMap): GameTeam {
	const info = resolveTeamDisplay(stored, teams);

	return {
		id: stored.id,
		homeAway: stored.homeAway,
		location: info.location,
		name: info.name,
		displayName: info.displayName,
		abbreviation: info.abbreviation,
		logoUrl: info.logoUrl,
		darkLogoUrl: info.darkLogoUrl,
		color: info.color,
		altColor: info.altColor,
		conferenceId: info.conferenceId,
		rank: stored.rank,
		record: stored.record,
		conferenceRecord: stored.conferenceRecord,
		score: stored.score,
		isWinner: stored.isWinner
	};
}

/**
 * `toStoredGame` (see `storedScoreboard.ts`) drops a handful of fields no
 * component reads (`Game.name`, `status.completed`, `status.detail`, ...), but
 * `Game`/`GameStatus` still declare them required — widening those types just to
 * accommodate storage would let a real live-data bug (e.g. a genuinely missing
 * name) slip through unnoticed. So they're reconstructed here instead, with
 * cheap stand-ins that are reasonable if anything ever does read them. Team
 * display info is reconstructed the same way, joined against `teams.json` (or a
 * game's own `fallback`) via `toGameTeam`.
 *
 * `shortName` and `espnUrl` *are* read elsewhere (sort tiebreak, Gamecast link)
 * but don't need storing: `espnUrl` is a pure function of the game id, and
 * `shortName` only needs to be a stable per-game string, not ESPN's exact value
 * — same fallback `transform.ts` uses when ESPN itself omits it.
 */
function toGame(stored: StoredGame, teams: TeamMap): Game {
	const away = toGameTeam(stored.away, teams);
	const home = toGameTeam(stored.home, teams);

	return {
		...stored,
		away,
		home,
		teams: [away, home],
		name: `${away.displayName} at ${home.displayName}`,
		shortName: `${away.abbreviation} @ ${home.abbreviation}`,
		espnUrl: `https://www.espn.com/college-football/game/_/gameId/${stored.id}`,
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
 * file, so there's nothing left to count. `teams` is the already-loaded
 * `teams.json` map (see `$lib/game/teams`), used to resolve each `StoredGameTeam`
 * back into a full `GameTeam`.
 */
export function fromStoredScoreboard(stored: StoredScoreboard, weeks: WeekOption[], teams: TeamMap): Scoreboard {
	return {
		week: stored.week,
		weeks,
		games: stored.games.map((game) => toGame(game, teams)),
		fetchedAt: stored.fetchedAt,
		nextRefreshAt: stored.nextRefreshAt,
		partialErrors: stored.partialErrors,
		skippedCount: 0
	};
}
