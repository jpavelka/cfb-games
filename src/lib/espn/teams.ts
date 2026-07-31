import { EspnFetchError } from './client';

const CORE_API_BASE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/college-football';
const SITE_API_TEAMS_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams';

/**
 * ESPN's core-API group ids for the three divisions whose teams can show up as an
 * opponent in the FBS/FCS scoreboard (`GROUPS` in `client.ts`, which only covers
 * `fbs`/`81` for *fetching games* — this is a separate concept: which teams we
 * consider "known" for display purposes). Confirmed by walking ESPN's group tree:
 * group 90 ("NCAA Division I") has children 80 (FBS) and 81 (FCS); group 35
 * ("Division II/III") has children 57 (Division II) and 58 (Division III) — 58 is
 * deliberately excluded, so a D3 opponent is the edge case `server/` falls back on.
 */
export const DIVISION_GROUPS = { fbs: '80', fcs: '81', d2: '57' } as const;

export type Division = keyof typeof DIVISION_GROUPS;

interface EspnRef {
	$ref: string;
}

interface EspnRefList {
	items: EspnRef[];
}

interface EspnGroupDetail {
	id: string;
	name: string;
	shortName: string;
	abbreviation: string;
	teams: EspnRef;
}

export interface DivisionTeamInfo {
	subdivision: Division;
	conferenceId: string;
	conferenceName: string;
	conferenceShortName: string;
	conferenceAbbreviation: string;
}

async function fetchJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
	let response: Response;
	try {
		response = await fetchImpl(url);
	} catch (cause) {
		throw new EspnFetchError(`Could not reach ESPN at ${url}.`, { cause });
	}

	if (!response.ok) {
		throw new EspnFetchError(`ESPN returned HTTP ${response.status} for ${url}.`, {
			status: response.status
		});
	}

	try {
		return (await response.json()) as T;
	} catch (cause) {
		throw new EspnFetchError(`ESPN returned a response that was not valid JSON for ${url}.`, { cause });
	}
}

const TEAM_ID_FROM_REF = /\/teams\/(\d+)(?:\?|$)/;

/**
 * A conference's team roster ref (`.../groups/{id}/teams`) lists team refs shaped
 * `.../seasons/{year}/teams/{teamId}?...` — the id is right there in the URL, so
 * unlike the old `groups.ts` this never fetches each team's own detail just to
 * learn its id (colors/logos/names come from `fetchTeamDirectory` instead, in one
 * bulk call, not one fetch per team).
 */
async function fetchConferenceTeamIds(teamsRef: EspnRef, fetchImpl: typeof fetch): Promise<string[]> {
	const { items } = await fetchJson<EspnRefList>(`${teamsRef.$ref}&limit=200`, fetchImpl);
	const ids: string[] = [];
	for (const item of items) {
		const match = TEAM_ID_FROM_REF.exec(item.$ref);
		if (match) ids.push(match[1]);
	}
	return ids;
}

/**
 * Walk ESPN's core API group tree for FBS, FCS, and Division II, returning which
 * teams belong to each (and which conference). This is the "known teams" set —
 * `server/` uses just the keys of this map to decide whether a game's opponent
 * needs a `fallback` written inline (see `storedScoreboard.ts`); `fetch-teams.ts`
 * joins it against `fetchTeamDirectory`'s richer per-team data to build
 * `static/data/teams.json`.
 */
export async function fetchDivisionTeamIds(
	seasonYear: number,
	options: { fetchImpl?: typeof fetch } = {}
): Promise<Map<string, DivisionTeamInfo>> {
	const { fetchImpl = fetch } = options;
	const result = new Map<string, DivisionTeamInfo>();

	await Promise.all(
		(Object.entries(DIVISION_GROUPS) as Array<[Division, string]>).map(async ([subdivision, groupId]) => {
			const childrenUrl = `${CORE_API_BASE}/seasons/${seasonYear}/types/2/groups/${groupId}/children?limit=100`;
			const { items } = await fetchJson<EspnRefList>(childrenUrl, fetchImpl);
			const conferences = await Promise.all(items.map((item) => fetchJson<EspnGroupDetail>(item.$ref, fetchImpl)));

			await Promise.all(
				conferences.map(async (conference) => {
					const teamIds = await fetchConferenceTeamIds(conference.teams, fetchImpl);
					for (const teamId of teamIds) {
						result.set(teamId, {
							subdivision,
							conferenceId: conference.id,
							conferenceName: conference.name,
							conferenceShortName: conference.shortName,
							conferenceAbbreviation: conference.abbreviation
						});
					}
				})
			);
		})
	);

	return result;
}

interface SiteApiTeam {
	id: string;
	location: string;
	name?: string;
	displayName: string;
	abbreviation: string;
	color?: string;
	alternateColor?: string;
}

interface SiteApiTeamsResponse {
	sports?: Array<{
		leagues?: Array<{
			teams?: Array<{ team: SiteApiTeam }>;
		}>;
	}>;
}

export interface TeamDirectoryEntry {
	location: string;
	name?: string;
	displayName: string;
	abbreviation: string;
	color?: string;
	alternateColor?: string;
}

function toDirectoryEntry(team: SiteApiTeam): TeamDirectoryEntry {
	return {
		location: team.location,
		name: team.name,
		displayName: team.displayName,
		abbreviation: team.abbreviation,
		color: team.color,
		alternateColor: team.alternateColor
	};
}

/**
 * ESPN's bulk team list ignores any `groups` filter and always returns every
 * division (~750 teams, FBS through D3) in one response — confirmed empirically,
 * not documented. That's fine here: it's used purely as a metadata directory,
 * joined against `fetchDivisionTeamIds`'s narrower id set by the caller.
 *
 * The list has real gaps though — a handful of teams that do have a current
 * roster (via `fetchDivisionTeamIds`'s group/conference walk) are simply absent
 * here, `isActive: false` or not (confirmed against a few stragglers: some are
 * flagged inactive, some aren't). Callers should fall back to `fetchTeamDetail`
 * for any id this doesn't cover rather than dropping the team.
 */
export async function fetchTeamDirectory(
	options: { fetchImpl?: typeof fetch } = {}
): Promise<Map<string, TeamDirectoryEntry>> {
	const { fetchImpl = fetch } = options;
	const url = `${SITE_API_TEAMS_URL}?limit=1000`;
	const data = await fetchJson<SiteApiTeamsResponse>(url, fetchImpl);

	const teams = data.sports?.[0]?.leagues?.[0]?.teams ?? [];
	const directory = new Map<string, TeamDirectoryEntry>();

	for (const { team } of teams) {
		if (!team?.id) continue;
		directory.set(team.id, toDirectoryEntry(team));
	}

	return directory;
}

interface SiteApiTeamDetailResponse {
	team?: SiteApiTeam;
}

/**
 * Per-team fallback for a straggler `fetchTeamDirectory` doesn't cover — same
 * data, one team at a time, so only worth calling for the handful of ids the
 * bulk list is missing.
 */
export async function fetchTeamDetail(
	id: string,
	options: { fetchImpl?: typeof fetch } = {}
): Promise<TeamDirectoryEntry | undefined> {
	const { fetchImpl = fetch } = options;
	const data = await fetchJson<SiteApiTeamDetailResponse>(`${SITE_API_TEAMS_URL}/${id}`, fetchImpl);
	return data.team ? toDirectoryEntry(data.team) : undefined;
}
