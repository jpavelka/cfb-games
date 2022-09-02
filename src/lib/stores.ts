import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { Game, GameGrouping, WeekMetaData, SeasonInfo } from '$lib/types';

export const allGamesDataRaw: Writable<Array<Game> | undefined> = writable(undefined);
export const allGamesData: Writable<Array<GameGrouping>> = writable([]);
export const moreInfoVisible: Writable<boolean> = writable(false);
export const settingsVisible: Writable<boolean> = writable(false);
export const moreInfoGame: Writable<Game> = writable();
export const displaySubGroups: Writable<{[key: string]: boolean}> = writable({});
export const weekMetaData: Writable<WeekMetaData> = writable({
    season: undefined, seasonType: undefined, week: undefined, lastUpdate: undefined
});
export const seasonInfo: Writable<SeasonInfo> = writable({
    season: undefined, seasonType: undefined, week: undefined, calendar: []
});
export const includeFCS: Writable<boolean> = writable(true);