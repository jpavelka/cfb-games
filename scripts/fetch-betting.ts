import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchMergedScoreboard } from '../src/lib/espn/client';
import type { BettingFallbackEntry } from '../src/lib/game/bettingFallback';

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

interface CfbdLine {
	provider: string;
	spread: number | null;
	overUnder: number | null;
	homeMoneyline: number | null;
	awayMoneyline: number | null;
}

interface CfbdGameLines {
	id: number;
	lines: CfbdLine[];
}

interface CfbdPregameWinProbability {
	gameId: number;
	homeWinProbability: number;
}

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

	const betting: Record<string, BettingFallbackEntry> = {};

	for (const game of lines) {
		// Only the first-listed provider — this is a fallback for missing ESPN
		// odds, not a full odds-comparison feature, so one provider is enough.
		const first = game.lines[0];
		if (!first) continue;

		betting[String(game.id)] = {
			provider: first.provider,
			spread: first.spread ?? undefined,
			overUnder: first.overUnder ?? undefined,
			homeMoneyline: first.homeMoneyline ?? undefined,
			awayMoneyline: first.awayMoneyline ?? undefined
		};
	}

	for (const wp of winProbabilities) {
		const key = String(wp.gameId);
		betting[key] = { ...betting[key], homeWinProbability: wp.homeWinProbability };
	}

	await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
	await writeFile(OUTPUT_PATH, JSON.stringify(betting, null, '\t') + '\n');

	console.log(`Wrote betting fallback data for ${Object.keys(betting).length} games (season ${year}) to ${OUTPUT_PATH}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
