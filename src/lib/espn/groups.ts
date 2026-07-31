import { EspnFetchError, GROUPS, type Subdivision } from './client';

const CORE_API_BASE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/college-football';

export interface ConferenceGroupTeam {
	id: string;
	location: string;
	displayName: string;
	abbreviation: string;
}

export interface ConferenceGroup {
	id: string;
	name: string;
	shortName: string;
	abbreviation: string;
	slug: string;
	teams: ConferenceGroupTeam[];
}

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
	slug: string;
	teams: EspnRef;
}

interface EspnTeamDetail {
	id: string;
	location: string;
	displayName: string;
	abbreviation: string;
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
		throw new EspnFetchError(`ESPN returned a response that was not valid JSON for ${url}.`, {
			cause
		});
	}
}

/**
 * A conference group's own detail links to its teams as a paged ref
 * (`.../groups/{id}/teams`), not an embedded list — one extra fetch per
 * conference for the id list, then one more per team for its name/abbreviation.
 */
async function fetchConferenceTeams(
	teamsRef: EspnRef,
	fetchImpl: typeof fetch
): Promise<ConferenceGroupTeam[]> {
	const { items } = await fetchJson<EspnRefList>(`${teamsRef.$ref}&limit=100`, fetchImpl);
	const teams = await Promise.all(items.map((item) => fetchJson<EspnTeamDetail>(item.$ref, fetchImpl)));
	return teams.map((team) => ({
		id: team.id,
		location: team.location,
		displayName: team.displayName,
		abbreviation: team.abbreviation
	}));
}

/**
 * ESPN's "core" API (distinct from the site API `client.ts` uses) exposes the
 * FBS/FCS group ids (`GROUPS.fbs`/`GROUPS.fcs`) as parents whose `children` are
 * the actual conferences — the same ids that show up as `EspnTeam.conferenceId`
 * in scoreboard payloads. There is no bulk "all conferences" endpoint, so this
 * fetches the child list, then every child's own detail (plus its team roster),
 * in parallel.
 */
export async function fetchConferenceGroups(
	subdivision: Subdivision,
	seasonYear: number,
	options: { fetchImpl?: typeof fetch } = {}
): Promise<ConferenceGroup[]> {
	const { fetchImpl = fetch } = options;
	const groupId = GROUPS[subdivision];
	const childrenUrl = `${CORE_API_BASE}/seasons/${seasonYear}/types/2/groups/${groupId}/children?limit=100`;

	const { items } = await fetchJson<EspnRefList>(childrenUrl, fetchImpl);
	const details = await Promise.all(items.map((item) => fetchJson<EspnGroupDetail>(item.$ref, fetchImpl)));

	return Promise.all(
		details.map(async (group) => ({
			id: group.id,
			name: group.name,
			shortName: group.shortName,
			abbreviation: group.abbreviation,
			slug: group.slug,
			teams: await fetchConferenceTeams(group.teams, fetchImpl)
		}))
	);
}
