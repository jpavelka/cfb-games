import { scoreBadgeColor } from './scoreColor';
import type { Game } from './types';

// Points a typical scoring drive is worth, for converting a point deviation
// into a "number of possessions" figure — a touchdown plus the extra try.
const POINTS_PER_POSSESSION = 8;

/**
 * Did the betting favorite lose, and how big a favorite were they? `0` when
 * they're ahead (or won outright, for a final score). Otherwise scales with
 * how lopsided the pregame win probability was — a heavier favorite losing
 * (or tying) is a bigger surprise. Uses the moneyline-derived win
 * percentages (not `spread`/`favoriteHomeAway`, which come from an
 * independent part of the odds payload and can in principle disagree).
 * `undefined` when the win percentages aren't available.
 *
 * `homeAhead` is the caller's read of who's ahead on the scoreboard —
 * `isWinner` for a final game, a live score comparison otherwise.
 */
function computeS1(game: Game, homeAhead: boolean): number | undefined {
	const { homeWinPct, awayWinPct } = game.odds ?? {};
	if (homeWinPct === undefined || awayWinPct === undefined) return undefined;

	const favoriteWon = homeWinPct >= awayWinPct ? homeAhead : !homeAhead;
	if (favoriteWon) return 0;

	const favoriteWinPct = Math.max(homeWinPct, awayWinPct);
	return 2 * (favoriteWinPct - 50);
}

/**
 * The margin component, in "possessions" (see `POINTS_PER_POSSESSION`). When
 * the underdog wins outright, this is just their winning margin — s1 already
 * credits the upset itself, so this only needs to add the extra "and they
 * won by this much" on top, weighted at the standard 15 points/possession.
 *
 * When the favorite wins (or it's a tie), it's how far the final margin
 * missed the spread, weighted by a coefficient that shrinks the more
 * possessions the favorite was already expected to win by — covering a
 * given team by 4 possessions is a bigger surprise for a 1-possession
 * favorite than for a 4-possession favorite, even though both missed the
 * spread by the same amount. Floored at `0` so a lopsided favorite winning
 * even bigger than expected can't drag the score negative.
 *
 * `undefined` when the spread or either team's score isn't available, or
 * when the spread is non-zero but which side is favored isn't known
 * (direction doesn't matter for a `0` spread).
 */
function computeS2(
	game: Game,
	homeScore: number | undefined,
	awayScore: number | undefined
): number | undefined {
	const { spread, favoriteHomeAway } = game.odds ?? {};

	if (spread === undefined || homeScore === undefined || awayScore === undefined) {
		return undefined;
	}
	if (spread !== 0 && favoriteHomeAway === undefined) return undefined;

	const favoriteScore = favoriteHomeAway === 'away' ? awayScore : homeScore;
	const underdogScore = favoriteHomeAway === 'away' ? homeScore : awayScore;
	const favoriteMargin = favoriteScore - underdogScore;

	if (favoriteMargin < 0) {
		return (15 * -favoriteMargin) / POINTS_PER_POSSESSION;
	}

	const possessionsFavored = spread / POINTS_PER_POSSESSION;
	const coefficient = Math.max(0, 15 - 2 * possessionsFavored);
	const possessions = Math.abs(favoriteMargin - spread) / POINTS_PER_POSSESSION;

	return coefficient * possessions;
}

/**
 * How shocking a completed game's result was (0-99), or `null` for a game
 * that isn't final yet (or was canceled/postponed) — a live score isn't a
 * final one, and `null` before/without a result rather than guessing.
 *
 * Combines two independent reads, each contributing `0` when it can't be
 * computed: whether the favorite lost and by how much they were favored, and
 * the margin component described on `computeS2`. `null` only when *neither*
 * can be computed at all.
 */
export function surpriseScore(game: Game): number | null {
	if (game.status.state !== 'post' || game.status.canceled || game.status.postponed) {
		return null;
	}

	const s1 = computeS1(game, game.home.isWinner === true);
	const s2 = computeS2(game, game.home.score, game.away.score);
	if (s1 === undefined && s2 === undefined) return null;

	return Math.min(99, Math.round((s1 ?? 0) + (s2 ?? 0)));
}

/**
 * Which side pregame odds favor, preferring the moneyline-derived win
 * percentages and falling back to the spread's `favoriteHomeAway` when
 * those aren't available (the same fallback order `computeS2` relies on
 * for direction). `undefined` when neither is available.
 */
function pregameFavoriteSide(game: Game): 'home' | 'away' | undefined {
	const { homeWinPct, awayWinPct, favoriteHomeAway } = game.odds ?? {};
	if (homeWinPct !== undefined && awayWinPct !== undefined) {
		return homeWinPct >= awayWinPct ? 'home' : 'away';
	}
	return favoriteHomeAway;
}

/**
 * How shocking a game would be if it ended with the score as it currently
 * stands (0-99), discounted by how likely the currently-leading team is to
 * actually hold on, per ESPN's live win probability model
 * (`GameSituation.homeWinPct`/`awayWinPct`). `null` before kickoff, once
 * final (see `surpriseScore` for that case), or if canceled/postponed.
 *
 * Computes S1 + S2 exactly as `surpriseScore` does, but against the
 * *current* score in place of the final one — S1 still reads the
 * *pregame* favorite/win%, since that's the baseline this is measuring
 * surprise against, not anything live. That total is then scaled by the
 * live win probability of whichever team is currently ahead: a big
 * hypothetical upset that's still a toss-up shouldn't score the same as
 * one the trailing favorite has already all but lost.
 *
 * A tied score has no "leading team" to price a live win probability for,
 * so it's broken by crediting the pregame underdog with one extra point
 * first — a tie against a real favorite already reads as a shock in the
 * underdog's favor. `null` if that tie can't be broken (no pregame
 * favorite either way), if the leading team's live win probability isn't
 * available yet (ESPN's model doesn't publish on the very first snapshot
 * of a game), or if neither S1 nor S2 can be computed at all.
 */
export function liveSurpriseScore(game: Game): number | null {
	if (game.status.state !== 'in') return null;

	const { score: homeScore } = game.home;
	const { score: awayScore } = game.away;
	if (homeScore === undefined || awayScore === undefined) return null;

	let adjHomeScore = homeScore;
	let adjAwayScore = awayScore;
	if (homeScore === awayScore) {
		const favorite = pregameFavoriteSide(game);
		if (favorite === undefined) return null;
		if (favorite === 'home') adjAwayScore += 1;
		else adjHomeScore += 1;
	}

	const homeAhead = adjHomeScore > adjAwayScore;
	const leadingWinPct = homeAhead ? game.situation?.homeWinPct : game.situation?.awayWinPct;
	if (leadingWinPct === undefined) return null;

	const s1 = computeS1(game, homeAhead);
	const s2 = computeS2(game, adjHomeScore, adjAwayScore);
	if (s1 === undefined && s2 === undefined) return null;

	const r = (s1 ?? 0) + (s2 ?? 0);
	return Math.min(99, Math.round(r * (leadingWinPct / 100)));
}

/** Badge fill for a surprise score (0-99) — same scale as the matchup-score badge, see `scoreBadgeColor`. */
export const surpriseScoreColor = scoreBadgeColor;
