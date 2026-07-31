import { error } from '@sveltejs/kit';
import { loadScoreboard } from '$lib/game/load';
import { resolveOpeningWeekBoard } from '$lib/game/openingWeek';
import { OPENING_WEEK_SLUG, parseWeekSlug } from '$lib/game/weeks';
import type { EntryGenerator, PageLoad } from './$types';

/**
 * adapter-static needs a concrete list of paths to prerender, and the real one is
 * only knowable at view time. That is fine: `ssr = false` (see `+layout.ts`) makes
 * every prerendered file an inert shell, so over-generating costs almost nothing —
 * and a real file beats leaning on the 404.html SPA fallback, which GitHub Pages
 * serves with a 404 status. Calendars have run to 16 weeks; 20 is headroom.
 */
export const entries: EntryGenerator = () => [
	{ week: OPENING_WEEK_SLUG },
	...Array.from({ length: 20 }, (_, index) => ({ week: `week${index + 1}` })),
	{ week: 'bowls' },
	{ week: 'playoff' }
];

export const load: PageLoad = ({ params, parent, fetch }) => {
	const target = parseWeekSlug(params.week);
	// Unreachable while the `week` param matcher is in place, but the loader should
	// not depend on routing config to be sound.
	if (!target) error(404, `Unknown week "${params.week}"`);

	const isOpeningWeek = params.week === OPENING_WEEK_SLUG || params.week === 'week1';

	// `week0`/`week1` reuse the root layout's Week 1 fetch (see `+layout.ts`) rather
	// than fetching it a second time; every other week fetches itself as usual. Kept
	// as its own promise, started immediately rather than inside the `parent()`
	// chain below, so a normal week page isn't held up waiting on Week 1's fetch.
	//
	// No season year: ESPN honors week + seasontype on their own and answers for the
	// current season, which is exactly the season whose calendar fills the picker.
	const boardPromise = isOpeningWeek
		? parent().then(({ openingWeekBoard }) => openingWeekBoard)
		: loadScoreboard({ week: target.week, seasonType: target.seasonType }, fetch);

	const splitPromise = parent().then(({ openingWeekSplit }) => openingWeekSplit);

	const scoreboard = Promise.all([boardPromise, splitPromise]).then(([board, split]) =>
		isOpeningWeek && split
			? resolveOpeningWeekBoard(board, split, params.week as 'week0' | 'week1')
			: board
	);

	return {
		scoreboard,
		// The slug we *asked* for. ESPN silently clamps a week the season doesn't have
		// back to week 1 rather than erroring, so the page has to compare.
		requested: params.week
	};
};
