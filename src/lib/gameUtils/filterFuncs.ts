import type { Game, Team } from "$lib/types";
import { excludedChannels, filterOnChannels, channelFilterCurrentOnly } from "$lib/stores";
import { get } from "svelte/store";
import { getBroadcastStrFromList } from "$lib/gameUtils/derivedInfo";

const p5Conferences = ['ACC', 'Big Ten', 'Big 12', 'SEC', 'Pac-12']

const oneTeam = (g: Game, teamFilter: Function) => teamFilter(g.teams.away) || teamFilter(g.teams.home);

const gamesToShowTeamFilterFuncs: {[key: string]: Function} = {
    'All': (t: Team) => true,
    'FBS': (t: Team) => t.classification === 'FBS',
    'FCS': (t: Team) => t.classification === 'FCS',
    'P5': (t: Team) => p5Conferences.includes(t.conference || ''),
    'Ranked': (t: Team) => t.ranked
};

let gtsff: {[key: string]: Function} = {};

for (const [k, v] of Object.entries(gamesToShowTeamFilterFuncs)){
    gtsff[k] = (g: Game) => oneTeam(g, v);
}

export const gamesToShowFilterFuncs = gtsff;

export const teamSearchFunc = (g: Game, s: string) => {
    return oneTeam(g, (t: Team) => t.displayName.toLowerCase().includes(s.trim().toLowerCase()))
}

export const filterChannels = (games: Array<Game>) => {
    if (get(channelFilterCurrentOnly) === 'y' && games[0].statusSort !== 'Current'){
        return games
    }
    let gamesToKeep = [];
    for (const g of games){
        if (get(filterOnChannels) === 'y') {
            const allowedChannels = g.broadcastChannels.filter(
                bc => !get(excludedChannels).split(',').includes(bc)
            )
            if (allowedChannels.length > 0){
                g.broadcastStr = getBroadcastStrFromList(allowedChannels);
                gamesToKeep.push(g)
            }
        } else {
            g.broadcastStr = getBroadcastStrFromList(g.broadcastChannels);
            gamesToKeep.push(g);
        }
    }
    return gamesToKeep
}