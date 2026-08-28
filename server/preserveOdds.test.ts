import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preservePregameOdds } from './preserveOdds.ts';
import type { Game, GameOdds, GameStatus, GameTeam } from '../src/lib/game/types';
import type { StoredGame } from '../src/lib/game/storedScoreboard';

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

function makeStatus(overrides: Partial<GameStatus> = {}): GameStatus {
	return {
		state: 'in',
		completed: false,
		description: '',
		detail: '',
		shortDetail: '',
		canceled: false,
		postponed: false,
		...overrides
	};
}

function makeGame(overrides: Partial<Game> = {}): Game {
	const away = makeTeam({ id: 'away', homeAway: 'away' });
	const home = makeTeam({ id: 'home', homeAway: 'home' });
	return {
		id: 'game-1',
		name: 'Away at Home',
		shortName: 'AWY @ HM',
		kickoff: new Date('2026-08-29T19:00:00Z'),
		kickoffTbd: false,
		status: makeStatus(),
		away,
		home,
		teams: [away, home],
		broadcasts: [],
		neutralSite: false,
		conferenceGame: false,
		seasonType: 2,
		subdivisions: ['fcs'],
		espnUrl: 'https://example.com',
		...overrides
	};
}

function makeStoredGame(overrides: Partial<StoredGame> = {}): StoredGame {
	return {
		id: 'game-1',
		kickoff: new Date('2026-08-29T19:00:00Z'),
		kickoffTbd: false,
		status: {
			state: 'pre',
			description: '',
			shortDetail: '',
			canceled: false,
			postponed: false
		},
		away: { id: 'away', homeAway: 'away' },
		home: { id: 'home', homeAway: 'home' },
		broadcasts: [],
		neutralSite: false,
		conferenceGame: false,
		seasonType: 2,
		subdivisions: ['fcs'],
		...overrides
	};
}

const pregameOdds: GameOdds = { spread: 3, favoriteHomeAway: 'home', homeWinPct: 62, awayWinPct: 38 };

test('a live game that lost its odds gets the previous poll\'s pregame odds back', () => {
	const fresh = [makeGame({ odds: undefined })];
	const previous = [makeStoredGame({ odds: pregameOdds })];

	const result = preservePregameOdds(fresh, previous);

	assert.deepEqual(result[0].odds, pregameOdds);
});

test('a game that still has odds from ESPN is left alone, not overwritten by stale data', () => {
	const currentOdds: GameOdds = { spread: 7, favoriteHomeAway: 'away' };
	const fresh = [makeGame({ odds: currentOdds })];
	const previous = [makeStoredGame({ odds: pregameOdds })];

	const result = preservePregameOdds(fresh, previous);

	assert.deepEqual(result[0].odds, currentOdds);
});

test('a game with no previous odds and none now stays undefined', () => {
	const fresh = [makeGame({ odds: undefined })];
	const previous = [makeStoredGame({ odds: undefined })];

	const result = preservePregameOdds(fresh, previous);

	assert.equal(result[0].odds, undefined);
});

test('no previous file at all (first-ever refresh) leaves fresh games untouched', () => {
	const fresh = [makeGame({ odds: undefined })];

	const result = preservePregameOdds(fresh, undefined);

	assert.equal(result[0].odds, undefined);
	assert.equal(result, fresh);
});

test('matches previous games by id, not by array position', () => {
	const freshA = makeGame({ id: 'a', odds: undefined });
	const freshB = makeGame({ id: 'b', odds: undefined });
	const previousB = makeStoredGame({ id: 'b', odds: pregameOdds });

	const result = preservePregameOdds([freshA, freshB], [previousB]);

	assert.equal(result[0].odds, undefined);
	assert.deepEqual(result[1].odds, pregameOdds);
});
