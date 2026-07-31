import { error } from '@sveltejs/kit';
import { loadScoreboard } from '$lib/game/load';
import { pickCurrentOpeningWeekSlug, resolveOpeningWeekBoard } from '$lib/game/openingWeek';
import { loadCurrentWeek } from '$lib/game/weekOptions';
import { REGULAR_SEASON } from '$lib/game/weeks';
import type { PageLoad } from './$types';

// Which week is "current" comes from `fetch-weeks.ts`'s own (once-daily) ESPN
// call, not a live fetch here — see `weekOptions.ts`. The one narrow exception to
// "no date arithmetic anywhere in this app" is still here: once that answer is
// the merged Week 1, we still have to decide which half of it "now" falls into —
// see `pickCurrentOpeningWeekSlug`. Every other week lives at its own slug under
// `src/routes/[week=week]/`.
export const load: PageLoad = ({ parent, fetch }) => {
	const scoreboard = Promise.all([loadCurrentWeek(fetch), parent()]).then(
		async ([currentWeek, { openingWeekBoard, openingWeekSplit }]) => {
			if (!currentWeek) error(503, 'Current week schedule is not available');

			const isOpeningWeek = currentWeek.week === 1 && currentWeek.seasonType === REGULAR_SEASON;
			const board = isOpeningWeek ? await openingWeekBoard : await loadScoreboard(currentWeek, fetch);

			const split = await openingWeekSplit;
			return split && isOpeningWeek
				? resolveOpeningWeekBoard(board, split, pickCurrentOpeningWeekSlug(split))
				: board;
		}
	);

	return { scoreboard };
};
