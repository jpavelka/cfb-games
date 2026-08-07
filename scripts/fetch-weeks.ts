import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchMergedScoreboard } from '../src/lib/espn/client';
import { injectOpeningWeekOption, splitOpeningWeek, type OpeningWeekSplit } from '../src/lib/game/openingWeek';
import { toGame, toWeekOptions } from '../src/lib/game/transform';
import { REGULAR_SEASON, weekSlug, type WeekOption } from '../src/lib/game/weeks';

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

/**
 * Whether this season's merged ESPN "Week 1" needs splitting into "Week 0" +
 * "Week 1", and if so, where the cutoff falls — see `$lib/game/openingWeek`.
 *
 * Requires its own explicit ESPN call: the "current week" fetch in `main()`
 * only answers Week 1's question while Week 1 is actually current, but the
 * picker (and `/week0`/`/week1`) need this answer all season long. Degrades to
 * "no split" on any failure — a transient hiccup on this one extra call
 * shouldn't fail the whole daily refresh job, which also fetches
 * teams/ratings/broadcasters in the same run.
 */
async function loadOpeningWeekSplit(): Promise<OpeningWeekSplit | null> {
	try {
		const week1 = await fetchMergedScoreboard({ week: 1, seasonType: REGULAR_SEASON });
		const games = week1.events.flatMap((entry) => {
			try {
				return [toGame(entry, week1.season.type)];
			} catch (error) {
				console.warn('Skipping unparseable ESPN event while computing opening-week split', entry.event?.id, error);
				return [];
			}
		});
		return splitOpeningWeek(games);
	} catch (error) {
		console.warn('Could not determine opening-week split; assuming none needed', error);
		return null;
	}
}

async function main() {
	// No week/season selectors, so ESPN answers for the current season — same rule
	// every other data-fetching entry point in this app follows (see
	// src/routes/+page.ts and scripts/fetch-conferences.ts).
	const merged = await fetchMergedScoreboard();
	const rawWeeks = toWeekOptions(merged.calendar);
	const currentWeek = weekSlug(merged.season.type, merged.week.number);

	const split = await loadOpeningWeekSplit();
	const weeks: WeekOption[] = split ? injectOpeningWeekOption(rawWeeks, split) : rawWeeks;

	const output = {
		season: merged.season,
		weeks,
		currentWeek: currentWeek
			? { slug: currentWeek, week: merged.week.number, seasonType: merged.season.type }
			: null,
		openingWeekCutoff: split?.cutoff ?? null
	};

	await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
	await writeFile(OUTPUT_PATH, JSON.stringify(output, null, '\t') + '\n');

	console.log(
		`Wrote ${weeks.length} weeks (season ${merged.season.year}, current: ${currentWeek ?? 'none'}, opening week cutoff: ${split?.cutoff ?? 'none'}) to ${OUTPUT_PATH}`
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
