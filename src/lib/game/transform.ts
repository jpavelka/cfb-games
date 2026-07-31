import type { MergedEvent, MergedScoreboard } from '$lib/espn/client';
import type {
	EspnCalendarType,
	EspnCompetitor,
	EspnOdds,
	EspnStatus,
	EspnTeam
} from '$lib/espn/types';
import type { Game, GameOdds, GameState, GameStatus, GameTeam, Scoreboard, WeekInfo } from './types';
import { POSTSEASON, REGULAR_SEASON, weekSlug, type WeekOption } from './weeks';

/** ESPN uses rank 99 to mean "not ranked" rather than omitting the field. */
export const UNRANKED_SENTINEL = 99;

const HEX_COLOR = /^#?[0-9a-f]{6}$/i;

/**
 * Turn ESPN's bare six-hex-digit color into a CSS color.
 *
 * Validated rather than trusted: these values are interpolated into a CSS custom
 * property, so an unexpected string must not pass through.
 */
function normalizeColor(value: string | undefined): string | undefined {
	if (!value || !HEX_COLOR.test(value)) return undefined;
	return value.startsWith('#') ? value : `#${value}`;
}

const NCAA_LOGO_PATH = /\/ncaa\/500\//;

/** ESPN serves a dark-background variant at the same path with a `-dark` suffix. */
function toDarkLogoUrl(logoUrl: string | undefined): string | undefined {
	if (!logoUrl || !NCAA_LOGO_PATH.test(logoUrl)) return undefined;
	return logoUrl.replace(NCAA_LOGO_PATH, '/ncaa/500-dark/');
}

function parseScore(value: string | undefined): number | undefined {
	if (value === undefined) return undefined;
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? undefined : parsed;
}

function findRecord(competitor: EspnCompetitor, type: 'total' | 'vsconf'): string | undefined {
	// Only 'total' and 'vsconf' are stable across seasons — the home/away entries
	// change names ('homerecord'/'awayrecord' vs 'home'/'road'), so we never touch them.
	return competitor.records?.find((record) => record.type === type)?.summary || undefined;
}

function toRank(competitor: EspnCompetitor): number | undefined {
	const rank = competitor.curatedRank?.current;
	if (rank === undefined || rank <= 0 || rank >= UNRANKED_SENTINEL) return undefined;
	return rank;
}

function toStatus(status: EspnStatus | undefined): GameStatus {
	const type = status?.type;
	const state: GameState = type?.state ?? 'pre';
	const description = type?.description ?? '';

	return {
		state,
		completed: type?.completed ?? false,
		description,
		detail: type?.detail ?? '',
		shortDetail: type?.shortDetail ?? '',
		period: status?.period,
		displayClock: status?.displayClock,
		// ESPN folds cancellations and postponements into `post` and only distinguishes
		// them in the human-readable description.
		canceled: state === 'post' && /^cancel/i.test(description),
		postponed: state === 'post' && /^postpon/i.test(description)
	};
}

function toTeam(competitor: EspnCompetitor, odds: EspnOdds | undefined): GameTeam {
	const team: EspnTeam = competitor.team ?? {};
	const homeAway = competitor.homeAway === 'home' ? 'home' : 'away';

	const oddsSide = homeAway === 'home' ? odds?.homeTeamOdds : odds?.awayTeamOdds;

	return {
		id: team.id ?? competitor.id ?? '',
		homeAway,
		location: team.location ?? team.shortDisplayName ?? team.displayName ?? 'TBD',
		name: team.name,
		displayName: team.displayName ?? team.location ?? 'TBD',
		abbreviation: team.abbreviation ?? team.shortDisplayName ?? '',
		logoUrl: team.logo,
		darkLogoUrl: toDarkLogoUrl(team.logo),
		color: normalizeColor(team.color),
		altColor: normalizeColor(team.alternateColor),
		rank: toRank(competitor),
		record: findRecord(competitor, 'total'),
		conferenceRecord: findRecord(competitor, 'vsconf'),
		conferenceId: team.conferenceId,
		score: parseScore(competitor.score),
		// Read ESPN's own flag rather than recomputing from scores, which would
		// mislabel ties as wins for both sides.
		isWinner: competitor.winner,
		isOddsFavorite: oddsSide?.favorite
	};
}

function parseAmericanOdds(value: string | undefined): number | undefined {
	if (value === undefined) return undefined;
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? undefined : parsed;
}

/** American odds -> implied win probability (0-1), vig included. */
function impliedProbability(americanOdds: number): number {
	return americanOdds < 0 ? -americanOdds / (-americanOdds + 100) : 100 / (americanOdds + 100);
}

function toOdds(raw: EspnOdds | undefined): GameOdds | undefined {
	if (!raw) return undefined;

	const favoriteHomeAway = raw.homeTeamOdds?.favorite
		? 'home'
		: raw.awayTeamOdds?.favorite
			? 'away'
			: undefined;

	const moneylineHome = parseAmericanOdds(raw.moneyline?.home?.close?.odds);
	const moneylineAway = parseAmericanOdds(raw.moneyline?.away?.close?.odds);

	// Both legs sum to over 100% because of the bookmaker's vig; normalize them back
	// down to 100% so the two numbers read as a genuine probability split.
	let homeWinPct: number | undefined;
	let awayWinPct: number | undefined;
	if (moneylineHome !== undefined && moneylineAway !== undefined) {
		const pHome = impliedProbability(moneylineHome);
		const pAway = impliedProbability(moneylineAway);
		const total = pHome + pAway;
		if (total > 0) {
			homeWinPct = (pHome / total) * 100;
			awayWinPct = (pAway / total) * 100;
		}
	}

	const odds: GameOdds = {
		provider: raw.provider?.name,
		spread: raw.spread === undefined ? undefined : Math.abs(raw.spread),
		overUnder: raw.overUnder,
		favoriteHomeAway,
		details: raw.details,
		moneylineHome,
		moneylineAway,
		homeWinPct,
		awayWinPct
	};

	// Nothing worth showing if ESPN gave us an empty odds object.
	if (
		odds.spread === undefined &&
		odds.overUnder === undefined &&
		!odds.details &&
		odds.moneylineHome === undefined &&
		odds.moneylineAway === undefined
	) {
		return undefined;
	}
	return odds;
}

function toBroadcasts(
	broadcasts: Array<{ market?: string; names?: string[] }> | undefined,
	geoBroadcasts: Array<{ market?: { type?: string }; media?: { shortName?: string } }> | undefined
): string[] {
	const names = new Set<string>();

	for (const broadcast of broadcasts ?? []) {
		if (broadcast.market !== 'national') continue;
		for (const name of broadcast.names ?? []) {
			if (name) names.add(name);
		}
	}

	// Fallback/supplement: the two lists agree in practice, but geoBroadcasts is what
	// the previous version read, so keep it rather than lose a channel.
	for (const geo of geoBroadcasts ?? []) {
		if (geo.market?.type !== 'National') continue;
		const name = geo.media?.shortName;
		if (name) names.add(name);
	}

	return [...names];
}

/**
 * Map one ESPN event onto a `Game`.
 *
 * Pure: the input is never mutated. (The previous version derived fields by mutating
 * the game object in place, which made the data flow impossible to follow.)
 *
 * Throws if the event is too malformed to display — `toScoreboard` catches that per
 * event so one bad record cannot blank the page.
 */
export function toGame({ event, subdivisions }: MergedEvent): Game {
	const competition = event.competitions?.[0];
	if (!competition) throw new Error(`Event ${event.id} has no competition`);

	const competitors = competition.competitors ?? [];
	const rawHome = competitors.find((competitor) => competitor.homeAway === 'home');
	const rawAway = competitors.find((competitor) => competitor.homeAway === 'away');
	if (!rawHome || !rawAway) throw new Error(`Event ${event.id} is missing a competitor`);

	const odds = competition.odds?.[0];
	const home = toTeam(rawHome, odds);
	const away = toTeam(rawAway, odds);

	const dateString = competition.date ?? event.date;
	const kickoff = new Date(dateString ?? '');
	if (Number.isNaN(kickoff.getTime())) throw new Error(`Event ${event.id} has no valid date`);

	const eventName =
		competition.notes
			?.filter((note) => note.type === 'event' && note.headline)
			.map((note) => note.headline as string)
			.join(' / ') || undefined;

	const venueAddress = competition.venue?.address;
	const venue = competition.venue
		? {
				name: competition.venue.fullName,
				city: venueAddress?.city,
				state: venueAddress?.state,
				country: venueAddress?.country,
				indoor: competition.venue.indoor
			}
		: undefined;

	return {
		id: event.id,
		name: event.name ?? `${away.displayName} at ${home.displayName}`,
		shortName: event.shortName ?? `${away.abbreviation} @ ${home.abbreviation}`,
		kickoff,
		kickoffTbd: competition.timeValid === false,
		status: toStatus(competition.status ?? event.status),
		away,
		home,
		teams: [away, home] as const,
		broadcasts: toBroadcasts(competition.broadcasts, competition.geoBroadcasts),
		venue,
		neutralSite: competition.neutralSite ?? false,
		conferenceGame: competition.conferenceCompetition ?? false,
		eventName,
		odds: toOdds(odds),
		subdivisions,
		espnUrl: `https://www.espn.com/college-football/game/_/gameId/${event.id}`
	};
}

/** Resolve a human week label from ESPN's calendar, falling back to "Week N". */
function toWeekInfo(merged: MergedScoreboard): WeekInfo {
	const { season, week, calendar } = merged;

	const phase = calendar.find((entry) => entry.value === String(season.type));
	const match = phase?.entries?.find((entry) => entry.value === String(week.number));

	return {
		seasonYear: season.year,
		seasonType: season.type,
		weekNumber: week.number,
		label: match?.label ?? (season.type === POSTSEASON ? 'Postseason' : `Week ${week.number}`),
		slug: weekSlug(season.type, week.number)
	};
}

/**
 * Flatten ESPN's calendar into the list of weeks the app can navigate to.
 *
 * The calendar is grouped by season phase; we keep the regular season and the
 * postseason in that order and drop the off season, which has no games. Entries
 * `weekSlug` has no route for are dropped rather than rendered as dead options.
 *
 * Exported (not just used internally by `toScoreboard`) so `scripts/fetch-weeks.ts`
 * can call it directly against a bare calendar fetch, the same way it's produced
 * here.
 */
export function toWeekOptions(calendar: EspnCalendarType[]): WeekOption[] {
	const options: WeekOption[] = [];

	for (const phaseName of ['regular', 'postseason'] as const) {
		const seasonType = phaseName === 'regular' ? REGULAR_SEASON : POSTSEASON;
		const phase = calendar.find((entry) => entry.value === String(seasonType));

		for (const entry of phase?.entries ?? []) {
			const weekNumber = Number(entry.value);
			if (!entry.value || !Number.isInteger(weekNumber)) continue;

			const slug = weekSlug(seasonType, weekNumber);
			if (!slug) continue;

			options.push({
				slug,
				label: entry.label ?? `Week ${weekNumber}`,
				detail: entry.detail,
				seasonType,
				weekNumber,
				phase: phaseName
			});
		}
	}

	return options;
}

/**
 * Map a merged ESPN response onto the app's `Scoreboard`.
 *
 * Individual unparseable events are skipped and counted rather than thrown, so a
 * single malformed record from an undocumented API cannot take down the page.
 */
export function toScoreboard(merged: MergedScoreboard, fetchedAt: Date = new Date()): Scoreboard {
	const games: Game[] = [];
	let skippedCount = 0;

	for (const entry of merged.events) {
		try {
			games.push(toGame(entry));
		} catch (error) {
			skippedCount += 1;
			console.warn('Skipping unparseable ESPN event', entry.event?.id, error);
		}
	}

	return {
		week: toWeekInfo(merged),
		weeks: toWeekOptions(merged.calendar),
		games,
		fetchedAt,
		partialErrors: merged.partialErrors,
		skippedCount
	};
}
