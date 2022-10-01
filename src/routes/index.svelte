<script lang="ts">
  import "$lib/common.css";
  import type { Game, WeekMetaData } from "$lib/types";
  import settingsIcon from "$lib/assets/settings.svg";
  import SubGames from "$lib/gameListComps/SubGames.svelte";
  import MoreInfo from "$lib/singleGameComps/MoreInfo.svelte";
  import Settings from "$lib/settingsComps/Settings.svelte";
  import UpdateTimes from "$lib/UpdateTimes.svelte";
  import {
    allGamesData,
    allGamesDataRaw,
    weekMetaData,
    seasonInfo,
    settingsVisible,
    gamesToShow,
    teamSearchStr,
    allTeamsList,
    allChannels,
    filterOnChannels,
  } from "$lib/stores";
  import getDerivedInfo from "$lib/gameUtils/derivedInfo";
  import groupGames from "$lib/gameUtils/groupGames";
  const bucketUrl = "https://storage.googleapis.com/weekly-scoreboard-data/";
  const seasonInfoUrl = bucketUrl + "season_info.json";
  const teamListUrl = bucketUrl + "conferences.json";
  const channelListUrl = bucketUrl + "channels.json";
  export function getGameData() {
    allGamesData.update(() =>
      groupGames($allGamesDataRaw, $gamesToShow, $teamSearchStr)
    );
  }
  async function loadNewWeekData({
    season,
    seasonType,
    week,
  }: {
    season: string;
    seasonType: string;
    week: string;
  }) {
    let d: { meta: WeekMetaData; games: Array<Game> };
    if (import.meta.env.VITE_DATA_LOC === "local") {
      d = await import("../data.js")
        .then((x) => x.gd)
        .catch(() => {
          return {
            meta: { season: "", seasonType: "", week: "", lastUpdate: "" },
            games: [],
          };
        });
    } else {
      const gamesFname = `games_${season}_${seasonType}_${week}_FBS-FCS.json?${new Date().getTime()}`;
      d = await fetch(bucketUrl + gamesFname)
        .then((x) => x.json())
        .catch((e) => console.log(e));
    }
    allGamesDataRaw.update(() => d.games.map((g) => getDerivedInfo(g)));
    weekMetaData.update(() => d.meta);
    getGameData();
  }
  async function weekSelectChangeFunc(event: Event) {
    if (!!!event.target) {
      return;
    }
    const target = event.target as HTMLInputElement;
    const [st, w] = (target.value || "").split("_");
    await loadNewWeekData({
      season: $seasonInfo.season,
      seasonType: st,
      week: w,
    });
  }
  async function getInitialData() {
    const initialSeasonInfo = await fetch(seasonInfoUrl, { cache: "no-cache" })
      .then((x) => x.json())
      .catch((e) => console.log(e));
    seasonInfo.update(() => initialSeasonInfo);
    const teamList: Array<{ [key: string]: string }> = await fetch(teamListUrl)
      .then((x) => x.json())
      .catch((e) => console.log(e));
    allTeamsList.update(() =>
      teamList.filter((x) => ["fbs", "fcs"].includes(x.classification))
    );
    const channels: Array<string> = await fetch(channelListUrl)
      .then((x) => x.json())
      .catch((e) => console.log(e));
    allChannels.update(() => channels);
    await loadNewWeekData({
      season: initialSeasonInfo.season,
      seasonType: initialSeasonInfo.seasonType,
      week: initialSeasonInfo.week,
    });
  }
  const initialLoadPromise = getInitialData();
  const hideGroup = {};
  const weekDatesFormatter = (d: string) =>
    Intl.DateTimeFormat([], {
      timeZone: "America/New_York",
      month: "numeric",
      day: "numeric",
    }).format(new Date(d));
  const teamSearchFunc = () => {
    const el = document.getElementById("teamSearch") as HTMLInputElement;
    teamSearchStr.update(() => el.value.trim());
    getGameData();
  };
  const teamSearchReset = () => {
    teamSearchStr.update(() => "");
    getGameData();
  };
</script>

{#await initialLoadPromise}
  <div>Loading data...</div>
{:then}
  {#key $allGamesData}
    <Settings {getGameData} />
    <MoreInfo />
    <div class="header">
      <div class="selections">
        <select name="weekSelect" on:change={(e) => weekSelectChangeFunc(e)}>
          {#each $seasonInfo.calendar as week}
            <option
              value={`${week.seasonType}_${week.week}`}
              selected={week.week == $weekMetaData.week &&
                week.seasonType == $weekMetaData.seasonType}
            >
              {week.seasonType == "2"
                ? "Week " + week.week
                : "Postseason" + " "}
              {#if week.week == $weekMetaData.week && week.seasonType == $weekMetaData.seasonType}
                (current)
              {:else}
                ({weekDatesFormatter(week.start)} - {weekDatesFormatter(
                  week.end
                )})
              {/if}
            </option>
          {/each}
        </select>
        <img
          class="settingsButton"
          src={settingsIcon}
          alt="*"
          on:click={() => settingsVisible.update(() => true)}
        />
      </div>
    </div>
    <div class="mainContent">
      <div class="teamSearch">
        <form on:submit={teamSearchFunc}>
          <input
            class="teamSearchBox"
            id="teamSearch"
            type="text"
            placeholder="Team Search"
            value={$teamSearchStr}
          />
          <button class="teamSearchButton">Search</button>
          {#if $teamSearchStr !== ""}
            <button class="teamSearchButton" on:click={teamSearchReset}
              >Clear</button
            >
          {/if}
        </form>
        {#if $teamSearchStr !== ""}
          <div type="button" class="searchResults">
            Search results: "{$teamSearchStr}"
          </div>
        {/if}
      </div>
      {#if $allGamesData.length > 0}
        <SubGames
          allSubData={$allGamesData}
          {hideGroup}
          previousSubGroupKey={undefined}
          subGroupHierarchy={["Status", "Date", "Hour"]}
          hierarchyLevel={0}
          postCheckClickFunc={getGameData}
        />
      {:else}
        <div class="noGames">No games to show</div>
      {/if}
    </div>
    <div class="footer">
      <UpdateTimes
        lastUpdateStr={$weekMetaData.lastUpdate}
        nextUpdateStr={$weekMetaData.nextUpdate}
      />
      <div>
        Current filters: {[
          $gamesToShow === "All" ? "" : $gamesToShow + " teams",
          $filterOnChannels === "y" ? "selected channels" : "",
        ]
          .filter((s) => s !== "")
          .join(", ")
          .trim() || "None"}
      </div>
    </div>
  {/key}
{:catch}
  <div>An error has occurred - please try again later</div>
{/await}

<style>
  .header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: white;
    z-index: 1;
    border-bottom: 1pt solid lightgray;
  }
  .mainContent {
    overflow: auto;
    padding-bottom: 1.5em;
    padding-top: 2.5em;
  }
  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: white;
    border-top: 1pt solid lightgray;
    font-size: 0.8em;
    text-align: center;
  }
  .selections {
    display: flex;
    justify-content: space-between;
    padding: 0.4em 1em;
  }
  .settingsButton {
    height: 2.2em;
    color: gray;
    cursor: pointer;
  }
  .teamSearch {
    padding: 0.5em;
  }
  .teamSearchBox {
    height: 2.5em;
  }
  .teamSearchButton {
    height: 2.75em;
  }
  .noGames {
    text-align: center;
    font-size: 2em;
    padding: 1em;
  }
  button {
    padding: 0.2em 1em;
  }
  .searchResults {
    font-style: italic;
    margin-top: 0.25em;
  }
</style>
