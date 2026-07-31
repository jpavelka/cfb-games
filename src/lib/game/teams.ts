import { base } from '$app/paths';

export interface TeamInfo {
	id: string;
	location: string;
	name?: string;
	displayName: string;
	abbreviation: string;
	/** Validated and '#'-prefixed, or absent — same contract as `GameTeam.color`. */
	color?: string;
	altColor?: string;
	logoUrl?: string;
	darkLogoUrl?: string;
	subdivision: 'fbs' | 'fcs' | 'd2';
	conferenceId: string;
}

interface RawTeamRecord {
	id: string;
	location: string;
	name?: string;
	displayName: string;
	abbreviation: string;
	color?: string;
	alternateColor?: string;
	subdivision: 'fbs' | 'fcs' | 'd2';
	conferenceId: string;
}

interface TeamsFile {
	season: { year: number };
	teams: RawTeamRecord[];
}

export type TeamMap = Map<string, TeamInfo>;

const HEX_COLOR = /^#?[0-9a-f]{6}$/i;

/**
 * Every FBS/FCS/D2 team's logo lives at this same ESPN CDN path, keyed only by id
 * — confirmed against all but one of the ~430 teams in `teams.json` (one team has
 * a one-off guid-based URL instead). Rather than store the (near-always
 * derivable) URL for every team, it's built here from the id, same as
 * `transform.ts`'s `toDarkLogoUrl` derives the dark variant from a light one.
 * The rare mismatch or missing-logo team just 404s, and `TeamLogo.svelte` already
 * falls back to initials on a load error.
 */
const ESPN_LOGO_BASE = 'https://a.espncdn.com/i/teamlogos/ncaa/500';

function logoUrl(id: string): string {
	return `${ESPN_LOGO_BASE}/${id}.png`;
}

function darkLogoUrl(id: string): string {
	return `${ESPN_LOGO_BASE}-dark/${id}.png`;
}

/** Turn ESPN's bare six-hex-digit color into a CSS color. Mirrors `transform.ts`'s `normalizeColor`. */
function normalizeColor(value: string | undefined): string | undefined {
	if (!value || !HEX_COLOR.test(value)) return undefined;
	return value.startsWith('#') ? value : `#${value}`;
}

function toTeamInfo(raw: RawTeamRecord): TeamInfo {
	return {
		id: raw.id,
		location: raw.location,
		name: raw.name,
		displayName: raw.displayName,
		abbreviation: raw.abbreviation,
		color: normalizeColor(raw.color),
		altColor: normalizeColor(raw.alternateColor),
		logoUrl: logoUrl(raw.id),
		darkLogoUrl: darkLogoUrl(raw.id),
		subdivision: raw.subdivision,
		conferenceId: raw.conferenceId
	};
}

/**
 * Loaded from `static/data/teams.json` (see `scripts/fetch-teams.ts`), refreshed
 * daily by GitHub Actions — not fetched from ESPN directly at view time. The file
 * may not exist yet (a fresh dev environment before `npm run fetch:teams` has run,
 * or before the workflow's first deploy), so a missing/unreadable file yields an
 * empty map rather than failing the page — same fail-soft contract as every other
 * static-data loader (`loadRatingMap`, `loadBroadcasterList`, ...).
 */
export async function loadTeamMap(fetchImpl: typeof fetch = fetch): Promise<TeamMap> {
	try {
		const response = await fetchImpl(`${base}/data/teams.json`);
		if (!response.ok) return new Map();

		const data = (await response.json()) as TeamsFile;
		return new Map(data.teams.map((team) => [team.id, toTeamInfo(team)]));
	} catch (error) {
		console.warn('Could not load team data', error);
		return new Map();
	}
}
