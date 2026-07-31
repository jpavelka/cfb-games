import { browser } from '$app/environment';

export type TeamFilter = 'all' | 'fbs' | 'fcs' | 'power4' | 'ranked';

/** How favorite teams affect sort order: pin their games first, boost their matchup score, or leave sorting alone. */
export type FavoriteHandling = 'top' | 'boost' | 'none';

export type Theme = 'system' | 'light' | 'dark';

export interface SettingsState {
	/** Hide games below this matchup score. 0 = no filter. */
	minMatchupScore: number;
	teamFilter: TeamFilter;
	/** ESPN team ids the user has starred as favorites. */
	favoriteTeamIds: string[];
	favoriteHandling: FavoriteHandling;
	/** Added to a favorite game's matchup score for sorting, when `favoriteHandling` is `'boost'`. */
	favoriteBoostAmount: number;
	theme: Theme;
}

const STORAGE_KEY = 'cfb:settings';
const DEFAULTS: SettingsState = {
	minMatchupScore: 0,
	teamFilter: 'all',
	favoriteTeamIds: [],
	favoriteHandling: 'none',
	favoriteBoostAmount: 15,
	theme: 'system'
};

/**
 * Reads persisted settings from localStorage. Isolated behind this function (and
 * `updateSettings` below) so a later swap to a backend-saved profile only touches
 * this file, not every call site.
 */
function loadInitial(): SettingsState {
	if (!browser) return { ...DEFAULTS };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULTS };
		return { ...DEFAULTS, ...JSON.parse(raw) };
	} catch (error) {
		console.warn('Could not load settings', error);
		return { ...DEFAULTS };
	}
}

export const settings: SettingsState = $state(loadInitial());

export function updateSettings(patch: Partial<SettingsState>): void {
	Object.assign(settings, patch);
	if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// Tracks the OS-level preference so 'system' theme can resolve to an actual
// light/dark value (e.g. for choosing a logo variant) without needing an $effect.
const darkMediaQuery = browser ? window.matchMedia('(prefers-color-scheme: dark)') : undefined;
let systemPrefersDark = $state(darkMediaQuery?.matches ?? false);
darkMediaQuery?.addEventListener('change', (event) => {
	systemPrefersDark = event.matches;
});

const darkMode = $derived(
	settings.theme === 'dark' || (settings.theme === 'system' && systemPrefersDark)
);

export function isDarkMode(): boolean {
	return darkMode;
}

export function toggleFavoriteTeam(teamId: string): void {
	const isFavorite = settings.favoriteTeamIds.includes(teamId);
	updateSettings({
		favoriteTeamIds: isFavorite
			? settings.favoriteTeamIds.filter((id) => id !== teamId)
			: [...settings.favoriteTeamIds, teamId]
	});
}
