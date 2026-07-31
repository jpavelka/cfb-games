import { base } from '$app/paths';

interface BroadcastersFile {
	broadcasters: string[];
}

/**
 * Loaded from `static/data/broadcasters.json` (see `scripts/fetch-broadcasters.ts`),
 * refreshed daily by GitHub Actions — not fetched from ESPN directly at view
 * time. A missing/unreadable file yields an empty list rather than failing the
 * page (mirrors `loadConferenceMap`/`loadWeekOptions`).
 */
export async function loadBroadcasterList(fetchImpl: typeof fetch = fetch): Promise<string[]> {
	try {
		const response = await fetchImpl(`${base}/data/broadcasters.json`);
		if (!response.ok) return [];

		const data = (await response.json()) as BroadcastersFile;
		return data.broadcasters;
	} catch (error) {
		console.warn('Could not load broadcaster list', error);
		return [];
	}
}
