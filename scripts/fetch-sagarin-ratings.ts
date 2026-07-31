import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchMergedScoreboard } from '../src/lib/espn/client';
import { BOWLS_WEEK, CFP_WEEK, POSTSEASON, REGULAR_SEASON } from '../src/lib/game/weeks';
import { SAGARIN_ALIASES } from './sagarin-aliases';

/**
 * Fetches Jeff Sagarin's college football ratings (a single plain-text page,
 * FBS and FCS on one combined scale) and writes each team's rating, keyed by
 * ESPN team id, to `static/data/sagarin.json`.
 *
 * Replaces the old Massey Ratings pipeline (reverse-engineered obfuscated JS,
 * now behind a Cloudflare challenge) that used to live in the legacy Python
 * backend. This script owns the whole thing: fetch, parse, match to ESPN ids,
 * and write — no backend involved.
 */

// Plain http, not https: sagarin.com's TLS cert is expired, so https fails with
// a cert error. Plain http returns a clean 200 — no insecure-TLS workaround needed.
const SAGARIN_URL = 'http://sagarin.com/sports/cfsend.htm';

const OUTPUT_PATH = path.join(import.meta.dirname, '..', 'static', 'data', 'sagarin.json');

const MONTHS: Record<string, number> = {
	january: 1,
	february: 2,
	march: 3,
	april: 4,
	may: 5,
	june: 6,
	july: 7,
	august: 8,
	september: 9,
	october: 10,
	november: 11,
	december: 12
};

// Matches both "FINAL College Football 2025 ratings through games of 2026 January 19 Monday - ..."
// and "College Football 2026 ratings through games of 2026 October 12 Sunday" (mid-season, no "FINAL").
// The line repeats throughout the page (once per table section) but is identical every time, so the
// first match is authoritative.
const AS_OF_LINE = /^.*ratings through games of.*$/m;
const AS_OF_DATE = /ratings through games of\s+(\d{4})\s+([A-Za-z]+)\s+(\d{1,2})\b/;

// A team-rating row, e.g.:
//   "   1  Indiana              A  = 100.06   16   0   77.35(  10) ..."
//   "  82  Tarleton State       AA =  66.62   12   2 ... WESTERN ATHLETIC    (AA)"
// Shape: rank, team name, a BARE "A"/"AA" token, "=", signed float rating.
// Conference-summary rows (must NOT match) wrap the division letters in parens
// fused or spaced against "=" instead (e.g. "SWAC-EAST (AA)= 38.28", "SEC (A) = 81.10"),
// which this pattern naturally rejects since it requires whitespace before a bare token.
// Trying "AA" before "A" in the alternation avoids matching just the leading "A" of "AA".
const TEAM_ROW = /^\s*(\d+)\s+(.+?)\s+(AA|A)\s+=\s*(-?\d+\.\d+)/;

interface AsOfResult {
	asOf: string | null;
	asOfLabel: string | null;
}

function parseAsOf(html: string): AsOfResult {
	const lineMatch = AS_OF_LINE.exec(html);
	if (!lineMatch) return { asOf: null, asOfLabel: null };

	const label = lineMatch[0].trim();
	const dateMatch = AS_OF_DATE.exec(label);
	if (!dateMatch) return { asOf: null, asOfLabel: label };

	const [, year, monthName, day] = dateMatch;
	const month = MONTHS[monthName.toLowerCase()];
	if (!month) return { asOf: null, asOfLabel: label };

	return { asOf: `${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`, asOfLabel: label };
}

/** Falls back to the HTTP `Last-Modified` header when the page's own header line is missing/unparseable. */
function resolveAsOf(html: string, lastModified: string | null): AsOfResult {
	const parsed = parseAsOf(html);
	if (parsed.asOf) return parsed;

	if (lastModified) {
		const date = new Date(lastModified);
		if (!Number.isNaN(date.getTime())) {
			return {
				asOf: date.toISOString().slice(0, 10),
				asOfLabel: parsed.asOfLabel ?? `Last-Modified: ${lastModified}`
			};
		}
	}
	return parsed;
}

interface SagarinRow {
	rank: number;
	name: string;
	division: 'fbs' | 'fcs';
	rating: number;
}

/**
 * The page lists every team twice (once ranked overall, once again grouped by
 * conference) plus a predictions table that never matches `TEAM_ROW` at all.
 * Scanning every line and deduping by rank+name naturally collapses the repeat.
 */
function parseTeamRows(html: string): SagarinRow[] {
	const rows: SagarinRow[] = [];
	const seen = new Set<string>();

	for (const line of html.split(/\r?\n/)) {
		const match = TEAM_ROW.exec(line);
		if (!match) continue;

		const [, rankStr, rawName, divisionToken, ratingStr] = match;
		const name = rawName.trim();
		if (!name || name === '***UNRATED***') continue;

		const key = `${rankStr}|${name}`;
		if (seen.has(key)) continue;
		seen.add(key);

		rows.push({
			rank: Number(rankStr),
			name,
			division: divisionToken === 'AA' ? 'fcs' : 'fbs',
			rating: Number(ratingStr)
		});
	}

	return rows;
}

async function fetchSagarinPage(): Promise<{ html: string; lastModified: string | null }> {
	const response = await fetch(SAGARIN_URL, { signal: AbortSignal.timeout(20_000) });
	if (!response.ok) throw new Error(`Sagarin site returned HTTP ${response.status}.`);
	return { html: await response.text(), lastModified: response.headers.get('last-modified') };
}

interface EspnRosterTeam {
	id: string;
	location: string;
	displayName: string;
}

/**
 * ESPN's own teams-list endpoint ignores its `groups` filter (verified: groups=80
 * and groups=81 return the same 755-team list spanning every division, with no
 * classification field to filter by) so it can't scope "just FBS+FCS" on its own.
 * Instead, reuse the scoreboard fetcher — which does correctly respect
 * groups=80/81, since that's how the whole app already works — across every week
 * of the season, and union every team it ever shows us.
 */
async function buildEspnRoster(): Promise<EspnRosterTeam[]> {
	const byId = new Map<string, EspnRosterTeam>();

	// No selectors = ESPN's current week/season; used only to read the season year
	// and calendar. A partial selector set (e.g. week without seasonYear) makes
	// ESPN fall back in surprising ways (see buildScoreboardUrl's own warning), so
	// every per-week call below always passes seasonYear alongside week/seasonType.
	const seed = await fetchMergedScoreboard({});
	const seasonYear = seed.season.year;

	const weekTargets: Array<{ week: number; seasonType: number }> = [];
	for (const seasonType of [REGULAR_SEASON, POSTSEASON]) {
		const phase = seed.calendar.find((entry) => entry.value === String(seasonType));
		for (const entry of phase?.entries ?? []) {
			const weekNumber = Number(entry.value);
			if (!entry.value || !Number.isInteger(weekNumber)) continue;
			weekTargets.push({ week: weekNumber, seasonType });
		}
	}
	const hasWeek = (week: number, seasonType: number) =>
		weekTargets.some((target) => target.week === week && target.seasonType === seasonType);
	if (!hasWeek(BOWLS_WEEK, POSTSEASON)) weekTargets.push({ week: BOWLS_WEEK, seasonType: POSTSEASON });
	if (!hasWeek(CFP_WEEK, POSTSEASON)) weekTargets.push({ week: CFP_WEEK, seasonType: POSTSEASON });

	for (const { week, seasonType } of weekTargets) {
		let merged;
		try {
			merged = await fetchMergedScoreboard({ seasonYear, week, seasonType });
		} catch (error) {
			console.warn(`Skipping week ${week} (season type ${seasonType}): ${(error as Error).message}`);
			continue;
		}

		for (const { event } of merged.events) {
			const competitors = event.competitions?.[0]?.competitors ?? [];
			for (const competitor of competitors) {
				const team = competitor.team;
				// ESPN uses "TBD"/"TBA" placeholder teams (negative or numeric-looking
				// junk ids) for slots not yet filled (e.g. an unset playoff matchup) —
				// not real teams, so they'd only ever show up as noise in missingEspnTeams.
				if (!team?.id || team.displayName === 'TBD' || team.displayName === 'TBA' || byId.has(team.id)) {
					continue;
				}
				byId.set(team.id, {
					id: team.id,
					location: team.location ?? team.displayName ?? '',
					displayName: team.displayName ?? team.location ?? ''
				});
			}
		}
	}

	return [...byId.values()];
}

function normalize(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const SUFFIX_SUBSTITUTIONS: Array<[string, string]> = [
	['State', 'St'],
	['Eastern', 'E'],
	['Western', 'W'],
	['Northern', 'N'],
	['Southern', 'S'],
	['Central', 'C']
];

function findEspnMatch(sagarinName: string, roster: EspnRosterTeam[]): EspnRosterTeam | undefined {
	const target = normalize(sagarinName);
	const byName = (name: string) => roster.find((team) => normalize(team.location) === name || normalize(team.displayName) === name);

	let hit = byName(target);
	if (hit) return hit;

	const alias = SAGARIN_ALIASES[sagarinName];
	if (alias) {
		hit = byName(normalize(alias));
		if (hit) return hit;
	}

	for (const [from, to] of SUFFIX_SUBSTITUTIONS) {
		if (!sagarinName.includes(from)) continue;
		hit = byName(normalize(sagarinName.replace(from, to)));
		if (hit) return hit;
	}

	return undefined;
}

interface SagarinOutput {
	asOf: string | null;
	asOfLabel: string | null;
	fetchedAt: string;
	teams: Record<string, { rating: number; rank: number; division: 'fbs' | 'fcs'; sagarinName: string }>;
	errors: {
		unmatchedSagarinTeams: Array<{ sagarinName: string; rank: number; rating: number }>;
		missingEspnTeams: Array<{ espnId: string; name: string }>;
	};
}

async function main() {
	const { html, lastModified } = await fetchSagarinPage();
	const { asOf, asOfLabel } = resolveAsOf(html, lastModified);

	const sagarinRows = parseTeamRows(html);
	if (sagarinRows.length === 0) {
		throw new Error('Parsed zero team rows from the Sagarin page — the page format likely changed.');
	}

	const roster = await buildEspnRoster();
	if (roster.length === 0) {
		throw new Error('ESPN roster build returned zero teams — cannot match Sagarin ratings.');
	}

	const teams: SagarinOutput['teams'] = {};
	const unmatchedSagarinTeams: SagarinOutput['errors']['unmatchedSagarinTeams'] = [];
	const matchedEspnIds = new Set<string>();

	for (const row of sagarinRows) {
		const match = findEspnMatch(row.name, roster);
		if (!match) {
			unmatchedSagarinTeams.push({ sagarinName: row.name, rank: row.rank, rating: row.rating });
			continue;
		}
		matchedEspnIds.add(match.id);
		teams[match.id] = { rating: row.rating, rank: row.rank, division: row.division, sagarinName: row.name };
	}

	const missingEspnTeams = roster
		.filter((team) => !matchedEspnIds.has(team.id))
		.map((team) => ({ espnId: team.id, name: team.displayName || team.location }));

	const output: SagarinOutput = {
		asOf,
		asOfLabel,
		fetchedAt: new Date().toISOString(),
		teams,
		errors: { unmatchedSagarinTeams, missingEspnTeams }
	};

	await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
	await writeFile(OUTPUT_PATH, JSON.stringify(output, null, '\t') + '\n');

	// Matching gaps are logged, not fatal: they're expected during a live season
	// (new teams, rankings still settling) and are left in `errors` for manual
	// review rather than failing the workflow.
	console.log(
		`Wrote ${Object.keys(teams).length} team ratings (asOf ${asOf ?? 'unknown'}) to ${OUTPUT_PATH}. ` +
			`${unmatchedSagarinTeams.length} unmatched Sagarin rows, ${missingEspnTeams.length} ESPN teams with no rating.`
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
