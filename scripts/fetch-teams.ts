import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ALL_SUBDIVISIONS, fetchScoreboard } from '../src/lib/espn/client';
import { fetchDivisionTeamIds, fetchTeamDetail, fetchTeamDirectory, type DivisionTeamInfo } from '../src/lib/espn/teams';

export interface TeamRecord {
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

export interface ConferenceRecord {
	id: string;
	name: string;
	shortName: string;
	abbreviation: string;
	subdivision: 'fbs' | 'fcs' | 'd2';
}

const TEAMS_OUTPUT_PATH = path.join(import.meta.dirname, '..', 'static', 'data', 'teams.json');
const CONFERENCES_OUTPUT_PATH = path.join(import.meta.dirname, '..', 'static', 'data', 'conferences.json');

/**
 * `fetchDivisionTeamIds` already walks every conference's group detail (name,
 * shortName, abbreviation) to build its per-team map — deduping it here gives us
 * `conferences.json` for free, without a second ESPN walk of the same group tree.
 */
function toConferenceRecords(divisionTeamIds: Map<string, DivisionTeamInfo>): ConferenceRecord[] {
	const byId = new Map<string, ConferenceRecord>();
	for (const info of divisionTeamIds.values()) {
		if (byId.has(info.conferenceId)) continue;
		byId.set(info.conferenceId, {
			id: info.conferenceId,
			name: info.conferenceName,
			shortName: info.conferenceShortName,
			abbreviation: info.conferenceAbbreviation,
			subdivision: info.subdivision
		});
	}
	return [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

async function main() {
	// No week/season selectors, so ESPN answers for the current season — same
	// rule the app itself follows (see src/routes/+page.ts).
	const { season } = await fetchScoreboard(ALL_SUBDIVISIONS[0]);
	const seasonYear = season?.year;
	if (!seasonYear) throw new Error('ESPN scoreboard response had no season.year.');

	const [divisionTeamIds, directory] = await Promise.all([
		fetchDivisionTeamIds(seasonYear),
		fetchTeamDirectory()
	]);

	const teams: TeamRecord[] = [];
	let fetchedIndividually = 0;
	let missing = 0;

	for (const [id, division] of divisionTeamIds) {
		let entry = directory.get(id);
		if (!entry) {
			// The bulk directory has real gaps (see fetchTeamDirectory's doc comment) —
			// worth one extra fetch per straggler rather than dropping the team.
			entry = await fetchTeamDetail(id);
			if (entry) {
				fetchedIndividually += 1;
			} else {
				missing += 1;
				console.warn(`Team ${id} (${division.subdivision}, conference ${division.conferenceName}) has no ESPN team data at all — skipping.`);
				continue;
			}
		}

		teams.push({
			id,
			location: entry.location,
			name: entry.name,
			displayName: entry.displayName,
			abbreviation: entry.abbreviation,
			color: entry.color,
			alternateColor: entry.alternateColor,
			subdivision: division.subdivision,
			conferenceId: division.conferenceId
		});
	}

	teams.sort((a, b) => Number(a.id) - Number(b.id));
	const conferences = toConferenceRecords(divisionTeamIds);

	await mkdir(path.dirname(TEAMS_OUTPUT_PATH), { recursive: true });
	await writeFile(TEAMS_OUTPUT_PATH, JSON.stringify({ season: { year: seasonYear }, teams }, null, '\t') + '\n');
	await writeFile(
		CONFERENCES_OUTPUT_PATH,
		JSON.stringify({ season: { year: seasonYear }, conferences }, null, '\t') + '\n'
	);

	console.log(
		`Wrote ${teams.length} teams and ${conferences.length} conferences (season ${seasonYear}) to ${path.dirname(TEAMS_OUTPUT_PATH)}` +
			(fetchedIndividually ? `, ${fetchedIndividually} fetched individually (missing from the bulk directory)` : '') +
			(missing ? `, ${missing} skipped (no ESPN team data at all)` : '')
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
