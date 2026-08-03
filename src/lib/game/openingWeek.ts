import { formatDateRange } from '$lib/format';
import { dayKey, dayKeyToLocalDate, localDayKey, sortGames } from './sort';
import type { Game, Scoreboard } from './types';
import { OPENING_WEEK_SLUG, type WeekOption } from './weeks';

const SATURDAY = 6;

function addDays(key: string, days: number): string {
	const date = dayKeyToLocalDate(key);
	date.setDate(date.getDate() + days);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export interface OpeningWeekSplit {
	week0: Game[];
	week1: Game[];
	/** Last calendar day (`YYYY-MM-DD`) that belongs to Week 0. */
	cutoff: string;
}

/**
 * ESPN doesn't give the season-opening Saturday its own calendar entry — it
 * folds it into the same "Week 1" response as the following week's real slate.
 * The calendar's date range can't tell us this happened (it's fixed and wide by
 * design); the only tell is the games themselves containing two separate
 * Saturdays.
 *
 * When that's the case, "Week 0" is every game up through the first Saturday,
 * plus the Sunday and Monday right after it — everything from the following
 * Tuesday on is the real Week 1. Returns `null` when there's only one Saturday,
 * i.e. ESPN's Week 1 didn't need splitting.
 */
export function splitOpeningWeek(games: readonly Game[]): OpeningWeekSplit | null {
	const saturdays = [...new Set(games.map(dayKey))]
		.filter((key) => dayKeyToLocalDate(key).getDay() === SATURDAY)
		.sort();

	if (saturdays.length < 2) return null;

	const cutoff = addDays(saturdays[0], 2);

	return {
		week0: games.filter((game) => dayKey(game) <= cutoff),
		week1: games.filter((game) => dayKey(game) > cutoff),
		cutoff
	};
}

/**
 * Which half of a split "now" (the viewer's own clock) falls into. This is the
 * one piece of date arithmetic in the app, and it's deliberately narrow: it only
 * ever runs after ESPN itself has already told us its answer for "current week"
 * is the merged Week 1 — we're not computing what week it is, only which half of
 * an ESPN-confirmed week we're in.
 *
 * Takes just the `cutoff` (not a full `OpeningWeekSplit`) because the split
 * itself is now precomputed once daily by `scripts/fetch-weeks.ts` and shipped
 * as `openingWeekCutoff` in `weeks.json` — the client never has (or needs) the
 * pre-partitioned `week0`/`week1` game arrays, only the one cutoff date.
 */
export function pickCurrentOpeningWeekSlug(cutoff: string, now: Date = new Date()): 'week0' | 'week1' {
	return localDayKey(now) <= cutoff ? 'week0' : 'week1';
}

/**
 * Reshape a full Week 1 board to show just one half of a detected split, by
 * filtering its games against `cutoff` directly rather than requiring a
 * pre-partitioned `OpeningWeekSplit` — see `pickCurrentOpeningWeekSlug` above
 * for why only the cutoff is needed here.
 */
export function resolveOpeningWeekBoard(board: Scoreboard, cutoff: string, requested: 'week0' | 'week1'): Scoreboard {
	const isWeek0 = requested === OPENING_WEEK_SLUG;

	return {
		...board,
		games: board.games.filter((game) => (dayKey(game) <= cutoff) === isWeek0),
		week: {
			...board.week,
			label: isWeek0 ? 'Week 0' : 'Week 1',
			weekNumber: isWeek0 ? 0 : board.week.weekNumber,
			slug: requested
		}
	};
}

/**
 * Insert a "Week 0" entry into the week picker's option list whenever the season
 * needs one, right before the real Week 1 — and replace both entries' detail
 * text with dates that meet at the cutoff, since ESPN's own Week 1 detail
 * describes the whole undivided range and would otherwise be shown, unchanged,
 * on both halves.
 *
 * The two ranges are anchored to `split.cutoff` (Week 0's last day) rather than
 * to the actual games, so they always abut with no gap even when Week 0 has no
 * Sunday/Monday games of its own to show.
 */
export function injectOpeningWeekOption(
	weeks: readonly WeekOption[],
	split: OpeningWeekSplit | null
): WeekOption[] {
	if (!split) return [...weeks];

	const week0Start = split.week0.length ? dayKeyToLocalDate(dayKey(sortGames(split.week0)[0])) : undefined;
	const cutoffEnd = dayKeyToLocalDate(split.cutoff);
	const week1Start = dayKeyToLocalDate(addDays(split.cutoff, 1));
	const week1Sorted = sortGames(split.week1);
	const week1End = week1Sorted.length ? dayKeyToLocalDate(dayKey(week1Sorted.at(-1)!)) : week1Start;

	return weeks.flatMap((week) =>
		week.slug === 'week1'
			? [
					{
						slug: OPENING_WEEK_SLUG,
						label: 'Week 0',
						detail: week0Start ? formatDateRange(week0Start, cutoffEnd) : undefined,
						seasonType: week.seasonType,
						weekNumber: 0,
						phase: week.phase
					},
					{ ...week, detail: formatDateRange(week1Start, week1End) }
				]
			: [week]
	);
}
