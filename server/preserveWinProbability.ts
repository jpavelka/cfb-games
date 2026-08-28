import type { Game, GameSituation } from '../src/lib/game/types';
import type { StoredGame } from '../src/lib/game/storedScoreboard';

/**
 * ESPN doesn't compute a win-probability value for every play type — confirmed
 * by polling live games: PAT/extra-point plays consistently lack
 * `situation.lastPlay.probability` even mid-game, and some games' `situation`
 * goes fully empty for a poll or two despite being genuinely in progress (ESPN
 * just isn't populating play-by-play for that game at that moment). Left
 * alone, the live win-probability bar would flicker on and off between a poll
 * landing on a "real" scrimmage play vs. one of these gaps.
 *
 * Once a game has shown a live win probability, keep serving that number (a
 * PAT barely moves true win probability anyway) until a newer one replaces it
 * or the game stops being live — same "keep the last known good value" rule
 * `preservePregameOdds` applies to betting odds, just for a different field.
 *
 * No I/O here on purpose, same rule as `reschedule.ts`/`preserveOdds.ts` — pure
 * so it can be unit-tested with plain fixtures; `refreshWeek` in `index.ts` is
 * the only place that reads the previous file.
 */
export function preserveLiveWinProbability(freshGames: Game[], previousGames: StoredGame[] | undefined): Game[] {
	if (!previousGames?.length) return freshGames;

	const previousWinProb = new Map<string, Pick<GameSituation, 'homeWinPct' | 'awayWinPct'>>();
	for (const game of previousGames) {
		if (game.situation?.homeWinPct !== undefined && game.situation.awayWinPct !== undefined) {
			previousWinProb.set(game.id, {
				homeWinPct: game.situation.homeWinPct,
				awayWinPct: game.situation.awayWinPct
			});
		}
	}

	return freshGames.map((game) => {
		// Only meaningful while live — a final game's `situation` disappearing
		// entirely is correct, expected behavior, not a gap to paper over.
		if (game.status.state !== 'in') return game;
		if (game.situation?.homeWinPct !== undefined && game.situation.awayWinPct !== undefined) return game;

		const preserved = previousWinProb.get(game.id);
		if (!preserved) return game;

		return { ...game, situation: { ...game.situation, ...preserved } };
	});
}
