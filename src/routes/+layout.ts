import { loadBroadcasterList } from '$lib/game/broadcasters';
import { buildConferenceMap, loadConferenceData } from '$lib/game/conferences';
import { loadRatingMap, loadSagarinAsOf } from '$lib/game/ratings';
import { loadTeamMap } from '$lib/game/teams';
import { loadOpeningWeekCutoff, loadWeekOptions } from '$lib/game/weekOptions';
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

export const load: LayoutLoad = async ({ fetch }) => {
	// Same-origin static file, not an ESPN call — kicked off first since
	// `loadScoreboard` needs it to join `teamId` -> display info, and the
	// conference map below is derived from it rather than fetched separately.
	const teams = loadTeamMap(fetch);
	const conferenceData = loadConferenceData(fetch);

	// Whether this season's merged ESPN Week 1 needs splitting into "Week 0" +
	// "Week 1", and where the cutoff falls — precomputed daily by
	// `scripts/fetch-weeks.ts` and read here from `weeks.json`, not from a live
	// Week 1 scoreboard fetch. See `$lib/game/openingWeek`.
	const openingWeekCutoff = loadOpeningWeekCutoff(fetch);

	return {
		openingWeekCutoff,
		// The week picker's option list. Already has a "Week 0" entry spliced in
		// (with its own display date range) whenever a split is needed — done
		// once daily by `fetch-weeks.ts`, not recomputed client-side.
		weeks: loadWeekOptions(fetch),
		teams: await teams,
		conferences: buildConferenceMap(await teams, await conferenceData),
		ratings: await loadRatingMap(fetch),
		sagarinAsOf: await loadSagarinAsOf(fetch),
		broadcasters: await loadBroadcasterList(fetch)
	};
};
