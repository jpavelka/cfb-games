import type { ConferenceMap } from '$lib/game/conferences';
import { dayKey, dayKeyToLocalDate } from '$lib/game/sort';
import type { Game, GameOdds, GameTeam } from '$lib/game/types';

/**
 * Every user-facing string lives here.
 *
 * Formatters are created once at module scope — instantiating `Intl` objects is
 * comparatively expensive and this runs across a couple hundred games. No formatter
 * sets `timeZone`: the viewer's own zone is the default and the right choice.
 */

const TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

const SHORT_DATE = new Intl.DateTimeFormat(undefined, {
	weekday: 'short',
	month: 'short',
	day: 'numeric'
});

const DAY_HEADING = new Intl.DateTimeFormat(undefined, {
	weekday: 'long',
	month: 'long',
	day: 'numeric'
});

const RANGE_MONTH_DAY = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const RANGE_DAY = new Intl.DateTimeFormat(undefined, { day: 'numeric' });

/** Kickoff clock time, or `TBD` when ESPN doesn't know it yet. */
export function formatKickoffTime(game: Game): string {
	return game.kickoffTbd ? 'TBD' : TIME.format(game.kickoff);
}

export function formatKickoffDate(date: Date): string {
	return SHORT_DATE.format(date);
}

/**
 * e.g. "Sat, Aug 29" — the calendar day this game belongs to. Goes through
 * `dayKey`/`dayKeyToLocalDate` rather than formatting `game.kickoff` directly so
 * a TBD game (ESPN's midnight-Eastern placeholder) still reports its real day
 * instead of whatever that instant happens to be west of Eastern.
 */
export function formatGameDate(game: Game): string {
	return formatKickoffDate(dayKeyToLocalDate(dayKey(game)));
}

export function formatDayHeading(date: Date): string {
	return DAY_HEADING.format(date);
}

/** e.g. "Aug 29-30" (same month) or "Sep 28-Oct 4" — matches ESPN's own calendar style. */
export function formatDateRange(start: Date, end: Date): string {
	const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
	const endStr = sameMonth ? RANGE_DAY.format(end) : RANGE_MONTH_DAY.format(end);
	return `${RANGE_MONTH_DAY.format(start)}-${endStr}`;
}

/**
 * The one line that tells you where a game stands.
 *
 * Ordering matters: cancellations and postponements arrive as `post`, so they have
 * to be checked before the completed case.
 */
export function formatStatusLine(game: Game): string {
	const { status } = game;

	if (status.canceled) return 'Canceled';
	if (status.postponed) return 'Postponed';

	if (status.state === 'post') {
		// 'Final', or 'Final/OT' style detail when ESPN provides it.
		return status.shortDetail || status.description || 'Final';
	}

	if (status.state === 'in') {
		const period = status.period ? ordinalPeriod(status.period) : undefined;
		const clock = status.displayClock;
		if (period && clock) return `${clock} · ${period}`;
		return status.shortDetail || 'In progress';
	}

	return formatKickoffTime(game);
}

function ordinalPeriod(period: number): string {
	if (period > 4) return period === 5 ? 'OT' : `${period - 4}OT`;
	const suffix = period === 1 ? 'st' : period === 2 ? 'nd' : period === 3 ? 'rd' : 'th';
	return `${period}${suffix}`;
}

/** Column headers for a by-quarter line score, e.g. ["1","2","3","4"] or ["1","2","3","4","OT","2O"]. */
export function formatPeriodLabels(count: number): string[] {
	return Array.from({ length: count }, (_, index) => {
		const period = index + 1;
		return period <= 4 ? `${period}` : period === 5 ? 'OT' : `${period - 4}O`;
	});
}

/** Overall record, with the conference record in parentheses when we have it. */
export function formatRecord(team: GameTeam): string | undefined {
	if (!team.record) return undefined;
	return team.conferenceRecord ? `${team.record} (${team.conferenceRecord})` : team.record;
}

/** Subdivisions whose conference name gets a parenthetical suffix — FBS conferences are self-evident, so they get none. */
const SUBDIVISION_SUFFIX = { fcs: 'FCS', d2: 'D2' } as const;

/**
 * e.g. "ACC", "Big Sky (FCS)" for an FCS conference, or "GLIAC (D2)" for a D2
 * conference — absent when the team's conference isn't in `conferences` (see
 * `$lib/game/conferences`).
 */
export function formatConferenceName(team: GameTeam, conferences: ConferenceMap): string | undefined {
	if (!team.conferenceId) return undefined;
	const conference = conferences.get(team.conferenceId);
	if (!conference) return undefined;

	const suffix = conference.subdivision === 'fbs' ? undefined : SUBDIVISION_SUFFIX[conference.subdivision];
	if (!suffix || conference.shortName.includes(suffix)) return conference.shortName;
	return `${conference.shortName} (${suffix})`;
}

/** e.g. "TCU -6.5". Falls back to ESPN's own rendering when we can't build one. */
export function formatSpread(game: Game): string | undefined {
	const { odds } = game;
	if (!odds) return undefined;

	if (odds.spread === 0) return 'Even';

	if (odds.spread !== undefined && odds.favoriteHomeAway) {
		const favorite = odds.favoriteHomeAway === 'home' ? game.home : game.away;
		return `${favorite.abbreviation || favorite.location} -${odds.spread}`;
	}

	return odds.details;
}

/** e.g. "-6.5" — shown on the favored team's own row, so no team name needed here. */
export function formatTeamSpread(odds: GameOdds | undefined, team: GameTeam): string | undefined {
	if (!odds?.spread || odds.favoriteHomeAway !== team.homeAway) return undefined;
	return `-${odds.spread}`;
}

/** e.g. "-250" or "+205" — this team's own moneyline. */
export function formatMoneyline(odds: GameOdds | undefined, team: GameTeam): string | undefined {
	const value = team.homeAway === 'home' ? odds?.moneylineHome : odds?.moneylineAway;
	if (value === undefined) return undefined;
	return value > 0 ? `+${value}` : `${value}`;
}

/** e.g. "68%" — implied win probability, vig removed, for this team. Never shows 100% or 0%. */
export function formatWinProbability(odds: GameOdds | undefined, team: GameTeam): string | undefined {
	const pct = team.homeAway === 'home' ? odds?.homeWinPct : odds?.awayWinPct;
	if (pct === undefined) return undefined;
	const rounded = Math.round(pct);
	if (rounded >= 100) return '>99%';
	if (rounded <= 0) return '<1%';
	return `${rounded}%`;
}

/** e.g. "Aviva Stadium · Dublin, Ireland". */
export function formatVenue(game: Game): string | undefined {
	const { venue } = game;
	if (!venue) return undefined;

	// Strip trailing parenthesized disambiguation (e.g. "(Lincoln, NE)") since we
	// already display city/state alongside the venue name.
	const name = venue.name?.replace(/\s*\([^)]*\)\s*$/, '');

	// International venues carry a country and no state; domestic ones the reverse.
	const place = [venue.city, venue.state ?? venue.country].filter(Boolean).join(', ');
	const parts = [name, place].filter(Boolean);

	return parts.length ? parts.join(' · ') : undefined;
}

export function formatBroadcasts(game: Game): string | undefined {
	return game.broadcasts.length ? game.broadcasts.join(', ') : undefined;
}

/** Short stand-in shown when a team has no logo (or the image fails to load). */
export function teamInitials(team: GameTeam): string {
	if (team.abbreviation) return team.abbreviation.slice(0, 4);

	const words = team.location.split(/\s+/).filter(Boolean);
	if (words.length > 1) {
		return words
			.map((word) => word[0])
			.join('')
			.slice(0, 4)
			.toUpperCase();
	}
	return team.location.slice(0, 3).toUpperCase();
}

export function formatRelativeUpdate(fetchedAt: Date, now: Date = new Date()): string {
	const seconds = Math.max(0, Math.round((now.getTime() - fetchedAt.getTime()) / 1000));
	if (seconds < 60) return 'Updated just now';

	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `Updated ${minutes} min ago`;

	const hours = Math.round(minutes / 60);
	return `Updated ${hours} hr ago`;
}

/**
 * e.g. "next check in 5 min" or, once it's more than a handful of hours out (an
 * idle bye week backed all the way off to next Monday — see
 * `server/reschedule.ts`), "next check Mon, Sep 1 at 6:00 AM" instead of a
 * meaningless "in 38 hr". Once the scheduled check time has passed without the
 * page reloading, "refresh for new data" instead of a stale "any moment".
 */
export function formatNextRefresh(nextRefreshAt: Date, now: Date = new Date()): string {
	const seconds = Math.round((nextRefreshAt.getTime() - now.getTime()) / 1000);
	if (seconds <= 0) return 'Refresh for new data';
	if (seconds <= 30) return 'Next check any moment';

	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `Next check in ${minutes} min`;

	const hours = Math.round(minutes / 60);
	if (hours < 20) return `Next check in ${hours} hr`;

	return `Next check ${formatKickoffDate(nextRefreshAt)} at ${TIME.format(nextRefreshAt)}`;
}
