import { loadConferenceMap } from '$lib/game/conferences';
import { loadScoreboard } from '$lib/game/load';
import { splitOpeningWeek } from '$lib/game/openingWeek';
import { loadRatingMap } from '$lib/game/ratings';
import { REGULAR_SEASON } from '$lib/game/weeks';
import type { LayoutLoad } from './$types';

// Prerender the page as an inert shell, but never render it on the server.
//
// This pairing is deliberate. Game data must be fetched in the browser on every
// visit: if `load` ran during prerendering, that build's scores would be baked
// into the HTML and every visitor would see a frozen snapshot from deploy time.
// `ssr = false` guarantees the ESPN request happens at view time, and
// `prerender = true` still gives us a static HTML file to host.
export const prerender = true;
export const ssr = false;

/**
 * Fetch ESPN's Week 1 once per visit. This load has no route dependency, so
 * SvelteKit caches it across client-side navigation instead of refetching it on
 * every page — which is what makes it cheap enough to use from every page (not
 * just `/week0`/`/week1`) to decide whether "Week 0" belongs in the week picker,
 * and to let `/week0`/`/week1` reuse these games directly instead of fetching
 * Week 1 a second time. See `$lib/game/openingWeek`.
 */
export const load: LayoutLoad = async ({ fetch }) => {
	const openingWeekBoard = loadScoreboard({ week: 1, seasonType: REGULAR_SEASON });

	return {
		openingWeekBoard,
		openingWeekSplit: openingWeekBoard.then((board) => splitOpeningWeek(board.games)),
		// Same-origin static file, not an ESPN call — small and reliable enough to
		// await here rather than thread through every component as a promise.
		conferences: await loadConferenceMap(fetch),
		ratings: await loadRatingMap(fetch)
	};
};
