import { scoreBadgeColor } from './scoreColor';
import type { Game } from './types';

// Regulation length in minutes (4 x 15-minute quarters). Overtime periods
// don't have a fixed length, so they're handled separately below.
const REGULATION_MINUTES = 60;
const MINUTES_PER_PERIOD = 15;

// The time factor reaches its ceiling of 1 once this many minutes remain (or
// less) — first-draft threshold, easy to retune later.
const FACTOR_CEILING_MINUTES_LEFT = 5;

// Flat score for any overtime period, regardless of win probability — see `situationScore`.
const OVERTIME_SITUATION_SCORE = 99;

// A close score with this many minutes left (or fewer) is tense regardless of
// what the win-probability model says — see `situationScore`.
const LATE_GAME_MINUTES_LEFT = 5;
const TIE_LATE_MINIMUM_SCORE = 95;

// "One score" is a two-possession game or closer (touchdown + 2-point try).
const ONE_SCORE_MARGIN = 8;
const ONE_SCORE_LOSER_HAS_BALL_MINIMUM_SCORE = 90;
const ONE_SCORE_MINIMUM_SCORE = 60;

// Base score (before the time factor) is 99 for any favorite win% at or
// below this — a toss-up or near toss-up is maximally undecided — ramping
// linearly down to 0 once the favorite's win% reaches BASE_WIN_PCT_LOCK.
const BASE_WIN_PCT_TOSS_UP = 60;
const BASE_WIN_PCT_LOCK = 99;

/** "12:34" -> 12.5666..., or `undefined` if ESPN's displayClock isn't in that shape. */
function parseClockMinutesRemaining(displayClock: string | undefined): number | undefined {
	const match = displayClock ? /^(\d+):(\d{2})$/.exec(displayClock.trim()) : null;
	if (!match) return undefined;
	return Number(match[1]) + Number(match[2]) / 60;
}

/**
 * Regulation time remaining, read off the current quarter and its clock.
 * `undefined` if the clock isn't in ESPN's usual "mm:ss" shape. Not meant to
 * be called for overtime periods — see the flat 99 override in
 * `situationScore`.
 */
export function minutesLeftInGame(period: number, displayClock: string | undefined): number | undefined {
	const clockMinutes = parseClockMinutesRemaining(displayClock);
	if (clockMinutes === undefined) return undefined;
	return (4 - period) * MINUTES_PER_PERIOD + clockMinutes;
}

/** 0 at kickoff, scaling linearly up to 1 once `FACTOR_CEILING_MINUTES_LEFT` minutes or fewer remain. */
export function timeFactor(minutesLeft: number): number {
	const t =
		(REGULATION_MINUTES - minutesLeft) / (REGULATION_MINUTES - FACTOR_CEILING_MINUTES_LEFT);
	return Math.max(0, Math.min(1, t));
}

/** 99 at a toss-up, ramping linearly down to 0 as the favorite's win% approaches a lock. */
function baseFromFavoriteWinPct(favoriteWinPct: number): number {
	const t =
		(favoriteWinPct - BASE_WIN_PCT_TOSS_UP) / (BASE_WIN_PCT_LOCK - BASE_WIN_PCT_TOSS_UP);
	return Math.round(99 * (1 - Math.max(0, Math.min(1, t))));
}

/**
 * How much a live game is worth watching right now (0-99), or `null` when
 * it can't be computed — before/after the game, or before ESPN's live
 * win-probability model has started producing numbers (see
 * `GameSituation.homeWinPct`/`awayWinPct`).
 *
 * A few overrides come before the usual math, since each describes a game
 * that's tense no matter what a model says, with `LATE_GAME_MINUTES_LEFT`
 * minutes left or fewer: overtime is always a flat `OVERTIME_SITUATION_SCORE`;
 * a tied score is floored at `TIE_LATE_MINIMUM_SCORE`; and a one-score game
 * (within `ONE_SCORE_MARGIN` points) is floored at
 * `ONE_SCORE_LOSER_HAS_BALL_MINIMUM_SCORE` if the trailing team has the ball,
 * or `ONE_SCORE_MINIMUM_SCORE` otherwise.
 *
 * Short of those, first draft: 99 for any favorite win% at or below
 * `BASE_WIN_PCT_TOSS_UP`, ramping linearly down to 0 once the favorite's
 * win% reaches `BASE_WIN_PCT_LOCK` — how undecided the game currently is —
 * scaled by how late in the game it is, since a toss-up with 55 minutes
 * left is much less tense than the same toss-up with 2 minutes left. That
 * time factor is 0 at kickoff and ramps linearly to 1 with
 * `FACTOR_CEILING_MINUTES_LEFT` minutes left in regulation.
 */
export function situationScore(game: Game): number | null {
	if (game.status.state !== 'in') return null;

	const { period } = game.status;
	if (period === undefined) return null;
	if (period >= 5) return OVERTIME_SITUATION_SCORE;

	const minutesLeft = minutesLeftInGame(period, game.status.displayClock);
	if (minutesLeft === undefined) return null;

	const floor = lateGameFloor(game, minutesLeft);

	const { homeWinPct, awayWinPct } = game.situation ?? {};
	if (homeWinPct === undefined || awayWinPct === undefined) return floor ?? null;

	const base = baseFromFavoriteWinPct(Math.max(homeWinPct, awayWinPct));
	const score = Math.round(base * timeFactor(minutesLeft));
	return floor !== undefined ? Math.max(score, floor) : score;
}

/**
 * The minimum score a late, close game gets regardless of what the
 * win-probability model says — see the overrides described on
 * `situationScore`. `undefined` when no override applies (not late enough,
 * or too big a margin), including when the score isn't available yet.
 */
function lateGameFloor(game: Game, minutesLeft: number): number | undefined {
	if (minutesLeft > LATE_GAME_MINUTES_LEFT) return undefined;

	const { score: homeScore } = game.home;
	const { score: awayScore } = game.away;
	if (homeScore === undefined || awayScore === undefined) return undefined;

	const margin = homeScore - awayScore;
	if (margin === 0) return TIE_LATE_MINIMUM_SCORE;
	if (Math.abs(margin) > ONE_SCORE_MARGIN) return undefined;

	const losingTeam = margin > 0 ? game.away : game.home;
	const loserHasBall = game.situation?.possessionTeamId === losingTeam.id;
	return loserHasBall ? ONE_SCORE_LOSER_HAS_BALL_MINIMUM_SCORE : ONE_SCORE_MINIMUM_SCORE;
}

/** Badge fill for a situation score (0-99) — same scale as the matchup/surprise badges, see `scoreBadgeColor`. */
export const situationScoreColor = scoreBadgeColor;
