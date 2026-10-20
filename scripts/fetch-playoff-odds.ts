import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Fetches ESPN's FPI "Playoff Predictor" odds for every FBS team and writes them
 * to `static/data/playoff-odds.json`, keyed by ESPN team id.
 *
 * Source is ESPN's `fitt` power-index endpoint: one request returns all FBS teams,
 * with column `names` declared once at the top level and each team carrying a parallel
 * `values` array. We look columns up by *name* rather than position so a reordered column doesn't silently
 * shift every number. Probabilities are percentages (0–100), as ESPN reports them.
 *
 * A name that's missing from the response is a loud failure rather than a quiet
 * `null`: the daily workflow would rather keep yesterday's data than ship a file
 * whose odds are all empty.
 */

const POWER_INDEX_URL =
	'https://site.web.api.espn.com/apis/fitt/v3/sports/football/college-football/powerindex?region=us&lang=en&limit=1000';
const OUTPUT_PATH = path.join(import.meta.dirname, '..', 'static', 'data', 'playoff-odds.json');
const TIMEOUT_MS = 20_000;

interface FpiCategory {
	name: string;
	names?: string[];
	values?: (number | null)[];
}

interface FpiTeam {
	team: { id: string; displayName?: string };
	categories?: FpiCategory[];
}

interface FpiResponse {
	categories?: FpiCategory[];
	currentSeason?: { year?: number };
	lastUpdated?: string;
	teams?: FpiTeam[];
}

export interface PlayoffOddsRecord {
	/** Chance (0–100) to make the CFB Playoff. */
	makePlayoff: number | null;
	/** Chance (0–100) to reach the national championship game. */
	makeTitleGame: number | null;
	/** Chance (0–100) to win the national championship. */
	winTitle: number | null;
	/** Chance (0–100) to win the conference. */
	winConference: number | null;
	/** Chance (0–100) to win every remaining game. */
	winOut: number | null;
	fpi: number | null;
	fpiRank: number | null;
}

const FIELDS: Record<keyof PlayoffOddsRecord, string> = {
	makePlayoff: 'probmakeplayoffs',
	makeTitleGame: 'probmaketitlegame',
	winTitle: 'probwintitle',
	winConference: 'probwinconf',
	winOut: 'probwinout',
	fpi: 'fpi',
	fpiRank: 'fpirank'
};

function toRecord(team: FpiTeam, columnNames: string[]): PlayoffOddsRecord | undefined {
	const values = team.categories?.find((c) => c.name === 'fpi')?.values;
	if (!values) return undefined;

	const read = (name: string): number | null => {
		const index = columnNames.indexOf(name);
		if (index === -1) throw new Error(`ESPN FPI response has no "${name}" column.`);
		return values[index] ?? null;
	};

	const record = {} as PlayoffOddsRecord;
	for (const [key, name] of Object.entries(FIELDS)) {
		record[key as keyof PlayoffOddsRecord] = read(name);
	}
	return record;
}

async function main() {
	const response = await fetch(POWER_INDEX_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
	if (!response.ok) {
		const body = await response.text().then((t) => t.slice(0, 300), () => '');
		throw new Error(`ESPN returned HTTP ${response.status}.${body ? ` Body: ${body}` : ''}`);
	}

	const data = (await response.json()) as FpiResponse;
	const seasonYear = data.currentSeason?.year;
	if (!seasonYear) throw new Error('ESPN FPI response had no currentSeason.year.');
	if (!data.teams?.length) throw new Error('ESPN FPI response had no teams.');

	const columnNames = data.categories?.find((c) => c.name === 'fpi')?.names;
	if (!columnNames) throw new Error('ESPN FPI response had no fpi column names.');

	const teams: Record<string, PlayoffOddsRecord> = {};
	let skipped = 0;
	for (const team of data.teams) {
		const record = toRecord(team, columnNames);
		if (!record) {
			skipped += 1;
			console.warn(`Team ${team.team.id} (${team.team.displayName}) has no FPI data — skipping.`);
			continue;
		}
		teams[team.team.id] = record;
	}

	const written = Object.keys(teams).length;
	if (written === 0) throw new Error('No team had usable FPI data.');

	await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
	await writeFile(
		OUTPUT_PATH,
		JSON.stringify({ season: { year: seasonYear }, lastUpdated: data.lastUpdated ?? null, teams }, null, '\t') + '\n'
	);

	console.log(
		`Wrote playoff odds for ${written} teams (season ${seasonYear}, ESPN updated ${data.lastUpdated ?? 'unknown'}) to ${OUTPUT_PATH}` +
			(skipped ? `, ${skipped} skipped (no FPI data)` : '')
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
