import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getKnownTeamIds } from '../server/knownTeamIds';
import type { ScoreboardQuery } from '../src/lib/espn/client';
import { fetchMergedScoreboard } from '../src/lib/espn/client';
import { groupByStatus } from '../src/lib/game/sort';
import { toStoredScoreboard } from '../src/lib/game/storedScoreboard';
import { toScoreboard } from '../src/lib/game/transform';
import { weekSlug } from '../src/lib/game/weeks';

/**
 * Captures one live ESPN scoreboard response and writes it to
 * `static/dev-data/{name}.json` (gitignored, see `.gitignore` — every developer
 * captures their own) in the same trimmed `StoredScoreboard` wire format
 * `server/gcs.ts` writes to the production GCS bucket, so `/dev-snapshot/[name]`
 * can read it back through the exact same `fromStoredScoreboard` path real weeks
 * use. Run manually, ideally on a real game day when ESPN's current week has a
 * genuine mix of pre/in/post/postponed/canceled games — the whole point is
 * exercising `GameList`'s status grouping without waiting for that to happen
 * naturally during development.
 *
 * Usage: npm run fetch:dev-snapshot -- [--week=N] [--season-type=2|3] [--year=N] [--name=slug]
 * All flags optional; omitting week/season-type/year asks ESPN for "now" (same
 * convention as every other fetch script in this repo).
 */

const OUTPUT_DIR = path.join(import.meta.dirname, '..', 'static', 'dev-data');
const INDEX_PATH = path.join(OUTPUT_DIR, 'index.json');

interface SnapshotIndexEntry {
	name: string;
	label: string;
	capturedAt: string;
	bettingFile?: string;
}

const FLAG = /^--(week|season-type|year|name)=(.+)$/;

function parseCliArgs(argv: string[]): ScoreboardQuery & { name?: string } {
	const result: ScoreboardQuery & { name?: string } = {};

	for (const arg of argv) {
		const match = FLAG.exec(arg);
		if (!match) {
			throw new Error(`Unrecognized argument "${arg}". Expected --week=N, --season-type=2|3, --year=N, --name=slug.`);
		}

		const [, key, value] = match;
		if (key === 'name') {
			result.name = value;
			continue;
		}

		const parsed = Number.parseInt(value, 10);
		if (Number.isNaN(parsed)) throw new Error(`--${key} must be a number, got "${value}".`);
		if (key === 'week') result.week = parsed;
		else if (key === 'season-type') result.seasonType = parsed;
		else if (key === 'year') result.seasonYear = parsed;
	}

	return result;
}

async function readIndex(): Promise<SnapshotIndexEntry[]> {
	try {
		return JSON.parse(await readFile(INDEX_PATH, 'utf-8')) as SnapshotIndexEntry[];
	} catch {
		return [];
	}
}

async function main() {
	const { name: requestedName, ...query } = parseCliArgs(process.argv.slice(2));

	const merged = await fetchMergedScoreboard(query);
	const board = toScoreboard(merged);
	const knownTeamIds = await getKnownTeamIds(merged.season.year);
	const stored = toStoredScoreboard(board, knownTeamIds);

	const slug = weekSlug(board.week.seasonType, board.week.weekNumber) ?? `week${board.week.weekNumber}-type${board.week.seasonType}`;
	const name = requestedName ?? `${slug}-${board.week.seasonYear}`;
	const label = `${board.week.label} (${board.week.seasonYear})`;

	await mkdir(OUTPUT_DIR, { recursive: true });
	await writeFile(path.join(OUTPUT_DIR, `${name}.json`), JSON.stringify(stored, null, '\t') + '\n');

	const index = await readIndex();
	const capturedAt = new Date().toISOString();
	const entry: SnapshotIndexEntry = { name, label, capturedAt };
	const withoutExisting = index.filter((existing) => existing.name !== name);
	await writeFile(INDEX_PATH, JSON.stringify([...withoutExisting, entry], null, '\t') + '\n');

	const breakdown = groupByStatus(board.games)
		.map((group) => `${group.label}: ${group.games.length}`)
		.join(', ');
	console.log(`Wrote ${board.games.length} games (${breakdown || 'no games'}) to static/dev-data/${name}.json`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
