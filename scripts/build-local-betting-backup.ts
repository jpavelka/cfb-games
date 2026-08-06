import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { mergeCfbdBetting, type CfbdGameLines, type CfbdPregameWinProbability } from './cfbdBetting';

/**
 * Offline counterpart to `fetch-betting.ts`: merges CFBD betting lines + pregame
 * win probability dumps already saved under `local/` (gitignored, hand-collected —
 * no `CFBD_API_KEY`/network access needed) into the same `static/data/betting.json`
 * shape, and writes it to `static/dev-data/betting-backup-{year}.json`.
 *
 * A `static/dev-data/index.json` snapshot entry can then set `"bettingFile":
 * "betting-backup-{year}.json"` to have `/dev-snapshot/[name]` use this instead of
 * the live `static/data/betting.json` — useful for a snapshot captured from a past
 * season, where today's live CFBD data no longer applies.
 *
 * Usage: npm run build:local-betting-backup -- --year=2025
 * Expects `local/betting{year}.json` (CFBD `/lines`) and `local/wp{year}.json`
 * (CFBD `/metrics/wp/pregame`) to already exist.
 */

const ROOT = path.join(import.meta.dirname, '..');
const LOCAL_DIR = path.join(ROOT, 'local');
const OUTPUT_DIR = path.join(ROOT, 'static', 'dev-data');

function parseYear(argv: string[]): string {
	const match = argv.map((arg) => /^--year=(\d{4})$/.exec(arg)).find((result) => result !== null);
	if (!match) throw new Error('Usage: build-local-betting-backup --year=YYYY');
	return match[1];
}

async function readJson<T>(filePath: string): Promise<T> {
	const contents = await readFile(filePath, 'utf-8');
	return JSON.parse(contents) as T;
}

async function main() {
	const year = parseYear(process.argv.slice(2));

	const [lines, winProbabilities] = await Promise.all([
		readJson<CfbdGameLines[]>(path.join(LOCAL_DIR, `betting${year}.json`)),
		readJson<CfbdPregameWinProbability[]>(path.join(LOCAL_DIR, `wp${year}.json`))
	]);

	const betting = mergeCfbdBetting(lines, winProbabilities);

	await mkdir(OUTPUT_DIR, { recursive: true });
	const outputPath = path.join(OUTPUT_DIR, `betting-backup-${year}.json`);
	await writeFile(outputPath, JSON.stringify(betting, null, '\t') + '\n');

	console.log(`Wrote betting fallback data for ${Object.keys(betting).length} games (season ${year}) to ${outputPath}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
