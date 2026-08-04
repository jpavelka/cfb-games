import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { EXCLUDED_TEAM_IDS, SLUGS } from '../src/lib/game/winsipediaLink';

interface RawTeamRecord {
	id: string;
	location: string;
	displayName: string;
	subdivision: 'fbs' | 'fcs' | 'd2';
}

interface TeamsFile {
	teams: RawTeamRecord[];
}

const TEAMS_PATH = path.join(import.meta.dirname, '..', 'static', 'data', 'teams.json');

/**
 * Compares `winsipediaLink.ts`'s hand-built `SLUGS` table against the current
 * `teams.json` so realignment (a team promoted to FBS/FCS, or one that drops
 * out) surfaces automatically instead of silently going stale. Winsipedia
 * itself has no API, so this can only flag *which* team ids need attention —
 * picking the actual slug (and figuring out Winsipedia's naming quirks) is
 * still a manual step; see the process in `winsipediaLink.ts`'s file comment.
 *
 * Always exits 0 — this is a report, not a build-breaking check. Run daily as
 * part of `refresh-data.yml`, right after `teams.json` is refetched.
 */
async function main() {
	const raw = await readFile(TEAMS_PATH, 'utf-8');
	const { teams } = JSON.parse(raw) as TeamsFile;
	const current = teams.filter((t) => t.subdivision === 'fbs' || t.subdivision === 'fcs');
	const currentIds = new Set(current.map((t) => t.id));

	const missing = current.filter((t) => !(t.id in SLUGS) && !(t.id in EXCLUDED_TEAM_IDS));
	const stale = Object.keys(SLUGS).filter((id) => !currentIds.has(id));

	if (missing.length === 0 && stale.length === 0) {
		console.log('winsipediaLink.ts SLUGS table is up to date with teams.json.');
	}

	const lines: string[] = [];
	if (missing.length) {
		lines.push(`${missing.length} FBS/FCS team(s) missing a Winsipedia slug:`);
		for (const t of missing) {
			lines.push(`- ${t.displayName} (id ${t.id}, ${t.subdivision.toUpperCase()})`);
		}
	}
	if (stale.length) {
		if (lines.length) lines.push('');
		lines.push(`${stale.length} SLUGS entr${stale.length === 1 ? 'y is' : 'ies are'} stale (id no longer FBS/FCS):`);
		for (const id of stale) {
			lines.push(`- id ${id} → '${SLUGS[id]}'`);
		}
	}

	if (lines.length) console.log(lines.join('\n'));

	const githubOutput = process.env.GITHUB_OUTPUT;
	if (githubOutput) {
		const report = lines.join('\n');
		const delimiter = `EOF_${Date.now()}`;
		await appendFile(
			githubOutput,
			`missing_count=${missing.length}\nstale_count=${stale.length}\nreport<<${delimiter}\n${report}\n${delimiter}\n`
		);
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
