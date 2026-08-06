import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchMergedScoreboard } from '../src/lib/espn/client';
import { mergeCfbdBetting, type CfbdGameLines, type CfbdPregameWinProbability } from './cfbdBetting';

/**
 * Fetches collegefootballdata.com's betting lines and pregame win probability
 * for the current season, merges them by game id, and writes
 * `static/data/betting.json` — a fallback `game/bettingFallback.ts` reads
 * client-side to fill in whatever the ESPN scoreboard is missing (see
 * `applyBettingFallback`). Run daily by GitHub Actions, same cadence as
 * `fetch-sagarin-ratings.ts`/`fetch-weeks.ts`.
 *
 * Needs `CFBD_API_KEY` in the environment — copy `.env.example` to `.env`
 * locally (picked up via `tsx --env-file-if-exists=.env`, see `package.json`),
 * or set the `CFBD_API_KEY` repo secret for the GitHub Actions run.
 */

const CFBD_BASE_URL = 'https://api.collegefootballdata.com';
const OUTPUT_PATH = path.join(import.meta.dirname, '..', 'static', 'data', 'betting.json');

async function fetchCfbd<T>(endpoint: string, params: Record<string, string>, apiKey: string): Promise<T> {
	const url = new URL(endpoint, CFBD_BASE_URL);
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

	const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
	if (!response.ok) {
		throw new Error(`CFBD ${endpoint} request failed: ${response.status} ${response.statusText}`);
	}
	return (await response.json()) as T;
}

async function main() {
	const apiKey = process.env.CFBD_API_KEY;
	if (!apiKey) {
		throw new Error('CFBD_API_KEY is not set — copy .env.example to .env and fill in a real key.');
	}

	// No week/season selectors, so ESPN answers for the current season — same rule
	// every other data-fetching entry point in this app follows (see
	// scripts/fetch-weeks.ts).
	const current = await fetchMergedScoreboard();
	const year = String(current.season.year);

	const [lines, winProbabilities] = await Promise.all([
		fetchCfbd<CfbdGameLines[]>('/lines', { year }, apiKey),
		fetchCfbd<CfbdPregameWinProbability[]>('/metrics/wp/pregame', { year }, apiKey)
	]);

	const betting = mergeCfbdBetting(lines, winProbabilities);

	await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
	await writeFile(OUTPUT_PATH, JSON.stringify(betting, null, '\t') + '\n');

	console.log(`Wrote betting fallback data for ${Object.keys(betting).length} games (season ${year}) to ${OUTPUT_PATH}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
