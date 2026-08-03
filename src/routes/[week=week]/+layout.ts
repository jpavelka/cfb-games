import { pickCurrentOpeningWeekSlug } from '$lib/game/openingWeek';
import { loadCurrentWeek } from '$lib/game/weekOptions';
import { REGULAR_SEASON } from '$lib/game/weeks';
import type { LayoutLoad } from './$types';

/**
 * Which week `fetch-weeks.ts` last saw ESPN consider current — read off
 * `weeks.json` rather than fetched live, and cheap enough (no game data, just
 * the week's coordinates) to run on every visit to a specific-week route. Lives
 * in this layout rather than the page load so it stays cached across navigating
 * between weeks instead of refetching on every week change.
 *
 * When that answer is the merged Week 1, it still has to be resolved down to
 * `week0` or `week1` — otherwise this would never agree with what `/` itself
 * displays (see `routes/+page.ts`), and the "back to current week" link would
 * show even while already looking at the current half of it. `null` when
 * `weeks.json` doesn't know (missing file, or ESPN's current week is unmapped)
 * — the "back to current week" link just won't show, same as before this file
 * existed.
 */
export const load: LayoutLoad = ({ parent, fetch }) => ({
	currentWeekSlug: Promise.all([loadCurrentWeek(fetch), parent()]).then(
		async ([currentWeek, { openingWeekCutoff }]) => {
			if (!currentWeek) return null;
			if (currentWeek.week !== 1 || currentWeek.seasonType !== REGULAR_SEASON) {
				return currentWeek.slug;
			}

			const cutoff = await openingWeekCutoff;
			return cutoff ? pickCurrentOpeningWeekSlug(cutoff) : currentWeek.slug;
		}
	)
});
