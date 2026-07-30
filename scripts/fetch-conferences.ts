import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ALL_SUBDIVISIONS, fetchScoreboard, type Subdivision } from '../src/lib/espn/client';
import { fetchConferenceGroups, type ConferenceGroup } from '../src/lib/espn/groups';

interface ConferenceRecord extends ConferenceGroup {
	subdivision: Subdivision;
}

const OUTPUT_PATH = path.join(import.meta.dirname, '..', 'static', 'data', 'conferences.json');

async function main() {
	// No week/season selectors, so ESPN answers for the current season — same
	// rule the app itself follows (see src/routes/+page.ts). Reused here rather
	// than computed locally so this script tracks the real season boundary.
	const { season } = await fetchScoreboard(ALL_SUBDIVISIONS[0]);
	const seasonYear = season?.year;
	if (!seasonYear) throw new Error('ESPN scoreboard response had no season.year.');

	const bySubdivision = await Promise.all(
		ALL_SUBDIVISIONS.map(async (subdivision) => {
			const groups = await fetchConferenceGroups(subdivision, seasonYear);
			return groups.map((group): ConferenceRecord => ({ ...group, subdivision }));
		})
	);

	const conferences = bySubdivision.flat();

	await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
	await writeFile(OUTPUT_PATH, JSON.stringify({ season: { year: seasonYear }, conferences }, null, '\t') + '\n');

	console.log(`Wrote ${conferences.length} conferences (season ${seasonYear}) to ${OUTPUT_PATH}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
