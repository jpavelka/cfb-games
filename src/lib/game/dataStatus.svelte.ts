import type { Scoreboard } from './types';

/**
 * The currently-displayed week's freshness info, mirrored out of whichever
 * `Scoreboard` promise `ScoreboardView` is showing right now — so the sticky
 * footer (rendered in `+layout.svelte`, a sibling with no direct access to that
 * promise) can read it. `null` while a week is loading or its board failed to load.
 */
export interface DataStatus {
	fetchedAt: Date | null;
	nextRefreshAt: Date | null;
}

export const dataStatus: DataStatus = $state({ fetchedAt: null, nextRefreshAt: null });

export function setDataStatus(board: Scoreboard | null): void {
	dataStatus.fetchedAt = board?.fetchedAt ?? null;
	dataStatus.nextRefreshAt = board?.nextRefreshAt ?? null;
}
