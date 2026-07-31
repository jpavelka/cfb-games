import { base } from '$app/paths';
import type { GameTeam } from './types';
import type { TeamMap } from './teams';

export interface ConferenceTeam {
	id: string;
	location: string;
	displayName: string;
	abbreviation: string;
}

export interface ConferenceInfo {
	id: string;
	name: string;
	shortName: string;
	abbreviation: string;
	slug: string;
	subdivision: 'fbs' | 'fcs' | 'd2';
	teams: ConferenceTeam[];
}

export type ConferenceMap = Map<string, ConferenceInfo>;

interface RawConferenceRecord {
	id: string;
	name: string;
	shortName: string;
	abbreviation: string;
	subdivision: 'fbs' | 'fcs' | 'd2';
}

interface ConferencesFile {
	season: { year: number };
	conferences: RawConferenceRecord[];
}

export type ConferenceDataMap = Map<string, RawConferenceRecord>;

function slugify(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Loaded from `static/data/conferences.json` (see `scripts/fetch-teams.ts`, which
 * writes it alongside `teams.json` from the same ESPN group walk) — each team in
 * `teams.json` carries only a `conferenceId`, so its name/shortName/abbreviation
 * are resolved from here rather than repeated on every one of the ~430 teams.
 * Same fail-soft contract as `loadTeamMap`: a missing/unreadable file yields an
 * empty map instead of failing the page.
 */
export async function loadConferenceData(fetchImpl: typeof fetch = fetch): Promise<ConferenceDataMap> {
	try {
		const response = await fetchImpl(`${base}/data/conferences.json`);
		if (!response.ok) return new Map();

		const data = (await response.json()) as ConferencesFile;
		return new Map(data.conferences.map((conference) => [conference.id, conference]));
	} catch (error) {
		console.warn('Could not load conference data', error);
		return new Map();
	}
}

/**
 * Build the conference grouping from the already-loaded `teams.json` (for
 * membership) joined against `conferences.json` (for name/shortName/abbreviation).
 * Every subdivision is grouped, including D2, so `formatConferenceName` can
 * resolve a conference label for a D2 buy-game opponent —
 * `groupConferencesBySubdivision` (the favorites picker) still only ever looks at
 * `fbs`/`fcs`, so this has no effect there.
 *
 * A team whose `conferenceId` isn't in `conferenceData` (a stale/missing
 * `conferences.json`) falls back to the id itself as its name rather than
 * dropping the team's conference entirely.
 */
export function buildConferenceMap(teams: TeamMap, conferenceData: ConferenceDataMap): ConferenceMap {
	const conferences: ConferenceMap = new Map();

	for (const team of teams.values()) {
		let conference = conferences.get(team.conferenceId);
		if (!conference) {
			const data = conferenceData.get(team.conferenceId);
			const name = data?.name ?? team.conferenceId;
			conference = {
				id: team.conferenceId,
				name,
				shortName: data?.shortName ?? name,
				abbreviation: data?.abbreviation ?? name,
				slug: slugify(name),
				subdivision: team.subdivision,
				teams: []
			};
			conferences.set(team.conferenceId, conference);
		}

		conference.teams.push({
			id: team.id,
			location: team.location,
			displayName: team.displayName,
			abbreviation: team.abbreviation
		});
	}

	return conferences;
}

/** Every conference, grouped by subdivision (FBS first) and sorted by name — the shape the favorites picker lists teams in. */
export function groupConferencesBySubdivision(
	conferences: ConferenceMap
): Array<{ subdivision: 'fbs' | 'fcs'; conferences: ConferenceInfo[] }> {
	return (['fbs', 'fcs'] as const)
		.map((subdivision) => ({
			subdivision,
			conferences: [...conferences.values()]
				.filter((conference) => conference.subdivision === subdivision)
				.sort((a, b) => a.name.localeCompare(b.name))
		}))
		.filter((group) => group.conferences.length > 0);
}

/** ACC, Big 12, Big Ten, SEC — stable ESPN conference ids, confirmed against `static/data/conferences.json`. */
const POWER4_CONFERENCE_IDS = new Set(['1', '4', '5', '8']);

/** Power 4 (ACC/Big 12/Big Ten/SEC), plus Notre Dame special-cased as an independent. */
export function isPower4Team(team: GameTeam): boolean {
	return (team.conferenceId !== undefined && POWER4_CONFERENCE_IDS.has(team.conferenceId)) ||
		team.location === 'Notre Dame';
}
