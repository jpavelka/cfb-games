import type { Game } from './types';

// Points a typical scoring drive is worth, for converting a point deviation
// into a "number of possessions" figure — a touchdown plus the extra try.
const POINTS_PER_POSSESSION = 8;

/**
 * Did the betting favorite lose, and how big a favorite were they? `0` when
 * they won outright. Otherwise scales with how lopsided the pregame win
 * probability was — a heavier favorite losing (or tying) is a bigger
 * surprise. Uses the moneyline-derived win percentages (not `spread`/
 * `favoriteHomeAway`, which come from an independent part of the odds
 * payload and can in principle disagree). `undefined` when the win
 * percentages aren't available.
 */
function computeS1(game: Game): number | undefined {
	const { homeWinPct, awayWinPct } = game.odds ?? {};
	if (homeWinPct === undefined || awayWinPct === undefined) return undefined;

	const favorite = homeWinPct >= awayWinPct ? game.home : game.away;
	const favoriteWinPct = Math.max(homeWinPct, awayWinPct);

	if (favorite.isWinner === true) return 0;
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
 * `undefined` when the spread or either team's final score isn't available,
 * or when the spread is non-zero but which side is favored isn't known
 * (direction doesn't matter for a `0` spread).
 */
function computeS2(game: Game): number | undefined {
	const { spread, favoriteHomeAway } = game.odds ?? {};
	const { score: homeScore } = game.home;
	const { score: awayScore } = game.away;

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

	const s1 = computeS1(game);
	const s2 = computeS2(game);
	if (s1 === undefined && s2 === undefined) return null;

	return Math.min(99, Math.round((s1 ?? 0) + (s2 ?? 0)));
}

interface HslStop {
	h: number;
	s: number;
	l: number;
}

// Fixed (not theme-dependent) fill for the surprise-score badge: flat gray
// through 25, amber at 60, red at 99. Deliberately doesn't share
// `matchupScoreColor`'s green high end — "great matchup" and "big upset" are
// different signals.
const SCORE_LOW: HslStop = { h: 0, s: 0, l: 68 };
const SCORE_MID: HslStop = { h: 45, s: 75, l: 58 };
const SCORE_HIGH: HslStop = { h: 355, s: 65, l: 55 };
const SCORE_LOW_THRESHOLD = 25;
const SCORE_MID_THRESHOLD = 60;

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function lerpStop(a: HslStop, b: HslStop, t: number): HslStop {
	return { h: lerp(a.h, b.h, t), s: lerp(a.s, b.s, t), l: lerp(a.l, b.l, t) };
}

/** Badge fill for a surprise score (0-99): gray (<=25) -> amber (60) -> red (99). */
export function surpriseScoreColor(score: number): string {
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
