import { EspnFetchError } from './client';
import type { BettingFallbackEntry } from '../game/bettingFallback';

const CORE_API_EVENTS_URL = 'https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/events';

const DEFAULT_TIMEOUT_MS = 15_000;

interface EspnCoreOddsTeamOdds {
	moneyLine?: number;
}

interface EspnCoreOddsItem {
	provider?: { name?: string };
	spread?: number;
	overUnder?: number;
	homeTeamOdds?: EspnCoreOddsTeamOdds;
	awayTeamOdds?: EspnCoreOddsTeamOdds;
}

interface EspnCoreOddsResponse {
	count: number;
	items?: EspnCoreOddsItem[];
}

export type EspnEventOdds = Pick<
	BettingFallbackEntry,
	'provider' | 'spread' | 'overUnder' | 'homeMoneyline' | 'awayMoneyline'
>;

/**
 * ESPN's per-event core-API odds endpoint — a different, more complete source
 * than the bulk scoreboard's inline `competition.odds` (which goes `null` once a
 * game is live and never comes back) and than CFBD's `/lines` (which has real
 * gaps for smaller FCS matchups — confirmed empirically: CFBD returned `[]` for
 * several live FCS games this endpoint had real DraftKings lines for). Its own
 * `spread` sign convention matches CFBD's (negative = home team favored) —
 * confirmed against several live games, no conversion needed.
 *
 * One request per game, so this is deliberately never called from the
 * scoreboard's hot polling path (`refreshWeek` in `server/index.ts`) — only the
 * once-daily `refreshBetting` job calls it, and only for games CFBD didn't have
 * a line for.
 *
 * Returns the first (highest-priority) provider's line — same "one provider is
 * enough for a fallback" rule `mergeCfbdBetting` already follows. `null` when
 * ESPN has no market for this game either (a real `count: 0`, not an error).
 */
export async function fetchEventOdds(
	eventId: string,
	fetchImpl: typeof fetch = fetch
): Promise<EspnEventOdds | null> {
	const url = `${CORE_API_EVENTS_URL}/${eventId}/competitions/${eventId}/odds`;

	let response: Response;
	try {
		response = await fetchImpl(url, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });
	} catch (cause) {
		throw new EspnFetchError('Could not reach ESPN (core API odds).', { cause });
	}

	if (!response.ok) {
		if (response.status === 404) return null;
		throw new EspnFetchError(`ESPN core API odds returned HTTP ${response.status}.`, {
			status: response.status
		});
	}

	const data = (await response.json()) as EspnCoreOddsResponse;
	const first = data.items?.[0];
	if (!first) return null;

	return {
		provider: first.provider?.name,
		spread: first.spread,
		overUnder: first.overUnder,
		homeMoneyline: first.homeTeamOdds?.moneyLine,
		awayMoneyline: first.awayTeamOdds?.moneyLine
	};
}
