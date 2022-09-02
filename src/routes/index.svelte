<script lang='ts'>
    import '$lib/common.css'
    import type { Game, WeekMetaData } from '$lib/types';
    import SubGames from '$lib/gameListComps/SubGames.svelte';
    import MoreInfo from '$lib/singleGameComps/MoreInfo.svelte';
    import Settings from '$lib/Settings.svelte';
    import { allGamesData, allGamesDataRaw, weekMetaData, seasonInfo, settingsVisible, includeFCS } from '$lib/stores';
    import getDerivedInfo from '$lib/gameUtils/derivedInfo';
    import groupGames from '$lib/gameUtils/groupGames';
    const bucketUrl = 'https://storage.googleapis.com/weekly-scoreboard-data/'
    const seasonInfoUrl = bucketUrl + 'season_info.json'
    function getGameData() {
        allGamesData.update(() => groupGames($allGamesDataRaw, $includeFCS))
    }
    async function loadNewWeekData({season, seasonType, week}: {season: string, seasonType: string, week: string}) {
        const gamesFname = `games_${season}_${seasonType}_${week}_FBS-FCS.json`
        const d: {meta: WeekMetaData, games: Array<Game>} = await fetch(
            bucketUrl + gamesFname, {cache: "no-cache"})
                .then(x => x.json())
                .catch(e => console.log(e))
        allGamesDataRaw.update(() => d.games.map(g => getDerivedInfo(g)));
        weekMetaData.update(() => d.meta)
        getGameData();
    }
    async function weekSelectChangeFunc(event) {
        const [st, w] = event.target.value.split('_');
        await loadNewWeekData({season: $seasonInfo.season, seasonType: st, week: w})
    }
    async function getInitialData() {
        const initialSeasonInfo = await fetch(seasonInfoUrl, {cache: "no-cache"})
            .then(x => x.json())
            .catch(e => console.log(e));
        seasonInfo.update(() => initialSeasonInfo);
        await loadNewWeekData({season: initialSeasonInfo.season, seasonType: initialSeasonInfo.seasonType, week: initialSeasonInfo.week})
    }
    const initialLoadPromise = getInitialData();
    const hideGroup = {}
    const weekDatesFormatter = (d: string) => Intl.DateTimeFormat([],
        {timeZone: 'America/New_York', month: 'numeric', day: 'numeric'}
    ).format(new Date(d));
</script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">

{#await initialLoadPromise}
    <div>Loading data...</div>
{:then}
    {#key $allGamesData}
        <Settings
            getGameData={getGameData}
            includeFCS={includeFCS}
        ></Settings>
        <MoreInfo></MoreInfo>
        <div class=mainContent>
            <div class=selections>
                <select
                    name='weekSelect'
                    on:change={e => weekSelectChangeFunc(e)}
                >
                    {#each $seasonInfo.calendar as week}
                        <option 
                            value={`${week.seasonType}_${week.week}`}
                            selected={week.week == $weekMetaData.week && week.seasonType == $weekMetaData.seasonType}
                        >
                            {week.seasonType == '2' ? 'Week ' + week.week : 'Postseason' + ' '}
                            ({weekDatesFormatter(week.start)} - {weekDatesFormatter(week.end)})
                        </option>
                    {/each}
                </select>
                <span
                    class=settingsButton
                    on:click={() => settingsVisible.update(() => true)}
                >
                <i class="fa fa-gear"></i></span>
            </div>
            <SubGames
                allSubData={$allGamesData}
                hideGroup={hideGroup}
                previousSubGroupKey={undefined}
                subGroupHierarchy={['Status', 'Date', 'Hour']}
                hierarchyLevel={0}
                postCheckClickFunc={getGameData}
            ></SubGames>
        </div>
        <div class=lastUpdate>Last update: {(new Date($weekMetaData.lastUpdate)).toLocaleString(
            [], {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'}
        )}</div>
    {/key}
{:catch}
    <div>An error has occurred - please try again later</div>
{/await}

<style>
    .mainContent {
        overflow: auto;
        padding-bottom: 1.5em;
    }
    .lastUpdate {
        font-size: 0.8em;
        position: fixed;
        bottom: 0;
        width: 100%;
        text-align: center;
        background: white;
    }
    .selections {
        display: flex;
        justify-content: space-between;
        padding: 0.5em;
    }
    .settingsButton {
        font-size: 1.75em;
        color: gray;
        margin-top: 0.1em;
        margin-right: 0.3em;
        cursor: pointer;
    }
</style>