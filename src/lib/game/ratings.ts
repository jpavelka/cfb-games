import { base } from '$app/paths';
import { scoreBadgeColor } from './scoreColor';
import { situationScore } from './situationScore';
import { liveSurpriseScore, surpriseScore } from './surprise';
import type { Game, GameTeam } from './types';

interface RatingsFile {
	/** YYYY-MM-DD, the date Sagarin's site says these ratings are current through. */
	asOf?: string;
	teams: Record<string, { rating: number }>;
}

/** ESPN team id -> team strength, rescaled to 1-99. */
export type RatingMap = Map<string, number>;

async function loadRatingsFile(fetchImpl: typeof fetch): Promise<RatingsFile | undefined> {
	try {
		const response = await fetchImpl(`${base}/data/sagarin.json`);
		if (!response.ok) return undefined;
		return (await response.json()) as RatingsFile;
	} catch (error) {
		console.warn('Could not load Sagarin rating data', error);
		return undefined;
	}
}

/**
 * Loaded from `static/data/sagarin.json` (see `scripts/fetch-sagarin-ratings.ts`),
 * refreshed by GitHub Actions — not fetched live at view time. Sagarin's raw
 * ratings have no fixed scale, so they're linearly rescaled here: the lowest
 * rating in the file maps to 1, the highest to 99. A missing/unreadable file
 * yields an empty map rather than failing the page (mirrors `loadConferenceMap`).
 */
export async function loadRatingMap(fetchImpl: typeof fetch = fetch): Promise<RatingMap> {
	const data = await loadRatingsFile(fetchImpl);
	if (!data) return new Map();

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
}

/**
 * The date (YYYY-MM-DD) Sagarin's ratings are current through, shown in the
 * About modal — same source file as `loadRatingMap`, SvelteKit's `fetch`
 * dedupes the two calls during a single `load` into one request.
 */
export async function loadSagarinAsOf(fetchImpl: typeof fetch = fetch): Promise<string | undefined> {
	const data = await loadRatingsFile(fetchImpl);
	return data?.asOf;
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

/** Badge fill for a matchup score (0-99) — see `scoreBadgeColor`. */
export const matchupScoreColor = scoreBadgeColor;

export interface FavoriteSort {
	teamIds: ReadonlySet<string>;
	handling: 'top' | 'boost' | 'none';
	/** Only used when `handling` is `'boost'`. */
	boostAmount: number;
}

function isFavoriteGame(game: Game, teamIds: ReadonlySet<string>): boolean {
	return game.teams.some((team) => teamIds.has(team.id));
}

/**
 * Which score `sortByInterest` ranks on — see `matchupScore`, `surpriseScore`
 * (final score, falling back to the live in-progress one), and
 * `situationScore` (live only).
 */
export type InterestMetric = 'matchup' | 'surprise' | 'situation';

function metricScore(metric: InterestMetric, game: Game, ratings: RatingMap): number | null {
	if (metric === 'matchup') return matchupScore(game, ratings);
	if (metric === 'situation') return situationScore(game);
	return surpriseScore(game) ?? liveSurpriseScore(game);
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

/** User-adjustable multipliers for `matchupScore`, `situationScore`, and the surprise score when blending them into the Current section's sort key — see `combinedCurrentScore`. */
export interface CurrentScoreWeights {
	matchup: number;
	situation: number;
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
 * `weights.matchup * matchupScore + weights.situation * situationScore +
 * weights.surprise * surpriseScore`, for the Current section's three-slider
 * blend — mirrors `combinedScore`. The weights are independent sliders, not
 * a normalized split, but that's fine: only their size relative to each
 * other affects sort order. A null component (no live win-probability data
 * yet, a TBD side, no odds to compute a surprise score) counts as `0` rather
 * than dropping the game. `null` only when all three are null.
 */
function combinedCurrentScore(
	game: Game,
	ratings: RatingMap,
	weights: CurrentScoreWeights
): number | null {
	const matchup = matchupScore(game, ratings);
	const situation = situationScore(game);
	const surprise = surpriseScore(game) ?? liveSurpriseScore(game);
	if (matchup === null && situation === null && surprise === null) return null;
	return (
		weights.matchup * (matchup ?? 0) +
		weights.situation * (situation ?? 0) +
		weights.surprise * (surprise ?? 0)
	);
}

/** `combinedCurrentScore`, boosted for favorite teams — mirrors `sortScore`. */
function combinedCurrentSortScore(
	game: Game,
	ratings: RatingMap,
	weights: CurrentScoreWeights,
	favorites: FavoriteSort | undefined
): number | null {
	const base = combinedCurrentScore(game, ratings, weights);
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

/**
 * Current-section sort driven by a user-tunable three-way blend of
 * situation, matchup, and surprise scores — see `combinedCurrentScore`.
 * Otherwise mirrors `sortByCombinedScore`.
 */
export function sortByCombinedCurrentScore(
	games: readonly Game[],
	ratings: RatingMap,
	weights: CurrentScoreWeights,
	favorites?: FavoriteSort
): Game[] {
	return [...games].sort((a, b) => {
		if (favorites?.handling === 'top') {
			const favA = isFavoriteGame(a, favorites.teamIds);
			const favB = isFavoriteGame(b, favorites.teamIds);
			if (favA !== favB) return favA ? -1 : 1;
		}

		const scoreA = combinedCurrentSortScore(a, ratings, weights, favorites);
		const scoreB = combinedCurrentSortScore(b, ratings, weights, favorites);
		if (scoreA !== scoreB) {
			if (scoreA === null) return 1;
			if (scoreB === null) return -1;
			return scoreB - scoreA;
		}

		return a.shortName.localeCompare(b.shortName);
	});
}
