/**
 * Sagarin's team names -> ESPN's `location`/`displayName`, for the cases where
 * exact string matching and the suffix-substitution fallback (see
 * `fetch-sagarin-ratings.ts`) both fail.
 *
 * This is a different vocabulary than the legacy Massey `e2m` table
 * (previously `cfb-cloud-run/data_utils/massey/espn_to_massey.py`), which mapped
 * ESPN names to Massey's own abbreviated convention (e.g. 'Miami': 'Miami FL').
 * Sagarin has its own, different naming quirks.
 *
 * This table is meant to be grown iteratively: run `npm run fetch:sagarin`,
 * look at `errors.unmatchedSagarinTeams` in the resulting
 * `static/data/sagarin.json`, and add an entry here for each genuine naming
 * mismatch (not for teams that are legitimately absent from one source or the
 * other — those are correct diagnostics, not bugs to silence).
 *
 * Key: Sagarin's exact name as it appears in its ratings table.
 * Value: the ESPN `location` (or `displayName`) to match against.
 */
export const SAGARIN_ALIASES: Record<string, string> = {
	'Miami-Florida': 'Miami',
	'Miami-Ohio': 'Miami (OH)',
	'Central Florida(UCF)': 'UCF',
	'Fla. International': 'Florida International',
	'Sam Houston State': 'Sam Houston',
	Mississippi: 'Ole Miss Rebels',
	'Southern California': 'USC Trojans',
	'Army West Point': 'Army Black Knights',
	Connecticut: 'UConn Huskies',
	'Louisiana-Lafayette': "Louisiana Ragin' Cajuns",
	'Appalachian State': 'App State Mountaineers',
	'San Jose State': 'San José State Spartans',
	'Monmouth-NJ': 'Monmouth Hawks',
	UTRGV: 'UT Rio Grande Valley Vaqueros',
	'SC State': 'South Carolina State Bulldogs',
	'LouisianaMonroe(ULM)': 'UL Monroe Warhawks',
	'Cal Poly-SLO': 'Cal Poly Mustangs',
	'Tennessee-Martin': 'UT Martin Skyhawks',
	'NC Central': 'North Carolina Central Eagles',
	'St. Thomas-Mn.': 'St. Thomas',
	'Saint Francis-Pa.': 'Saint Francis Red Flash',
	'Nicholls State': 'Nicholls Colonels',
	'McNeese State': 'McNeese Cowboys',
	'Presbyterian College': 'Presbyterian Blue Hose',
	'SE Missouri State': 'Southeast Missouri State Redhawks',
	'LIU Post': 'Long Island University Sharks',
	'Grambling State': 'Grambling Tigers',
	'Albany-NY': 'UAlbany Great Danes',
	'Stonehill College': 'Stonehill Skyhawks',
	'Southern U.': 'Southern Jaguars',
	'Ark.-Pine Bluff': 'Arkansas-Pine Bluff Golden Lions',
	'NC A&T': 'North Carolina A&T Aggies',
	'Miss. Valley State': 'Mississippi Valley State Delta Devils'
};
