import { base } from '$app/paths';
import { surpriseScore } from './surprise';
import type { Game, GameTeam } from './types';

interface RatingsFile {
	teams: Record<string, { rating: number }>;
}

/** ESPN team id -> team strength, rescaled to 1-99. */
export type RatingMap = Map<string, number>;

/**
 * Loaded from `static/data/sagarin.json` (see `scripts/fetch-sagarin-ratings.ts`),
 * refreshed by GitHub Actions — not fetched live at view time. Sagarin's raw
 * ratings have no fixed scale, so they're linearly rescaled here: the lowest
 * rating in the file maps to 1, the highest to 99. A missing/unreadable file
 * yields an empty map rather than failing the page (mirrors `loadConferenceMap`).
 */
export async function loadRatingMap(fetchImpl: typeof fetch = fetch): Promise<RatingMap> {
	try {
		const response = await fetchImpl(`${base}/data/sagarin.json`);
		if (!response.ok) return new Map();

		const data = (await response.json()) as RatingsFile;
		const ratings = Object.values(data.teams).map((team) => team.rating);
		if (ratings.length === 0) return new Map();

		const min = Math.min(...ratings);
		const max = Math.max(...ratings);
		const span = max - min;

		return new Map(
			Object.entries(data.teams).map(([id, team]) => [
				id,
				span === 0 ? 50 : 1 + ((team.rating - min) / span) * 98
			])
		);
	} catch (error) {
		console.warn('Could not load Sagarin rating data', error);
		return new Map();
	}
}

/** This team's strength (1-99), or 0 when it isn't in `ratings`. */
export function teamStrength(team: GameTeam, ratings: RatingMap): number {
	return Math.round(ratings.get(team.id) ?? 0);
}

/**
 * How appealing this matchup is (0-99): 70 points for how strong the two teams
 * are combined, 35 for how evenly matched they are, capped at 99.
 *
 * Evenness takes the more favorable of two reads: the moneyline-implied win
 * probability (a live market's take on the specific matchup) and the teams'
 * strength gap — whichever says the game is closer.
 *
 * `null` when either side is still a TBD placeholder (an unset playoff/bowl
 * slot) — there's no team to rate yet.
 */
export function matchupScore(game: Game, ratings: RatingMap): number | null {
	const [away, home] = game.teams;
	if (away.location === 'TBD' || home.location === 'TBD') return null;

	const strengthAway = teamStrength(away, ratings);
	const strengthHome = teamStrength(home, ratings);

	const strengthMult = Math.min(1, (strengthAway + strengthHome) / 200);
	const strengthPoints = 70 * strengthMult;

	const strengthEquality = 1 - Math.abs(strengthHome - strengthAway) / 100;

	const { homeWinPct, awayWinPct } = game.odds ?? {};
	const winProbEquality =
		homeWinPct !== undefined && awayWinPct !== undefined
			? 1 - Math.abs(homeWinPct / 100 - awayWinPct / 100)
			: undefined;

	const equalityPoints = 35 * (Math.min(1, strengthMult + 0.2)) * Math.max(strengthEquality, winProbEquality ?? -Infinity);

	return Math.min(99, Math.round(strengthPoints + equalityPoints));
}

interface HslStop {
	h: number;
	s: number;
	l: number;
}

// Fixed (not theme-dependent) fill for the matchup-score badge: flat gray
// through 30, amber at 65, green at 99. All three sit in the same lightness band
// so one dark ink color reads clearly across the whole range (checked: >=6.3:1
// contrast against #1a1a1a at every stop).
const SCORE_LOW: HslStop = { h: 0, s: 0, l: 68 };
const SCORE_MID: HslStop = { h: 45, s: 75, l: 58 };
const SCORE_HIGH: HslStop = { h: 130, s: 45, l: 48 };
const SCORE_LOW_THRESHOLD = 30;
const SCORE_MID_THRESHOLD = 65;

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function lerpStop(a: HslStop, b: HslStop, t: number): HslStop {
	return { h: lerp(a.h, b.h, t), s: lerp(a.s, b.s, t), l: lerp(a.l, b.l, t) };
}

/** Badge fill for a matchup score (0-99): gray (<=30) -> amber (65) -> green (99). */
export function matchupScoreColor(score: number): string {
	const clamped = Math.max(0, Math.min(99, score));
	const stop =
		clamped <= SCORE_LOW_THRESHOLD
			? SCORE_LOW
			: clamped <= SCORE_MID_THRESHOLD
				? lerpStop(
						SCORE_LOW,
						SCORE_MID,
						(clamped - SCORE_LOW_THRESHOLD) / (SCORE_MID_THRESHOLD - SCORE_LOW_THRESHOLD)
					)
				: lerpStop(
						SCORE_MID,
						SCORE_HIGH,
						(clamped - SCORE_MID_THRESHOLD) / (99 - SCORE_MID_THRESHOLD)
					);
	return `hsl(${stop.h} ${stop.s}% ${stop.l}%)`;
}

export interface FavoriteSort {
	teamIds: ReadonlySet<string>;
	handling: 'top' | 'boost' | 'none';
	/** Only used when `handling` is `'boost'`. */
	boostAmount: number;
}

function isFavoriteGame(game: Game, teamIds: ReadonlySet<string>): boolean {
	return game.teams.some((team) => teamIds.has(team.id));
}

/** Which 0-99 score `sortByInterest` ranks on — see `matchupScore` and `surpriseScore`. */
export type InterestMetric = 'matchup' | 'surprise';

function metricScore(metric: InterestMetric, game: Game, ratings: RatingMap): number | null {
	return metric === 'matchup' ? matchupScore(game, ratings) : surpriseScore(game);
}

/**
 * The score `sortByInterest` compares on: `metric`, boosted for favorite teams
 * when `favorites.handling` is `'boost'`. A TBD side (`null` score) can't be
 * boosted — there's no team to be a favorite of yet.
 */
function sortScore(
	metric: InterestMetric,
	game: Game,
	ratings: RatingMap,
	favorites: FavoriteSort | undefined
): number | null {
	const base = metricScore(metric, game, ratings);
	if (base === null || favorites?.handling !== 'boost') return base;
	return isFavoriteGame(game, favorites.teamIds) ? base + favorites.boostAmount : base;
}

/** User-adjustable multipliers for `matchupScore` and `surpriseScore` when blending them into the Completed section's sort key — see `combinedScore`. */
export interface ScoreWeights {
	matchup: number;
	surprise: number;
}

/**
 * `weights.matchup * matchupScore + weights.surprise * surpriseScore`. A null
 * component (a TBD side, or no odds data to compute a surprise score) counts
 * as `0` rather than dropping the game, so a game missing just one score
 * still sorts by whichever it has. `null` only when both are null — nothing
 * at all to rank the game on.
 */
function combinedScore(game: Game, ratings: RatingMap, weights: ScoreWeights): number | null {
	const matchup = matchupScore(game, ratings);
	const surprise = surpriseScore(game);
	if (matchup === null && surprise === null) return null;
	return weights.matchup * (matchup ?? 0) + weights.surprise * (surprise ?? 0);
}

/** `combinedScore`, boosted for favorite teams — mirrors `sortScore`. */
function combinedSortScore(
	game: Game,
	ratings: RatingMap,
	weights: ScoreWeights,
	favorites: FavoriteSort | undefined
): number | null {
	const base = combinedScore(game, ratings, weights);
	if (base === null || favorites?.handling !== 'boost') return base;
	return isFavoriteGame(game, favorites.teamIds) ? base + favorites.boostAmount : base;
}

/**
 * Most interesting matchup first. Games with no score yet (a TBD side) sink to
 * the end rather than being guessed at; ties on `metric` fall through to
 * `tiebreakMetric` (unboosted — the boost only applies to the primary sort)
 * when given, then to `shortName` so the order stays stable across re-renders.
 *
 * When `favorites.handling` is `'top'`, games involving a favorite team are
 * pinned ahead of every other game (favorite-vs-favorite and non-favorite
 * games each keep their own score order). `'boost'` instead adds
 * `favorites.boostAmount` to a favorite game's score before comparing, so it
 * outranks similarly-appealing games without always winning outright.
 */
export function sortByInterest(
	games: readonly Game[],
	ratings: RatingMap,
	favorites?: FavoriteSort,
	options?: { metric?: InterestMetric; tiebreakMetric?: InterestMetric }
): Game[] {
	const metric = options?.metric ?? 'matchup';
	const tiebreakMetric = options?.tiebreakMetric;

	return [...games].sort((a, b) => {
		if (favorites?.handling === 'top') {
			const favA = isFavoriteGame(a, favorites.teamIds);
			const favB = isFavoriteGame(b, favorites.teamIds);
			if (favA !== favB) return favA ? -1 : 1;
		}

		const scoreA = sortScore(metric, a, ratings, favorites);
		const scoreB = sortScore(metric, b, ratings, favorites);
		if (scoreA !== scoreB) {
			if (scoreA === null) return 1;
			if (scoreB === null) return -1;
			return scoreB - scoreA;
		}

		if (tiebreakMetric) {
			const tieA = metricScore(tiebreakMetric, a, ratings);
			const tieB = metricScore(tiebreakMetric, b, ratings);
			if (tieA !== tieB) {
				if (tieA === null) return 1;
				if (tieB === null) return -1;
				return tieB - tieA;
			}
		}

		return a.shortName.localeCompare(b.shortName);
	});
}

/**
 * Completed-section sort driven by a user-tunable blend of matchup and
 * surprise scores — see `combinedScore`. Otherwise mirrors `sortByInterest`:
 * a null combined score (both components null) sinks to the end, `favorites`
 * pinning/boosting works the same way, and ties fall through to `shortName`
 * for a stable order.
 */
export function sortByCombinedScore(
	games: readonly Game[],
	ratings: RatingMap,
	weights: ScoreWeights,
	favorites?: FavoriteSort
): Game[] {
	return [...games].sort((a, b) => {
		if (favorites?.handling === 'top') {
			const favA = isFavoriteGame(a, favorites.teamIds);
			const favB = isFavoriteGame(b, favorites.teamIds);
			if (favA !== favB) return favA ? -1 : 1;
		}

		const scoreA = combinedSortScore(a, ratings, weights, favorites);
		const scoreB = combinedSortScore(b, ratings, weights, favorites);
		if (scoreA !== scoreB) {
			if (scoreA === null) return 1;
			if (scoreB === null) return -1;
			return scoreB - scoreA;
		}

		return a.shortName.localeCompare(b.shortName);
	});
}
