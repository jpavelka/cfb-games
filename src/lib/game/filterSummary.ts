import type { SettingsState, TeamFilter } from './settings.svelte';

const TEAM_FILTER_LABELS: Record<Exclude<TeamFilter, 'all'>, string> = {
	fbs: 'FBS only',
	fcs: 'FCS only',
	power4: 'Power 4 only',
	ranked: 'Ranked teams only'
};

/**
 * Human-readable summary of every setting currently narrowing or reordering the
 * game list — shared between the toolbar's "N customizations applied" link (see
 * `ScoreboardView.svelte`) and the "Current customizations" readout at the top
 * of `SettingsModal.svelte`, so the two can't drift out of sync.
 */
export function describeActiveFilters(settings: SettingsState): string[] {
	const parts: string[] = [];
	if (settings.teamFilter !== 'all') parts.push(TEAM_FILTER_LABELS[settings.teamFilter]);
	if (settings.minMatchupScore > 0) parts.push(`Matchup score ≥ ${settings.minMatchupScore}`);
	if (settings.filterByAccessibleBroadcasts && settings.accessibleBroadcasts.length > 0) {
		parts.push(`Watchable channels only (${settings.accessibleBroadcasts.length})`);
	}
	if (settings.favoriteTeamIds.length > 0 && settings.favoriteHandling !== 'none') {
		parts.push(
			settings.favoriteHandling === 'top'
				? 'Favorite teams pinned to top'
				: `Favorite teams boosted +${settings.favoriteBoostAmount}`
		);
	}
	return parts;
}
