import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { Game, GameGrouping, WeekMetaData, SeasonInfo } from '$lib/types';
import { browser } from "$app/env"

export const allGamesDataRaw: Writable<Array<Game> | undefined> = writable(undefined);
export const allGamesData: Writable<Array<GameGrouping>> = writable([]);
export const moreInfoVisible: Writable<boolean> = writable(false);
export const settingsVisible: Writable<boolean> = writable(false);
export const moreInfoGame: Writable<Game> = writable();
export const displaySubGroups: Writable<{[key: string]: boolean}> = writable({});
export const weekMetaData: Writable<WeekMetaData> = writable({
    season: '', seasonType: '', week: '', lastUpdate: ''
});
export const seasonInfo: Writable<SeasonInfo> = writable({
    season: '', seasonType: '', week: '', calendar: []
});
export const includeFCS: Writable<string> = writable(browser && localStorage.getItem("includeFCS") || "t");
includeFCS.subscribe((val) => {if (browser) return (localStorage.userId = val)})