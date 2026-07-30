import { fetchMergedScoreboard, type ScoreboardQuery } from '$lib/espn/client';
import { sortGames } from './sort';
import { toScoreboard } from './transform';
import type { Scoreboard } from './types';

/**
 * Fetch one week and map it onto the app model.
 *
 * The promise is deliberately *not* awaited by callers' `load` functions: the page
 * awaits it in the template so it can show a loading state, and `invalidateAll()`
 * re-runs the load for a retry.
 */
export function loadScoreboard(query: ScoreboardQuery = {}): Promise<Scoreboard> {
	return fetchMergedScoreboard(query).then((merged) => {
		const board = toScoreboard(merged);
		return { ...board, games: sortGames(board.games, 'chronological') };
	});
}
