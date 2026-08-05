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

	// Every week, including `week0`/`week1`, loads its own game data the same way —
	// `week0` and `week1` both resolve to the same GCS-stored merged Week 1 file
	// (see `parseWeekSlug`) and are sliced down to their own half below, once the
	// cutoff is known.
	//
	// No season year: ESPN honors week + seasontype on their own and answers for the
	// current season, which is exactly the season whose calendar fills the picker.
	const boardPromise = loadScoreboard(
		{ week: target.week, seasonType: target.seasonType },
		parent().then(({ teams }) => teams),
		parent().then(({ bettingFallback }) => bettingFallback),
		fetch
	);

	const cutoffPromise = parent().then(({ openingWeekCutoff }) => openingWeekCutoff);

	const scoreboard = Promise.all([boardPromise, cutoffPromise]).then(([board, cutoff]) =>
		isOpeningWeek && cutoff ? resolveOpeningWeekBoard(board, cutoff, params.week as 'week0' | 'week1') : board
	);

	// Reuses the layout's cached `currentWeekSlug` (no extra fetch) rather than
	// asking ESPN again — recomputed fresh on every navigation since this whole
	// `load()` reruns per `params.week`, unlike a component-level reactive check
	// which can lag a navigation that changes weeks faster than it resolves.
	const isCurrentWeek = parent()
		.then(({ currentWeekSlug }) => currentWeekSlug)
		.then((slug) => slug === params.week);

	return {
		scoreboard,
		// The slug we *asked* for. ESPN silently clamps a week the season doesn't have
		// back to week 1 rather than erroring, so the page has to compare.
		requested: params.week,
		isCurrentWeek
	};
};
