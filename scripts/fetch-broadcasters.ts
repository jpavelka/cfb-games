import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchMergedScoreboard } from '../src/lib/espn/client';
import { toGame, toWeekOptions } from '../src/lib/game/transform';

/**
 * Builds the master list of every national broadcaster/channel seen across the
 * current season's weeks, for the settings modal's "channels I can watch" filter.
 *
 * No week/season selectors on the first call, so ESPN answers for "now" (same rule
 * every other data-fetching entry point in this app follows — see
 * scripts/fetch-weeks.ts) — that gives us the current season year and calendar.
 * Every week of that season is then fetched in turn (sequentially, not in
 * parallel, to stay polite to an API with no published rate limits) and every
 * game's `broadcasts` are folded into one deduplicated, sorted list.
 */

const OUTPUT_PATH = path.join(import.meta.dirname, '..', 'static', 'data', 'broadcasters.json');

async function main() {
	const current = await fetchMergedScoreboard();
	const weeks = toWeekOptions(current.calendar);
	const seasonYear = current.season.year;

	const broadcasters = new Set<string>();

	for (const week of weeks) {
		const merged = await fetchMergedScoreboard({
			seasonYear,
			week: week.weekNumber,
			seasonType: week.seasonType
		});

		for (const entry of merged.events) {
			try {
				for (const name of toGame(entry).broadcasts) {
					broadcasters.add(name);
				}
			} catch (error) {
				console.warn('Skipping unparseable ESPN event', entry.event?.id, error);
			}
		}
	}

	const sorted = [...broadcasters].sort((a, b) => a.localeCompare(b));

	await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
	await writeFile(OUTPUT_PATH, JSON.stringify({ broadcasters: sorted }, null, '\t') + '\n');

	console.log(`Wrote ${sorted.length} broadcasters (season ${seasonYear}) to ${OUTPUT_PATH}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
