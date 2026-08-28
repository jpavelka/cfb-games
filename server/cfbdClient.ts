import type { CfbdGameLines, CfbdPregameWinProbability } from './cfbdBetting';

const CFBD_BASE_URL = 'https://api.collegefootballdata.com';

async function fetchCfbd<T>(endpoint: string, params: Record<string, string>, apiKey: string): Promise<T> {
	const url = new URL(endpoint, CFBD_BASE_URL);
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

	const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
	if (!response.ok) {
		throw new Error(`CFBD ${endpoint} request failed: ${response.status} ${response.statusText}`);
	}
	return (await response.json()) as T;
}

/**
 * CFBD's betting lines + pregame win probability, scoped to one week — the
 * refresh job only ever needs the current week, so there's no reason to pull
 * (and re-merge) CFBD's whole-season dataset the way the old daily GitHub
 * Action did.
 */
export async function fetchCfbdBetting(
	year: number,
	week: number,
	seasonType: 'regular' | 'postseason',
	apiKey: string
): Promise<{ lines: CfbdGameLines[]; winProbabilities: CfbdPregameWinProbability[] }> {
	const params = { year: String(year), week: String(week), seasonType };
	const [lines, winProbabilities] = await Promise.all([
		fetchCfbd<CfbdGameLines[]>('/lines', params, apiKey),
		fetchCfbd<CfbdPregameWinProbability[]>('/metrics/wp/pregame', params, apiKey)
	]);
	return { lines, winProbabilities };
}
