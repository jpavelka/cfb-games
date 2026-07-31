import type { Game } from '../src/lib/game/types';

/**
 * Pure port of the old repo's `tasks/schedule_next_task.py::games()`. Given one
 * week's games, decide how long to wait before checking that week again — tight
 * while something is live, backing off once everything's either not-yet-started or
 * finished for the day. No I/O here on purpose: `server/index.ts` is the only place
 * that touches the network or GCS, so this can be unit-tested with plain fixtures.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const NEXT_DAY_CHECK_HOUR_ET = 6;

/**
 * Extra cushion added on top of every "waiting" delay (never on top of a live-game
 * delay) — old code's `extra_secs=5*60` in `_games_betting_no_current_dttm`. Keeps a
 * check from landing exactly at a kickoff or exactly at the old day boundary.
 */
const WAITING_BUFFER_MS = 5 * MINUTE_MS;

/**
 * A `pre` game whose kickoff has already passed is treated as live for scheduling
 * purposes — ESPN can lag a few seconds behind the clock, and we'd rather start
 * polling tightly than wait for the next slow "pre" check to notice kickoff happened.
 * Mirrors the old code's `actualStatusState` patch.
 */
function effectiveState(game: Game, now: Date): 'pre' | 'in' | 'post' {
	if (game.status.state === 'pre' && game.kickoff.getTime() <= now.getTime()) return 'in';
	return game.status.state;
}

/** "12:34" -> 12.5666..., or undefined if ESPN's displayClock isn't in that shape. */
function parseClockMinutesRemaining(displayClock: string | undefined): number | undefined {
	const match = displayClock ? /^(\d+):(\d{2})$/.exec(displayClock.trim()) : null;
	if (!match) return undefined;
	return Number(match[1]) + Number(match[2]) / 60;
}

/**
 * The UTC instant for a given wall-clock time in `timeZone`.
 *
 * No timezone library needed: guess the UTC instant that *looks* like the target
 * wall time, see what that instant actually reads as in `timeZone`, and correct by
 * the difference. Good enough for scheduling a "check back in the morning" delay —
 * this is never shown to a user, just used to space out ESPN requests.
 */
function zonedTimeToUtc(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	timeZone: string
): Date {
	const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
	const zoned = Object.fromEntries(
		formatter.formatToParts(utcGuess).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)])
	);
	const zonedAsIfUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute);
	const offsetMs = zonedAsIfUtc - utcGuess.getTime();
	return new Date(utcGuess.getTime() - offsetMs);
}

/** `now`'s Eastern calendar date, as `{ year, month, day }`. */
function easternCalendarDate(now: Date): { year: number; month: number; day: number } {
	return Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone: 'America/New_York',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		})
			.formatToParts(now)
			.filter((part) => part.type !== 'literal')
			.map((part) => [part.type, Number(part.value)])
	) as { year: number; month: number; day: number };
}

/** Tomorrow (relative to `now`'s Eastern calendar date) at 6am America/New_York. */
function nextSixAmEastern(now: Date): Date {
	const todayEt = easternCalendarDate(now);
	// Date.UTC normalizes day+1 across month/year boundaries for us.
	const tomorrow = new Date(Date.UTC(todayEt.year, todayEt.month - 1, todayEt.day + 1));
	return zonedTimeToUtc(
		tomorrow.getUTCFullYear(),
		tomorrow.getUTCMonth() + 1,
		tomorrow.getUTCDate(),
		NEXT_DAY_CHECK_HOUR_ET,
		0,
		'America/New_York'
	);
}

/**
 * The next Monday 6am America/New_York strictly after `now` — at most 7 days out.
 * Used as an upper bound on the "waiting on a future kickoff" delay: a week whose
 * next game is weeks away (bye week, early bootstrap before the season's kickoffs
 * are close, ESPN's calendar reaching past the near term) would otherwise reschedule
 * itself so far out that it stops getting checked — or, past Cloud Tasks' 30-day max
 * schedule window, fails to enqueue at all and silently kills the chain.
 */
function nextMondaySixAmEastern(now: Date): Date {
	const todayEt = easternCalendarDate(now);
	// Date-only (no time-of-day) so the weekday math is unambiguous; Monday = 1.
	const todayWeekday = new Date(Date.UTC(todayEt.year, todayEt.month - 1, todayEt.day)).getUTCDay();
	const daysUntilMonday = (1 - todayWeekday + 7) % 7;

	const monday = new Date(Date.UTC(todayEt.year, todayEt.month - 1, todayEt.day + daysUntilMonday));
	let candidate = zonedTimeToUtc(
		monday.getUTCFullYear(),
		monday.getUTCMonth() + 1,
		monday.getUTCDate(),
		NEXT_DAY_CHECK_HOUR_ET,
		0,
		'America/New_York'
	);

	// Today's own Monday-6am window already passed (or today is Monday past 6am) —
	// push a full week out rather than returning a time at or before `now`.
	if (candidate.getTime() <= now.getTime()) {
		const nextWeek = new Date(monday.getTime() + 7 * 24 * HOUR_MS);
		candidate = zonedTimeToUtc(
			nextWeek.getUTCFullYear(),
			nextWeek.getUTCMonth() + 1,
			nextWeek.getUTCDate(),
			NEXT_DAY_CHECK_HOUR_ET,
			0,
			'America/New_York'
		);
	}

	return candidate;
}

/**
 * Old code's `_dttm_from_next_start`: roughly halfway to a kickoff more than an hour
 * out, 5 minutes before a closer one, or 5 minutes after one that's imminent/just
 * passed.
 */
function delayUntilNextStart(nextKickoff: Date, now: Date): number {
	const msToNextStart = nextKickoff.getTime() - now.getTime();
	if (msToNextStart > HOUR_MS) return msToNextStart / 2;
	if (msToNextStart > 5 * MINUTE_MS) return msToNextStart - 5 * MINUTE_MS;
	return msToNextStart + 5 * MINUTE_MS;
}

/** Old code's period/clock tiers for a currently-live week. */
function liveDelayMs(games: readonly Game[], now: Date): number {
	const liveGames = games.filter((game) => effectiveState(game, now) === 'in');
	const maxPeriod = Math.max(0, ...liveGames.map((game) => game.status.period ?? 0));

	if (maxPeriod <= 2) return 5 * MINUTE_MS;
	if (maxPeriod === 3) return 4 * MINUTE_MS;

	const fourthQuarterMinutesRemaining = liveGames
		.filter((game) => (game.status.period ?? 0) >= 4)
		.map((game) => parseClockMinutesRemaining(game.status.displayClock))
		.filter((minutes): minutes is number => minutes !== undefined);

	// An unparseable/missing clock defaults to "plenty of time left" rather than
	// crashing (the old Python would throw on `None / 60`) — safer to poll less
	// often than to kill the chain.
	const minMinutesRemaining =
		fourthQuarterMinutesRemaining.length > 0 ? Math.min(...fourthQuarterMinutesRemaining) : Infinity;

	if (minMinutesRemaining > 5) return 3 * MINUTE_MS;
	if (minMinutesRemaining > 2) return 2 * MINUTE_MS;
	return MINUTE_MS;
}

/**
 * How long to wait before refreshing this week again.
 *
 * @param games This week's games only (never mix weeks — each week's chain is
 *   independent).
 * @param now Injectable for tests; defaults to the real clock.
 */
export function computeNextRefreshDelayMs(games: readonly Game[], now: Date = new Date()): number {
	// No games at all, or nothing left pregame/live (i.e. everything's finished) —
	// nothing to poll for tomorrow, so back off all the way to the closest Monday.
	if (games.length === 0) {
		return Math.max(0, nextMondaySixAmEastern(now).getTime() - now.getTime());
	}

	const states = games.map((game) => effectiveState(game, now));
	const anyLive = states.some((state) => state === 'in');

	if (anyLive) return Math.max(0, liveDelayMs(games, now));

	const upcomingKickoffMs = games
		.filter((_, index) => states[index] === 'pre')
		.map((game) => game.kickoff.getTime());

	if (upcomingKickoffMs.length === 0) {
		// No live games, nothing pregame either — everything's finished.
		return Math.max(0, nextMondaySixAmEastern(now).getTime() - now.getTime() + WAITING_BUFFER_MS);
	}

	// At least one game still pregame: check back tomorrow at 6am, or sooner if
	// kickoff is closer than that.
	const nextKickoff = new Date(Math.min(...upcomingKickoffMs));
	const delayMs = delayUntilNextStart(nextKickoff, now) + WAITING_BUFFER_MS;
	const nextDayCapMs = nextSixAmEastern(now).getTime() - now.getTime();
	return Math.max(0, Math.min(delayMs, nextDayCapMs));
}
