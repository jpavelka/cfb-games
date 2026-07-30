/**
 * The mapping between URL slugs and ESPN's (seasontype, week) coordinates.
 *
 * ESPN numbers the postseason oddly: the whole bowl schedule is week 1 of season
 * type 3, and the playoff bracket is week 999 of the same type — so a bare week
 * number is meaningless without its season type. Both directions of the mapping
 * live here, together, because they have to agree: the param matcher, the route
 * loader and the week picker all go through these two functions.
 *
 * Deliberately free of ESPN types, so `src/lib/espn/` stays behind `transform.ts`.
 */

export const REGULAR_SEASON = 2;
export const POSTSEASON = 3;

/** ESPN's week number for the full bowl schedule. */
export const BOWLS_WEEK = 1;
/** ESPN's week number for the College Football Playoff bracket. */
export const CFP_WEEK = 999;

/** One entry in the week picker. */
export interface WeekOption {
	/** e.g. "week5", "bowls", "playoff" */
	slug: string;
	/** ESPN's own label, e.g. "Week 5", "Bowls", "CFP". */
	label: string;
	/** ESPN's date range for the week, e.g. "Sep 28-Oct 4". */
	detail?: string;
	seasonType: number;
	weekNumber: number;
	phase: 'regular' | 'postseason';
}

/** The ESPN coordinates a slug refers to. */
export interface WeekTarget {
	week: number;
	seasonType: number;
}

// No leading zeros and at most two digits: `/week05` and `/week999` should 404
// rather than quietly resolve to the same games as a canonical slug. `week0` is
// a deliberate exception, handled separately below.
const REGULAR_SLUG = /^week([1-9]\d?)$/;

/**
 * "Week 0" — ESPN has no such concept; it bundles the season-opening Saturday
 * into the same response as the real Week 1 rather than giving it its own
 * calendar entry. `week0` and `week1` are therefore both requests for ESPN's
 * week 1; which games each shows is decided client-side by `splitOpeningWeek`
 * once the games are in hand (see `[week=week]/+page.ts`).
 */
export const OPENING_WEEK_SLUG = 'week0';

/** Slug → ESPN coordinates, or `null` when the slug is not a week. */
export function parseWeekSlug(slug: string): WeekTarget | null {
	if (slug === 'bowls') return { week: BOWLS_WEEK, seasonType: POSTSEASON };
	if (slug === 'playoff') return { week: CFP_WEEK, seasonType: POSTSEASON };
	if (slug === OPENING_WEEK_SLUG) return { week: 1, seasonType: REGULAR_SEASON };

	const match = REGULAR_SLUG.exec(slug);
	return match ? { week: Number(match[1]), seasonType: REGULAR_SEASON } : null;
}

/**
 * ESPN coordinates → slug, or `null` when there is no route for them — the off
 * season (type 4), and any postseason week ESPN might add that we have no name for.
 */
export function weekSlug(seasonType: number, weekNumber: number): string | null {
	if (seasonType === REGULAR_SEASON) {
		return Number.isInteger(weekNumber) && weekNumber > 0 ? `week${weekNumber}` : null;
	}

	if (seasonType === POSTSEASON) {
		if (weekNumber === CFP_WEEK) return 'playoff';
		if (weekNumber === BOWLS_WEEK) return 'bowls';
	}

	return null;
}
