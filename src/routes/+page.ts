import { loadScoreboard } from '$lib/game/load';
import {
	injectOpeningWeekOption,
	pickCurrentOpeningWeekSlug,
	resolveOpeningWeekBoard
} from '$lib/game/openingWeek';
import { REGULAR_SEASON } from '$lib/game/weeks';
import type { PageLoad } from './$types';

// Sending no week selectors at all is what makes ESPN return the *current* week, and
// it is the only correct way to determine "now" — which is why there is no date
// arithmetic anywhere in this app, with one narrow exception: once ESPN's answer
// for "current week" comes back as the merged Week 1, we still have to decide
// which half of it "now" falls into — see `pickCurrentOpeningWeekSlug`. Every
// other week lives at its own slug under `src/routes/[week=week]/`.
export const load: PageLoad = ({ parent }) => {
	const scoreboard = Promise.all([loadScoreboard(), parent()]).then(
		async ([board, { openingWeekSplit }]) => {
			const split = await openingWeekSplit;

			const resolved =
				split && board.week.weekNumber === 1 && board.week.seasonType === REGULAR_SEASON
					? resolveOpeningWeekBoard(board, split, pickCurrentOpeningWeekSlug(split))
					: board;

			return { ...resolved, weeks: injectOpeningWeekOption(resolved.weeks, split) };
		}
	);

	return { scoreboard };
};
