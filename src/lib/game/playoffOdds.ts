import { base } from '$app/paths';

interface PlayoffOddsFile {
	teams: Record<string, { makePlayoff: number | null; winConference?: number | null }>;
}

/** ESPN team id -> chance (0-100) to make the CFB Playoff. FBS teams only; others are absent. */
export type PlayoffOddsMap = Map<string, number>;

/** ESPN team id -> chance (0-100) to win its conference. FBS teams only; others are absent. */
export type ConferenceOddsMap = Map<string, number>;

/**
 * Loaded from `static/data/playoff-odds.json` (see `scripts/fetch-playoff-odds.ts`),
 * refreshed daily by GitHub Actions. ESPN's FPI only covers FBS, so FCS/D2 teams
 * simply aren't in the map. A missing/unreadable file yields an empty map rather
 * than failing the page (mirrors `loadRatingMap`).
 */
export async function loadPlayoffOddsMap(fetchImpl: typeof fetch = fetch): Promise<PlayoffOddsMap> {
	return loadOddsMap(fetchImpl, (team) => team.makePlayoff);
}

/** Conference-title odds from the same file as `loadPlayoffOddsMap`, with the same failure handling. */
export async function loadConferenceOddsMap(
	fetchImpl: typeof fetch = fetch
): Promise<ConferenceOddsMap> {
	return loadOddsMap(fetchImpl, (team) => team.winConference);
}

async function loadOddsMap(
	fetchImpl: typeof fetch,
	pick: (team: PlayoffOddsFile['teams'][string]) => number | null | undefined
): Promise<Map<string, number>> {
	try {
		const response = await fetchImpl(`${base}/data/playoff-odds.json`);
		if (!response.ok) return new Map();
		const data = (await response.json()) as PlayoffOddsFile;
		const entries: [string, number][] = [];
		for (const [id, team] of Object.entries(data.teams)) {
			const value = pick(team);
			if (value !== null && value !== undefined) entries.push([id, value]);
		}
		return new Map(entries);
	} catch (error) {
		console.warn('Could not load playoff odds data', error);
		return new Map();
	}
}

/**
 * Whole-percent label. Anything under 1% — including an exact 0, which only means
 * the odds rounded to 0.0 in ESPN's simulations, not that the team is eliminated —
 * shows as "<1%". Never rounds up to "100%".
 */
export function formatPlayoffOdds(pct: number): string {
	if (pct < 1) return '<1%';
	if (pct > 99) return '>99%';
	return `${Math.round(pct)}%`;
}

/** A team at or above this chance (%) to make the playoff counts as a "probable playoff team". */
export const PLAYOFF_CONTENDER_THRESHOLD = 10;

export function isPlayoffContender(
	teamId: string,
	odds: PlayoffOddsMap,
	threshold: number = PLAYOFF_CONTENDER_THRESHOLD
): boolean {
	return (odds.get(teamId) ?? 0) >= threshold;
}

/** A team at or above this chance (%) to win its conference gets the trophy badge. */
export const CONFERENCE_CONTENDER_THRESHOLD = 10;

export function isConferenceContender(
	teamId: string,
	odds: ConferenceOddsMap,
	threshold: number = CONFERENCE_CONTENDER_THRESHOLD
): boolean {
	return (odds.get(teamId) ?? 0) >= threshold;
}

/**
 * Minimum playoff odds (%) for each playoff-odds team filter. `'playoff'` keeps
 * its original key (it's persisted in users' saved settings) and is the same
 * threshold the card badge uses.
 */
export const PLAYOFF_FILTER_THRESHOLDS = {
	playoff: PLAYOFF_CONTENDER_THRESHOLD,
	playoff25: 25,
	playoff50: 50
} as const;

/** The game's teams that are probable playoff teams, with their odds, for the card's tooltip. */
export function playoffContenders(
	game: { teams: readonly { id: string; location: string }[] },
	odds: PlayoffOddsMap
): { location: string; pct: number }[] {
	return game.teams
		.filter((team) => isPlayoffContender(team.id, odds))
		.map((team) => ({ location: team.location, pct: odds.get(team.id)! }));
}
