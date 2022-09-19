export type Game = {
    id: string;
    stadium: string | undefined;
    venue: {
        fullName: string;
        address: {
            city: string;
            state?: string | undefined;
        };
    };
    location: string | undefined;
    teams: {
        home: Team;
        away: Team;
    };
    teamsArray: Array<Team>;
    eventStr: string | undefined;
    spread: number | undefined;
    favored: string | undefined;
    overUnder: number | undefined;
    dttmStr: string;
    dateStr: string;
    dateSortStr: string;
    hourStr: string;
    hourSortStr: string;
    broadcastStr: string | undefined;
    timeValid: boolean;
    conferenceCompetition: boolean;
    neutralSite: boolean;
    dttm: string;
    notes: Array<{
        type: string;
        headline: string;
    }>;
    odds: {
        provider: string;
        spread: number;
        overUnder: number;
        homeFavored: boolean;
    } | null;
    geoBroadcasts: Array<{
        market: {
            type: string;
        };
        media: {
            shortName: string;
        }
    }>;
    gameInterest: number;
    spreadTouchdowns: number;
    statusDetail: string;
    statusState: 'in' | 'pre' | 'post' | 'postponed' | 'canceled';
    statusDesc: string;
    statusSort: string | undefined;
    possession: string;
    downDist?: string;
    possessionText?: string;
    lastPlay?: string;
    teamsTbd: boolean;
    possessionHomeAway?: string;
    favoriteTeamGame: boolean;
    period: number;
    displayClock: string;
}

export type Team = {
    id: string;
    school: string;
    mascot: string;
    abbreviation: string;
    displayName: string;
    rank: number | 'unranked' | undefined;
    ranked: boolean | undefined;
    logo: string;
    favored: boolean;
    recordOverall: string | undefined;
    recordConference: string | undefined;
    score?: number | undefined;
    winner?: boolean;
    loser?: boolean;
    possession?: boolean;
    conference?: string;
    classification?: string;
    masseyRank: {
        composite: number;
        mean: number;
    }
    approxRank: number;
}

export type GameGrouping = {
    commonStr: string,
    games: Array<Game>,
    subGames: Array<GameGrouping>
}

export type WeekMetaData = {
    season: string;
    seasonType: string;
    week: string;
    lastUpdate: string;
}

type SeasonWeekInfo = {
    seasonType: string;
    week: string;
    start: string;
    end: string;
}

export type SeasonInfo = {
    season: string;
    seasonType: string;
    week: string;
    calendar: Array<SeasonWeekInfo>;
}
