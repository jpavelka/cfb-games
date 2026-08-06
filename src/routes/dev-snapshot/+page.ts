import { dev } from '$app/environment';
import { base } from '$app/paths';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const prerender = false;

export interface SnapshotIndexEntry {
	name: string;
	label: string;
	capturedAt: string;
	/**
	 * Filename under `static/dev-data/` (e.g. `betting-backup-2025.json`, see
	 * `scripts/build-local-betting-backup.ts`) to use as this snapshot's betting
	 * fallback instead of the live `static/data/betting.json` — a manual,
	 * per-entry opt-in for snapshots captured from a past season.
	 */
	bettingFile?: string;
}

/**
 * Lists locally-captured dev snapshots (see `scripts/fetch-dev-snapshot.ts` and
 * `static/dev-data/index.json`, both gitignored) so `/dev-snapshot/[name]` never
 * has to be typed from memory. Dev-only: 404s outside `npm run dev`, and this
 * route is excluded from prerendering (see `prerender = false` above) since the
 * root layout otherwise forces every static route into the production build.
 */
export const load: PageLoad = async ({ fetch }) => {
	if (!dev) error(404, 'Not found');

	const response = await fetch(`${base}/dev-data/index.json`);
	const snapshots: SnapshotIndexEntry[] = response.ok ? await response.json() : [];

	return { snapshots };
};
