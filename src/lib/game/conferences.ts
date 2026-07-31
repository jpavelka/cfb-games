import { base } from '$app/paths';
import type { GameTeam } from './types';

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
	subdivision: 'fbs' | 'fcs';
	teams: ConferenceTeam[];
}

interface ConferencesFile {
	season: { year: number };
	conferences: ConferenceInfo[];
}

export type ConferenceMap = Map<string, ConferenceInfo>;

/**
 * Loaded from `static/data/conferences.json` (see `scripts/fetch-conferences.ts`),
 * refreshed weekly by GitHub Actions — not fetched from ESPN directly at view
 * time. The file may not exist yet (a fresh dev environment before
 * `npm run fetch:conferences` has run, or before the workflow's first deploy),
 * so a missing/unreadable file yields an empty map rather than failing the page.
 */
export async function loadConferenceMap(fetchImpl: typeof fetch = fetch): Promise<ConferenceMap> {
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
