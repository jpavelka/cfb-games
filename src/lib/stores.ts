import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { Game, GameGrouping, WeekMetaData, SeasonInfo } from '$lib/types';
import { browser } from "$app/env";

export const allGamesDataRaw: Writable<Array<Game> | undefined> = writable(undefined);
export const allGamesData: Writable<Array<GameGrouping>> = writable([]);
export const moreInfoVisible: Writable<boolean> = writable(false);
export const settingsVisible: Writable<boolean> = writable(false);
export const moreInfoGame: Writable<Game> = writable();
export const settingsHideTeamGroup: Writable<{[key: string]: boolean}> = writable({'currentFavorites': true});
export const settingsHideChannels: Writable<boolean> = writable(true);
export const displaySubGroups: Writable<{[key: string]: boolean}> = writable({});
export const weekMetaData: Writable<WeekMetaData> = writable({
    season: '', seasonType: '', week: '', lastUpdate: ''
});
export const seasonInfo: Writable<SeasonInfo> = writable({
    season: '', seasonType: '', week: '', calendar: []
});
export const allChannels: Writable<Array<string>> = writable([]);
export const teamSearchStr: Writable<string> = writable('');
export const allTeamsList: Writable<Array<{[key: string]: string}>> = writable([]);
export const settingsScrollY: Writable<number> = writable(0);
export const showRefreshButton: Writable<boolean> = writable(false);
export const dataRefreshing: Writable<boolean> = writable(false);
export const recentDataUpdate: Writable<boolean> = writable(false);

const createStorageSyncedStore = (name: string, defaultValue: string, allowedValues: Array<string> | undefined) => {
    let currentStorageValue = defaultValue;
    if (browser) {
        currentStorageValue = localStorage.getItem(name) || defaultValue;
    }
    if (allowedValues !== undefined){
        if (currentStorageValue === undefined){
            currentStorageValue = defaultValue;
        }
        if (!allowedValues.includes(currentStorageValue)){
            currentStorageValue = defaultValue;
        }
    }
    const storageStore: Writable<string> = writable(currentStorageValue);
    if (browser) {
        storageStore.subscribe(val => {
            localStorage.setItem(name, val)
        })
    }
    return storageStore
}

export const gamesToShow = createStorageSyncedStore('gamesToShow', 'All', ['All', 'FBS', 'FCS', 'P5', 'Ranked']);
export const showGameBars = createStorageSyncedStore('showGameBars', 'y', ['y', 'n']);
export const showFavoriteTeamsFirst = createStorageSyncedStore('showFavoriteTeamsFirst', 'y', ['y', 'n']);
export const favoriteTeams = createStorageSyncedStore('favoriteTeams', '', undefined);
export const filterOnChannels = createStorageSyncedStore('filterOnChannels', 'n', ['y', 'n']);
export const excludedChannels = createStorageSyncedStore('excludedChannels', '', undefined);
export const channelFilterCurrentOnly = createStorageSyncedStore('channelFilterCurrentOnly', 'n', ['y', 'n']);

const gameSortChoices = {
    'Current Games': ['Default', 'Situation', 'Matchup', 'Surprise'],
    'Upcoming Games': ['Matchup', 'Start Time'],
    'Completed Games': ['Default', 'Matchup', 'Surprise']
};
let gss: {[key: string]: {choices: Array<string>, store: Writable<string>}} = {}
for (const [k, v] of Object.entries(gameSortChoices)){
    gss[k] = {choices: v, store: createStorageSyncedStore(k.replace(' ', '') + 'SortStyle', v[0], v)}
}
export { gss as gameSortStyles }