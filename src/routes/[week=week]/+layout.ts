import { loadScoreboard } from '$lib/game/load';
import { pickCurrentOpeningWeekSlug } from '$lib/game/openingWeek';
import { REGULAR_SEASON } from '$lib/game/weeks';
import type { LayoutLoad } from './$types';

/**
 * Which week ESPN considers current right now — the only way to ask it that,
 * short of a second full scoreboard fetch (see `routes/+page.ts`). Lives in this
 * layout rather than the page load so it runs once per visit to a specific-week
 * route and stays cached across navigating between weeks, instead of refetching
 * on every week change.
 *
 * When that answer is the merged Week 1, it still has to be resolved down to
 * `week0` or `week1` — otherwise this would never agree with what `/` itself
 * displays (see `routes/+page.ts`), and the "back to current week" link would
 * show even while already looking at the current half of it.
 */
export const load: LayoutLoad = ({ parent }) => ({
	currentWeekSlug: Promise.all([loadScoreboard(), parent()]).then(
		async ([board, { openingWeekSplit }]) => {
			if (board.week.weekNumber !== 1 || board.week.seasonType !== REGULAR_SEASON) {
				return board.week.slug;
			}

			const split = await openingWeekSplit;
			return split ? pickCurrentOpeningWeekSlug(split) : board.week.slug;
		}
	)
});
