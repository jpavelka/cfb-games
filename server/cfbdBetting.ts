import type { BettingFallbackEntry } from '../src/lib/game/bettingFallback';

/**
 * Shared shape between collegefootballdata.com's `/lines` and `/metrics/wp/pregame`
 * responses and the merge that turns them into `BettingFallbackEntry` records — used
 * by `refreshBetting` in `index.ts`, the once-daily job that builds the betting
 * fallback file `refreshWeek` reads back (see `applyBettingFallback`).
 */

export interface CfbdLine {
	provider: string;
	spread: number | null;
	overUnder: number | null;
	homeMoneyline: number | null;
	awayMoneyline: number | null;
}

export interface CfbdGameLines {
	id: number;
	lines: CfbdLine[];
}

export interface CfbdPregameWinProbability {
	gameId: number;
	homeWinProbability: number;
}

/**
 * Merges CFBD's betting lines and pregame win probability by game id into the
 * betting-fallback file shape. Only the first-listed provider per game is kept —
 * this is a fallback for missing ESPN odds, not a full odds-comparison feature,
 * so one provider is enough.
 */
export function mergeCfbdBetting(
	lines: CfbdGameLines[],
	winProbabilities: CfbdPregameWinProbability[]
): Record<string, BettingFallbackEntry> {
	const betting: Record<string, BettingFallbackEntry> = {};

	for (const game of lines) {
		const first = game.lines[0];
		if (!first) continue;

		betting[String(game.id)] = {
			provider: first.provider,
			spread: first.spread ?? undefined,
			overUnder: first.overUnder ?? undefined,
			homeMoneyline: first.homeMoneyline ?? undefined,
			awayMoneyline: first.awayMoneyline ?? undefined
		};
	}

	for (const wp of winProbabilities) {
		const key = String(wp.gameId);
		betting[key] = { ...betting[key], homeWinProbability: wp.homeWinProbability };
	}

	return betting;
}
