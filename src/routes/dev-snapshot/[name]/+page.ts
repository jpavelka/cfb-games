import { dev } from '$app/environment';
import { base } from '$app/paths';
import { error } from '@sveltejs/kit';
import { sortGames } from '$lib/game/sort';
import { fromStoredScoreboard, reviveStoredScoreboard } from '$lib/game/storage';
import type { StoredScoreboard } from '$lib/game/storedScoreboard';
import type { PageLoad } from './$types';

export const prerender = false;

/**
 * Renders one locally-captured dev snapshot (`static/dev-data/{name}.json`,
 * written by `scripts/fetch-dev-snapshot.ts`, gitignored) through the exact same
 * `ScoreboardView` real weeks use, by reconstituting it the same way
 * `loadScoreboard` (`$lib/game/load.ts`) does for the GCS bucket. Dev-only: 404s
 * outside `npm run dev`, and excluded from prerendering (see `prerender = false`
 * above) since `load()` would otherwise 404 during `npm run build` too.
 */
export const load: PageLoad = ({ params, parent, fetch }) => {
	if (!dev) error(404, 'Not found');

	const scoreboard = parent().then(async ({ teams, weeks }) => {
		const [weeksList, response] = await Promise.all([
			weeks,
			fetch(`${base}/dev-data/${params.name}.json`)
		]);

		if (!response.ok) {
			error(404, `No dev snapshot named "${params.name}" — run \`npm run fetch:dev-snapshot\` to capture one.`);
		}

		const raw = (await response.json()) as StoredScoreboard;
		const board = fromStoredScoreboard(reviveStoredScoreboard(raw), weeksList, teams);
		return { ...board, games: sortGames(board.games, 'chronological') };
	});

	return { scoreboard, isCurrentWeek: Promise.resolve(true), name: params.name };
};
