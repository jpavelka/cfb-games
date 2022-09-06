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
export const gamesToShow: Writable<string> = writable(Cookies.get('gamesToShow') || 'All');
gamesToShow.subscribe((val) => {Cookies.set('gamesToShow', val, {expires: 30})});
export const teamSearchStr: Writable<string> = writable('');