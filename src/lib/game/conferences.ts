import { base } from '$app/paths';

export interface ConferenceInfo {
	id: string;
	name: string;
	shortName: string;
	abbreviation: string;
	slug: string;
	subdivision: 'fbs' | 'fcs';
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
