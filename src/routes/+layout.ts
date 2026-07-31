import { loadBroadcasterList } from '$lib/game/broadcasters';
import { buildConferenceMap, loadConferenceData } from '$lib/game/conferences';
import { loadScoreboard } from '$lib/game/load';
import { injectOpeningWeekOption, splitOpeningWeek } from '$lib/game/openingWeek';
import { loadRatingMap } from '$lib/game/ratings';
import { loadTeamMap } from '$lib/game/teams';
import { loadWeekOptions } from '$lib/game/weekOptions';
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
	// Same-origin static file, not an ESPN call — kicked off first since
	// `loadScoreboard` needs it to join `teamId` -> display info, and the
	// conference map below is derived from it rather than fetched separately.
	const teams = loadTeamMap(fetch);
	const conferenceData = loadConferenceData(fetch);

	const openingWeekBoard = loadScoreboard({ week: 1, seasonType: REGULAR_SEASON }, teams, fetch);

	// Every *other* week also depends on this, just to decide whether "Week 0"
	// belongs in its picker — degrade to "no split" rather than let a Week 1
	// outage take down every other week too.
	const openingWeekSplit = openingWeekBoard.then((board) => splitOpeningWeek(board.games)).catch((error) => {
		console.warn('Could not determine opening week split', error);
		return null;
	});

	return {
		// Left rejecting on a Week 1 bucket miss: `/week0` and `/week1` genuinely
		// can't render without it, and consume this directly (see `[week=week]/+page.ts`).
		openingWeekBoard,
		openingWeekSplit,
		// The week picker's option list, independent of any single week's own
		// scoreboard fetch — so `ScoreboardView` can still offer it to navigate away
		// from a week whose own data failed to load. Depends only on the (already
		// failure-tolerant) `openingWeekSplit` above, not on `openingWeekBoard`
		// resolving to a *particular* week's games.
		weeks: loadWeekOptions(fetch).then((weeks) =>
			openingWeekSplit.then((split) => injectOpeningWeekOption(weeks, split))
		),
		teams: await teams,
		conferences: buildConferenceMap(await teams, await conferenceData),
		ratings: await loadRatingMap(fetch),
		broadcasters: await loadBroadcasterList(fetch)
	};
};
