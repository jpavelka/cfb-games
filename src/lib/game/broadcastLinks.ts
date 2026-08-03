import type { Game } from './types';

/**
 * ESPN's watch player accepts the same event id as the gamecast page, so this
 * is the only family that can point at the specific game. Carried over from
 * the previous app (`previous/src/lib/singleGameComps/Broadcast.svelte`),
 * which used this same `eventCalendarId` URL.
 */
const ESPN_FAMILY = new Set([
	'ABC',
	'ACC Extra',
	'ACC Network',
	'ESPN',
	'ESPN Unlmtd',
	'ESPN+',
	'ESPN2',
	'ESPNU',
	'SEC Network',
	'SECN+'
]);

const FOX_CHANNEL_PATHS: Record<string, string> = {
	FOX: 'fox',
	FS1: 'fs1',
	BTN: 'btn'
};

/**
 * None of these expose a public per-game lookup, so they land on the
 * provider's general live/sports hub rather than the specific broadcast.
 */
const STATIC_LINKS: Record<string, string> = {
	CBS: 'https://www.cbssports.com/watch/live',
	CBSSN: 'https://www.cbssports.com/cbs-sports-network',
	NBC: 'https://www.nbcsports.com/live',
	Peacock: 'https://www.peacocktv.com/sports',
	'USA Net': 'https://www.peacocktv.com/sports',
	'Paramount+': 'https://www.paramountplus.com/live-tv/'
};

/** Best-effort link from a broadcast name to that provider's live stream, or `undefined` if none is known. */
export function broadcastLink(name: string, game: Game): string | undefined {
	if (ESPN_FAMILY.has(name)) {
		return `https://www.espn.com/watch/player/_/om-navmethod/espn%3Acollege-football%3Ascoreboard/eventCalendarId/${game.id}`;
	}
	if (name in FOX_CHANNEL_PATHS) {
		return `https://www.foxsports.com/live/${FOX_CHANNEL_PATHS[name]}`;
	}
	return STATIC_LINKS[name];
}
