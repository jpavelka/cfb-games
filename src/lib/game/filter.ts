import type { Game, GameTeam } from './types';

function teamMatches(team: GameTeam, query: string): boolean {
	return (
		team.location.toLowerCase().includes(query) ||
		team.displayName.toLowerCase().includes(query) ||
		team.abbreviation.toLowerCase().includes(query) ||
		(team.name?.toLowerCase().includes(query) ?? false)
	);
}

/** Games with at least one team matching `query` (case-insensitive substring). Blank query passes everything through. */
export function filterByTeam(games: readonly Game[], query: string): Game[] {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return [...games];
	return games.filter((game) => game.teams.some((team) => teamMatches(team, trimmed)));
}
