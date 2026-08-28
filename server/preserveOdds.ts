import type { Game, GameOdds } from '../src/lib/game/types';
import type { StoredGame } from '../src/lib/game/storedScoreboard';

/**
 * ESPN drops `competition.odds` entirely once a game goes live, and never brings
 * it back — confirmed by polling `situation`/`odds` on actual in-progress games
 * (see the live-win-probability investigation). Left alone, `refreshWeek`'s next
 * poll would overwrite a game's already-captured pregame odds with nothing, and
 * `applyBettingFallback` (client-side) has nothing to fill that gap with when
 * CFBD never had a line for the game either — see `bettingFallback.ts`.
 *
 * No I/O here on purpose, same rule as `reschedule.ts` — pure so it can be
 * unit-tested with plain fixtures; `refreshWeek` in `index.ts` is the only place
 * that reads the previous file.
 */
export function preservePregameOdds(freshGames: Game[], previousGames: StoredGame[] | undefined): Game[] {
	if (!previousGames?.length) return freshGames;

	const previousOdds = new Map<string, GameOdds>();
	for (const game of previousGames) {
		if (game.odds) previousOdds.set(game.id, game.odds);
	}

	return freshGames.map((game) => {
		if (game.odds) return game;
		const preserved = previousOdds.get(game.id);
		return preserved ? { ...game, odds: preserved } : game;
	});
}
