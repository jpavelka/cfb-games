import { isPower4Team, type ConferenceMap } from './conferences';
import { matchupScore, type RatingMap } from './ratings';
import type { TeamFilter } from './settings.svelte';
import type { Game, GameTeam } from './types';

function teamMatches(team: GameTeam, query: string): boolean {
	return (
		team.location.toLowerCase().includes(query) ||
		team.displayName.toLowerCase().includes(query) ||
		team.abbreviation.toLowerCase().includes(query) ||
		(team.name?.toLowerCase().includes(query) ?? false)
	);
}

/** Matches a team's conference by name, short name, or abbreviation (e.g. "SEC", "Big Ten"). */
function conferenceMatches(team: GameTeam, query: string, conferences: ConferenceMap): boolean {
	if (!team.conferenceId) return false;
	const conference = conferences.get(team.conferenceId);
	if (!conference) return false;
	return (
		conference.name.toLowerCase().includes(query) ||
		conference.shortName.toLowerCase().includes(query) ||
		conference.abbreviation.toLowerCase().includes(query)
	);
}

/** ESPN's event headlines spell these out in full, so the common abbreviation needs an alias to match. */
const EVENT_NAME_ALIASES: Record<string, string> = {
	cfp: 'college football playoff'
};

function eventMatches(eventName: string | undefined, query: string): boolean {
	if (!eventName) return false;
	const lower = eventName.toLowerCase();
	if (lower.includes(query)) return true;
	const alias = EVENT_NAME_ALIASES[query];
	return alias !== undefined && lower.includes(alias);
}

/**
 * Games matching `query` (case-insensitive substring) against a team, its
 * conference (e.g. "SEC", "Big Ten"), or the event name (e.g. "Rose Bowl",
 * "CFP"). Blank query passes everything through. `conferences` is optional
 * since not every caller has it loaded; omitting it just skips conference
 * matching.
 */
export function filterByTeam(games: readonly Game[], query: string, conferences: ConferenceMap = new Map()): Game[] {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return [...games];
	return games.filter(
		(game) =>
			game.teams.some((team) => teamMatches(team, trimmed) || conferenceMatches(team, trimmed, conferences)) ||
			eventMatches(game.eventName, trimmed)
	);
}

/**
 * Games whose matchup score is at least `minScore`. A TBD side (no score yet)
 * is treated like a too-low score and hidden once a threshold is set.
 * `minScore <= 0` passes everything through.
 */
export function filterByMinScore(games: readonly Game[], ratings: RatingMap, minScore: number): Game[] {
	if (minScore <= 0) return [...games];
	return games.filter((game) => {
		const score = matchupScore(game, ratings);
		return score !== null && score >= minScore;
	});
}

/**
 * Games broadcast on at least one selected channel. Games with no listed
 * broadcaster are treated as unwatchable and hidden too. `enabled = false` or
 * an empty `accessibleBroadcasts` passes everything through.
 */
export function filterByBroadcastAccess(
	games: readonly Game[],
	accessibleBroadcasts: string[],
	enabled: boolean
): Game[] {
	if (!enabled || accessibleBroadcasts.length === 0) return [...games];
	return games.filter((game) => game.broadcasts.some((b) => accessibleBroadcasts.includes(b)));
}

/** Games matching the selected team category. `'all'` passes everything through. */
export function filterByTeamCategory(games: readonly Game[], category: TeamFilter): Game[] {
	switch (category) {
		case 'all':
			return [...games];
		case 'fbs':
			return games.filter((game) => game.subdivisions.includes('fbs'));
		case 'fcs':
			return games.filter((game) => game.subdivisions.includes('fcs'));
		case 'power4':
			return games.filter((game) => game.teams.some((team) => isPower4Team(team)));
		case 'ranked':
			return games.filter((game) => game.teams.some((team) => team.rank !== undefined));
	}
}
