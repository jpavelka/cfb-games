import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { Game, GameGrouping, WeekMetaData, SeasonInfo } from '$lib/types';
import Cookies from 'js-cookie'

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
export const teamSearchStr: Writable<string> = writable('');
export const allTeamsList: Writable<Array<{[key: string]: string}>> = writable([]);
export const settingsScrollY: Writable<number> = writable(0);

const createCookieSyncedStore = (name: string, defaultValue: string, allowedValues: Array<string> | undefined) => {
    let currentCookieValue = Cookies.get(name) || defaultValue;
    if (allowedValues !== undefined){
        if (currentCookieValue === undefined){
            currentCookieValue = defaultValue;
        }
        if (!allowedValues.includes(currentCookieValue)){
            currentCookieValue = defaultValue;
        }
    }
    const cookieStore: Writable<string> = writable(currentCookieValue);
    cookieStore.subscribe(val => {
        Cookies.set(name, val, {expires:30})
    })
    return cookieStore
}

export const gamesToShow = createCookieSyncedStore('gamesToShow', 'All', ['All', 'FBS', 'FCS', 'P5', 'Ranked']);
export const showGameBars = createCookieSyncedStore('showGameBars', 'y', ['y', 'n']);
export const showFavoriteTeamsFirst = createCookieSyncedStore('showFavoriteTeamsFirst', 'y', ['y', 'n']);
export const favoriteTeams = createCookieSyncedStore('favoriteTeams', '', undefined);

