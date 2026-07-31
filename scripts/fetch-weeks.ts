import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchMergedScoreboard } from '../src/lib/espn/client';
import { toWeekOptions } from '../src/lib/game/transform';
import { weekSlug } from '../src/lib/game/weeks';

/**
 * Fetches ESPN's season calendar and writes the week-picker list, plus which
 * week is current *right now*, to `static/data/weeks.json` — generated the same
 * way conferences/Sagarin are: once, on a schedule, not on every page view.
 *
 * Asking for no particular week/season is what makes ESPN answer for "now" — the
 * only correct way to determine that, and the reason this fetch has to happen
 * somewhere. Persisting that answer here means nothing downstream needs its own
 * live ESPN call just to find out which week is current: `src/routes/+page.ts`
 * and `src/routes/[week=week]/+layout.ts` both read `currentWeek` off this file
 * instead. It goes stale for at most a day between refreshes, same as the rest of
 * this file — acceptable since ESPN's own notion of "current" only ever changes
 * along week boundaries, not intraday.
 *
 * `currentWeek` is `null` when ESPN's answer doesn't map to a route (the off
 * season, or a postseason week `weekSlug` has no slug for) — see `weekSlug`.
 */

const OUTPUT_PATH = path.join(import.meta.dirname, '..', 'static', 'data', 'weeks.json');

async function main() {
	// No week/season selectors, so ESPN answers for the current season — same rule
	// every other data-fetching entry point in this app follows (see
	// src/routes/+page.ts and scripts/fetch-conferences.ts).
	const merged = await fetchMergedScoreboard();
	const weeks = toWeekOptions(merged.calendar);
	const currentWeek = weekSlug(merged.season.type, merged.week.number);

	const output = {
		season: merged.season,
		weeks,
		currentWeek: currentWeek
			? { slug: currentWeek, week: merged.week.number, seasonType: merged.season.type }
			: null
	};

	await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
	await writeFile(OUTPUT_PATH, JSON.stringify(output, null, '\t') + '\n');

	console.log(
		`Wrote ${weeks.length} weeks (season ${merged.season.year}, current: ${currentWeek ?? 'none'}) to ${OUTPUT_PATH}`
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
