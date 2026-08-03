import type { Game } from './types';

export type GameComparator = (a: Game, b: Game) => number;

/**
 * ESPN encodes "kickoff time not yet known" as midnight *Eastern* on the intended
 * date — e.g. 2026-08-29T04:00Z for a game on Aug 29.
 *
 * That makes naive local-day bucketing wrong west of Eastern: for a viewer in Los
 * Angeles, that instant falls on Aug 28, so the game would be filed under the wrong
 * day. For TBD games we therefore read the day in America/New_York. This is
 * decoding ESPN's placeholder convention, not a display-timezone choice — games
 * with a real kickoff time are still bucketed by the viewer's own day.
 */
const ET_DAY = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'America/New_York',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

const LOCAL_DAY = new Intl.DateTimeFormat('en-CA', {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

/** Any date, as a sortable `YYYY-MM-DD` key in the viewer's own timezone. */
export function localDayKey(date: Date): string {
	// en-CA gives ISO-ordered parts, so this is already YYYY-MM-DD.
	return LOCAL_DAY.format(date);
}

/** Calendar day a game belongs to, as a sortable `YYYY-MM-DD` key. */
export function dayKey(game: Game): string {
	return game.kickoffTbd ? ET_DAY.format(game.kickoff) : localDayKey(game.kickoff);
}

/**
 * Earliest first, with time-unknown games at the end of their own day.
 *
 * Keeping TBD games inside their day (rather than pushing them to the end of the
 * week) keeps the day headings truthful, which matters more than having a single
 * unbroken time sequence.
 */
export const chronological: GameComparator = (a, b) => {
	const dayDiff = dayKey(a).localeCompare(dayKey(b));
	if (dayDiff !== 0) return dayDiff;

	const tbdDiff = Number(a.kickoffTbd) - Number(b.kickoffTbd);
	if (tbdDiff !== 0) return tbdDiff;

	const timeDiff = a.kickoff.getTime() - b.kickoff.getTime();
	if (timeDiff !== 0) return timeDiff;

	// Stable, meaningful tiebreak so equal kickoffs don't reorder between renders.
	return a.shortName.localeCompare(b.shortName);
};

/**
 * The sort options the UI can offer. V1 has one; user-selectable sorting is the
 * next feature, and adding it means adding a comparator here rather than touching
 * any component.
 */
export const comparators = { chronological } as const;

export type SortKey = keyof typeof comparators;

/** Sort into a new array — never mutates the input. */
export function sortGames(games: readonly Game[], key: SortKey = 'chronological'): Game[] {
	return [...games].sort(comparators[key]);
}

export type TimeSlot = 'early' | 'afternoon' | 'evening' | 'night' | 'tbd';

const SLOT_ORDER: readonly TimeSlot[] = ['early', 'afternoon', 'evening', 'night', 'tbd'];

export const SLOT_LABELS: Record<TimeSlot, string> = {
	early: 'Early',
	afternoon: 'Afternoon',
	evening: 'Evening',
	night: 'Night',
	tbd: 'TBD'
};

const ET_HOUR = new Intl.DateTimeFormat('en-US', {
	timeZone: 'America/New_York',
	hour: 'numeric',
	hourCycle: 'h23'
});

/**
 * Bucket a game into a broad Eastern-time viewing window (the way US broadcasters
 * talk about noon / afternoon / prime-time slots), regardless of the viewer's own
 * timezone — these are broadcast windows, not local clock time.
 *
 * Boundaries: early before 2pm, afternoon 2–6pm, evening 6–9pm, night 9pm on —
 * and the small hours after midnight ET stay "night" too, since a West Coast game
 * kicking off at, say, 10:30pm PT (1:30am ET) is still that night's window, not
 * the next day's "early" game. No real CFB game kicks off between roughly 2am and
 * 9am ET, so hour 2–4 is unambiguous territory for that wraparound.
 *
 * TBD games have no real kickoff hour to bucket, so they get their own slot
 * instead of a guess — same reasoning as `chronological` keeping them inside
 * their day rather than inventing a position for them.
 */
export function timeSlot(game: Game): TimeSlot {
	if (game.kickoffTbd) return 'tbd';

	const hour = Number(ET_HOUR.format(game.kickoff));
	if (hour < 5) return 'night';
	if (hour < 14) return 'early';
	if (hour < 18) return 'afternoon';
	if (hour < 21) return 'evening';
	return 'night';
}

export interface GameSlot {
	key: TimeSlot;
	label: string;
	games: Game[];
}

/** Split a chronologically-sorted list of games into non-empty time-of-day slots. */
function groupBySlot(games: readonly Game[]): GameSlot[] {
	const slots: GameSlot[] = [];

	for (const key of SLOT_ORDER) {
		const slotGames = games.filter((game) => timeSlot(game) === key);
		if (slotGames.length) slots.push({ key, label: SLOT_LABELS[key], games: slotGames });
	}

	return slots;
}

export interface GameDay {
	/** `YYYY-MM-DD` */
	key: string;
	/** Local noon on that calendar day — for formatting the heading only. */
	date: Date;
	games: Game[];
	/** `games`, split into early/afternoon/evening/night/TBD windows. */
	slots: GameSlot[];
}

/**
 * Build a Date representing the given calendar day in the viewer's own timezone.
 *
 * Deriving this from the key rather than from a game's `kickoff` matters: a TBD
 * game's kickoff is midnight Eastern, which formats as the *previous* day west of
 * Eastern, so using it directly would print a heading that contradicts its own
 * grouping. Noon keeps us clear of DST transitions.
 */
export function dayKeyToLocalDate(key: string): Date {
	const [year, month, day] = key.split('-').map(Number);
	return new Date(year, month - 1, day, 12);
}

/** Group chronologically-sorted games into consecutive days, preserving order. */
export function groupByDay(games: readonly Game[]): GameDay[] {
	const days: GameDay[] = [];

	for (const game of sortGames(games)) {
		const key = dayKey(game);
		const current = days.at(-1);

		if (current?.key === key) {
			current.games.push(game);
		} else {
			days.push({ key, date: dayKeyToLocalDate(key), games: [game], slots: [] });
		}
	}

	for (const day of days) {
		day.slots = groupBySlot(day.games);
	}

	return days;
}

export type StatusGroupKey = 'current' | 'upcoming' | 'completed' | 'postponed' | 'canceled';

const STATUS_GROUP_ORDER: readonly StatusGroupKey[] = [
	'current',
	'upcoming',
	'completed',
	'postponed',
	'canceled'
];

export const STATUS_GROUP_LABELS: Record<StatusGroupKey, string> = {
	current: 'Current',
	upcoming: 'Upcoming',
	completed: 'Completed',
	postponed: 'Postponed',
	canceled: 'Canceled'
};

/** Mirrors `formatStatusLine`'s canceled → postponed → post → in → pre ordering. */
function statusGroupKey({ status }: Game): StatusGroupKey {
	if (status.canceled) return 'canceled';
	if (status.postponed) return 'postponed';
	if (status.state === 'in') return 'current';
	if (status.state === 'post') return 'completed';
	return 'upcoming';
}

export interface GameStatusGroup {
	key: StatusGroupKey;
	label: string;
	games: Game[];
}

/** Bucket games by status into a fixed order (Current, Upcoming, Completed, Postponed, Canceled), omitting empty sections. */
export function groupByStatus(games: readonly Game[]): GameStatusGroup[] {
	const buckets = new Map<StatusGroupKey, Game[]>();

	for (const game of games) {
		const key = statusGroupKey(game);
		const bucket = buckets.get(key);
		if (bucket) bucket.push(game);
		else buckets.set(key, [game]);
	}

	return STATUS_GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
		key,
		label: STATUS_GROUP_LABELS[key],
		games: buckets.get(key)!
	}));
}
