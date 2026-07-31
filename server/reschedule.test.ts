import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeNextRefreshDelayMs } from './reschedule.ts';
import type { Game, GameStatus, GameTeam } from '../src/lib/game/types';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

function makeTeam(overrides: Partial<GameTeam> = {}): GameTeam {
	return {
		id: '1',
		homeAway: 'home',
		location: 'Team',
		displayName: 'Team',
		abbreviation: 'TM',
		...overrides
	};
}

function makeStatus(overrides: Partial<GameStatus>): GameStatus {
	return {
		state: 'pre',
		completed: false,
		description: '',
		detail: '',
		shortDetail: '',
		canceled: false,
		postponed: false,
		...overrides
	};
}

function makeGame(overrides: { kickoff: Date; status: GameStatus } & Partial<Game>): Game {
	const away = makeTeam({ id: 'away', homeAway: 'away' });
	const home = makeTeam({ id: 'home', homeAway: 'home' });
	return {
		id: 'game-1',
		name: 'Away at Home',
		shortName: 'AWY @ HM',
		kickoffTbd: false,
		away,
		home,
		teams: [away, home],
		broadcasts: [],
		neutralSite: false,
		conferenceGame: false,
		subdivisions: ['fbs'],
		espnUrl: 'https://example.com',
		...overrides
	};
}

test('no games falls back to the closest Monday 6am ET', () => {
	const now = new Date('2026-09-05T12:00:00Z'); // Saturday
	const delay = computeNextRefreshDelayMs([], now);
	// Saturday -> Monday 6am ET is ~46h; well past a single day, well within a week.
	assert.ok(delay > 24 * HOUR_MS, `expected a Monday backoff, got ${delay}ms`);
	assert.ok(delay < 7 * 24 * HOUR_MS, `expected a Monday backoff, got ${delay}ms`);
});

test('all games finished, and it happens to be Sunday, backs off ~14h to Monday 6am ET plus the waiting buffer', () => {
	const now = new Date('2026-09-06T20:00:00Z'); // Sunday 4pm ET
	const games = [
		makeGame({
			kickoff: new Date('2026-09-06T17:00:00Z'),
			status: makeStatus({ state: 'post', completed: true })
		})
	];
	const delay = computeNextRefreshDelayMs(games, now);
	// Sunday 4pm ET -> Monday 6am ET is 14h; give generous slack for DST edge cases.
	assert.ok(delay > 8 * HOUR_MS, `expected a next-morning backoff, got ${delay}ms`);
	assert.ok(delay < 20 * HOUR_MS, `expected a next-morning backoff, got ${delay}ms`);
});

test('all games finished on a Tuesday backs off all the way to the following Monday, not just overnight', () => {
	const now = new Date('2026-09-08T20:00:00Z'); // Tuesday 4pm ET
	const games = [
		makeGame({
			kickoff: new Date('2026-09-08T17:00:00Z'),
			status: makeStatus({ state: 'post', completed: true })
		})
	];
	const delay = computeNextRefreshDelayMs(games, now);
	assert.ok(delay > 24 * HOUR_MS, `expected a Monday backoff, not an overnight one, got ${delay}ms`);
	assert.ok(delay < 7 * 24 * HOUR_MS, `expected a Monday backoff, got ${delay}ms`);
});

test('an upcoming game more than an hour out schedules halfway to kickoff', () => {
	const now = new Date('2026-09-05T12:00:00Z');
	const kickoff = new Date(now.getTime() + 4 * HOUR_MS);
	const games = [makeGame({ kickoff, status: makeStatus({ state: 'pre' }) })];
	const delay = computeNextRefreshDelayMs(games, now);
	assert.ok(Math.abs(delay - (2 * HOUR_MS + 5 * MINUTE_MS)) < 1000);
});

test('an upcoming game within an hour schedules 5 minutes before kickoff', () => {
	const now = new Date('2026-09-05T12:00:00Z');
	const kickoff = new Date(now.getTime() + 30 * MINUTE_MS);
	const games = [makeGame({ kickoff, status: makeStatus({ state: 'pre' }) })];
	const delay = computeNextRefreshDelayMs(games, now);
	assert.ok(Math.abs(delay - (25 * MINUTE_MS + 5 * MINUTE_MS)) < 1000);
});

test('an upcoming game within 5 minutes schedules 5 minutes after kickoff', () => {
	const now = new Date('2026-09-05T12:00:00Z');
	const kickoff = new Date(now.getTime() + 2 * MINUTE_MS);
	const games = [makeGame({ kickoff, status: makeStatus({ state: 'pre' }) })];
	const delay = computeNextRefreshDelayMs(games, now);
	assert.ok(Math.abs(delay - (7 * MINUTE_MS + 5 * MINUTE_MS)) < 1000);
});

test('an upcoming game weeks out is capped at tomorrow 6am ET, not halfway to kickoff', () => {
	const now = new Date('2026-09-05T12:00:00Z'); // Saturday
	const kickoff = new Date(now.getTime() + 21 * 24 * HOUR_MS); // 3 weeks out
	const games = [makeGame({ kickoff, status: makeStatus({ state: 'pre' }) })];
	const delay = computeNextRefreshDelayMs(games, now);
	// A pregame game always caps at tomorrow 6am ET, not ~10.5 days (half of 21 days) out.
	assert.ok(delay < 24 * HOUR_MS, `expected a next-day cap, got ${delay}ms`);
	assert.ok(delay > 0);
});

test('a pregame game months out (off-season bootstrap) still gets checked tomorrow, not next Monday', () => {
	const now = new Date('2026-09-08T12:00:00Z'); // Tuesday
	const kickoff = new Date(now.getTime() + 90 * 24 * HOUR_MS); // next kickoff months out
	const games = [makeGame({ kickoff, status: makeStatus({ state: 'pre' }) })];
	const delay = computeNextRefreshDelayMs(games, now);
	assert.ok(delay < 24 * HOUR_MS, `expected a next-day cap, got ${delay}ms`);
	assert.ok(delay > 0);
});

test('a pre game whose kickoff has already passed counts as live', () => {
	const now = new Date('2026-09-05T12:00:00Z');
	const games = [
		makeGame({
			kickoff: new Date(now.getTime() - MINUTE_MS),
			status: makeStatus({ state: 'pre', period: 1 })
		})
	];
	assert.equal(computeNextRefreshDelayMs(games, now), 5 * MINUTE_MS);
});

test('a live game in the first half checks every 5 minutes', () => {
	const now = new Date('2026-09-05T12:00:00Z');
	const games = [
		makeGame({ kickoff: new Date(now.getTime() - HOUR_MS), status: makeStatus({ state: 'in', period: 2 }) })
	];
	assert.equal(computeNextRefreshDelayMs(games, now), 5 * MINUTE_MS);
});

test('a live game in the third quarter checks every 4 minutes', () => {
	const now = new Date('2026-09-05T12:00:00Z');
	const games = [
		makeGame({ kickoff: new Date(now.getTime() - HOUR_MS), status: makeStatus({ state: 'in', period: 3 }) })
	];
	assert.equal(computeNextRefreshDelayMs(games, now), 4 * MINUTE_MS);
});

test('a live game in the 4th quarter with plenty of time checks every 3 minutes', () => {
	const now = new Date('2026-09-05T12:00:00Z');
	const games = [
		makeGame({
			kickoff: new Date(now.getTime() - HOUR_MS),
			status: makeStatus({ state: 'in', period: 4, displayClock: '10:00' })
		})
	];
	assert.equal(computeNextRefreshDelayMs(games, now), 3 * MINUTE_MS);
});

test('a live game in the 4th quarter under 5 minutes checks every 2 minutes', () => {
	const now = new Date('2026-09-05T12:00:00Z');
	const games = [
		makeGame({
			kickoff: new Date(now.getTime() - HOUR_MS),
			status: makeStatus({ state: 'in', period: 4, displayClock: '4:00' })
		})
	];
	assert.equal(computeNextRefreshDelayMs(games, now), 2 * MINUTE_MS);
});

test('a live game in the 4th quarter under 2 minutes checks every 1 minute', () => {
	const now = new Date('2026-09-05T12:00:00Z');
	const games = [
		makeGame({
			kickoff: new Date(now.getTime() - HOUR_MS),
			status: makeStatus({ state: 'in', period: 4, displayClock: '1:30' })
		})
	];
	assert.equal(computeNextRefreshDelayMs(games, now), MINUTE_MS);
});

test('one live game among otherwise-finished games still drives a tight interval', () => {
	const now = new Date('2026-09-05T20:00:00Z');
	const games = [
		makeGame({
			kickoff: new Date(now.getTime() - 3 * HOUR_MS),
			status: makeStatus({ state: 'post', completed: true })
		}),
		makeGame({
			kickoff: new Date(now.getTime() - HOUR_MS),
			status: makeStatus({ state: 'in', period: 4, displayClock: '1:00' })
		})
	];
	assert.equal(computeNextRefreshDelayMs(games, now), MINUTE_MS);
});

test('a live game with an unparseable clock defaults to the less-frequent tier rather than throwing', () => {
	const now = new Date('2026-09-05T20:00:00Z');
	const games = [
		makeGame({
			kickoff: new Date(now.getTime() - HOUR_MS),
			status: makeStatus({ state: 'in', period: 4, displayClock: undefined })
		})
	];
	assert.equal(computeNextRefreshDelayMs(games, now), 3 * MINUTE_MS);
});
