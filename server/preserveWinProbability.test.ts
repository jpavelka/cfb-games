import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preserveLiveWinProbability } from './preserveWinProbability.ts';
import type { Game, GameStatus, GameTeam } from '../src/lib/game/types';
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
			state: 'in',
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

const liveWinProb = { homeWinPct: 68, awayWinPct: 32 };

test('a live game whose latest play (e.g. a PAT) has no win probability gets the previous poll\'s number back', () => {
	const fresh = [makeGame({ situation: { downDistance: '1st & 10' } })];
	const previous = [makeStoredGame({ situation: liveWinProb })];

	const result = preserveLiveWinProbability(fresh, previous);

	assert.equal(result[0].situation?.homeWinPct, 68);
	assert.equal(result[0].situation?.awayWinPct, 32);
	// Fresh fields ESPN did supply this poll are kept, not clobbered.
	assert.equal(result[0].situation?.downDistance, '1st & 10');
});

test('a game whose situation is entirely empty this poll still gets the win probability back', () => {
	const fresh = [makeGame({ situation: undefined })];
	const previous = [makeStoredGame({ situation: liveWinProb })];

	const result = preserveLiveWinProbability(fresh, previous);

	assert.deepEqual(result[0].situation, liveWinProb);
});

test('a game with a fresh win probability from ESPN is left alone, not overwritten by stale data', () => {
	const currentWinProb = { homeWinPct: 55, awayWinPct: 45 };
	const fresh = [makeGame({ situation: currentWinProb })];
	const previous = [makeStoredGame({ situation: liveWinProb })];

	const result = preserveLiveWinProbability(fresh, previous);

	assert.deepEqual(result[0].situation, currentWinProb);
});

test('a final game does not get a stale live win probability carried into it', () => {
	const fresh = [makeGame({ status: makeStatus({ state: 'post', completed: true }), situation: undefined })];
	const previous = [makeStoredGame({ situation: liveWinProb })];

	const result = preserveLiveWinProbability(fresh, previous);

	assert.equal(result[0].situation, undefined);
});

test('a game with no previous win probability and none now stays undefined', () => {
	const fresh = [makeGame({ situation: undefined })];
	const previous = [makeStoredGame({ situation: undefined })];

	const result = preserveLiveWinProbability(fresh, previous);

	assert.equal(result[0].situation, undefined);
});

test('no previous file at all (first-ever refresh) leaves fresh games untouched', () => {
	const fresh = [makeGame({ situation: undefined })];

	const result = preserveLiveWinProbability(fresh, undefined);

	assert.equal(result[0].situation, undefined);
	assert.equal(result, fresh);
});

test('matches previous games by id, not by array position', () => {
	const freshA = makeGame({ id: 'a', situation: undefined });
	const freshB = makeGame({ id: 'b', situation: undefined });
	const previousB = makeStoredGame({ id: 'b', situation: liveWinProb });

	const result = preserveLiveWinProbability([freshA, freshB], [previousB]);

	assert.equal(result[0].situation, undefined);
	assert.deepEqual(result[1].situation, liveWinProb);
});
