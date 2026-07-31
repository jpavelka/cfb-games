# cfb-games

A site that shows a week of college football games — every FBS + FCS matchup,
sortable by how interesting the game is, filterable by team/conference/rank/channel,
with a starred-favorites list and a persistent settings panel.

The site itself is a fully static build (`@sveltejs/adapter-static`, deployed to
GitHub Pages). It never talks to ESPN directly at view time; instead it reads
pre-fetched data from two places built for that purpose — see
[How it fits together](#how-it-fits-together) below.

## Running it

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run check` | `svelte-check` type/a11y pass |
| `npm run build` | Static build into `build/` |
| `npm run preview` | Serve the build locally |
| `npm run fetch:conferences` | Refresh `static/data/conferences.json` from ESPN |
| `npm run fetch:sagarin` | Refresh `static/data/sagarin.json` (team ratings) |
| `npm run fetch:weeks` | Refresh `static/data/weeks.json` (week picker + current week) |
| `npm run fetch:broadcasters` | Refresh `static/data/broadcasters.json` (channel list) |
| `npm run deploy:server` | Deploy/update the `server/` refresh service on Cloud Run |

`npm run dev` alone is enough for local work: it reads live per-week scores from
the public GCS bucket the deployed `server/` service maintains, and falls back to
whatever `static/data/*.json` was last committed/fetched for everything else.

## Features

- **Weeks:** any regular-season week, the full bowl schedule, or the CFP bracket
  — see [Weeks and routes](#weeks-and-routes).
- **Sort by matchup interest:** each game gets a 0–99 score from combined team
  strength (Sagarin ratings) and closeness (moneyline win probability or rating
  gap, whichever says the game is closer) — `src/lib/game/ratings.ts`.
- **Favorites:** star teams; `favoriteHandling` in settings controls whether
  their games are pinned to the top (`'top'`), given a score boost (`'boost'`),
  or left alone (`'none'`) — `src/lib/game/settings.svelte.ts`.
- **Filters:** minimum matchup score, team category (all/FBS/FCS/Power 4/ranked),
  broadcaster access (hide games not on a channel you have) — `src/lib/game/filter.ts`.
- **Team/event search:** free-text match against team names/abbreviations or the
  event name (e.g. "Rose Bowl", "CFP") — `src/lib/game/filter.ts`.
- **Theme:** light/dark/system, persisted alongside every other setting in
  `localStorage['cfb:settings']`.
- **Data freshness indicator:** a footer showing when the current week's data was
  last fetched and when it's next due to refresh — `src/lib/game/dataStatus.svelte.ts`.

## Weeks and routes

```
/            whatever week ESPN considers current (splits into Week 0 / Week 1 — see below)
/week0       the season-opening Saturday, when ESPN merges it into Week 1
/week5       regular season week 5
/bowls       the full bowl schedule   (ESPN: seasontype 3, week 1)
/playoff     the CFP bracket          (ESPN: seasontype 3, week 999)
```

`/` shows whichever week `static/data/weeks.json` last saw ESPN consider current
— there is deliberately no date arithmetic anywhere else in this app. Every other
route resolves its own `week` + `seasonType` from the slug, via
`src/lib/game/weeks.ts`.

ESPN doesn't give the season-opening Saturday its own calendar entry — it folds it
into the same "Week 1" response as the following week's real slate. `src/lib/game/
openingWeek.ts` detects that (two separate Saturdays in one week's games) and
splits it into `/week0` and `/week1`, injecting a "Week 0" entry into the picker
only when a season actually needs one.

The picker's option list, and which week is current, both come from
`static/data/weeks.json` (see [Static data pipeline](#static-data-pipeline)), not
a live calendar fetch — see `src/lib/game/weekOptions.ts`.

Only the current season is reachable. ESPN's `dates=YYYY` param would extend this
to past seasons, but a slug alone cannot express a season year, so it would need a
second dropdown and every link would have to carry the year.

## How it fits together

Two independent, differently-refreshed data sources feed the page, and the
frontend never calls ESPN itself:

1. **Per-week scores** (`src/lib/game/storage.ts`) — read from a public GCS bucket
   (`cfb-scoreboard-data`) that the Cloud Run service in `server/` keeps current.
   See [The refresh backend](#the-refresh-backend).
2. **Slow-moving reference data** (`static/data/*.json` — conferences, Sagarin
   ratings, the week schedule, the broadcaster list) — fetched from ESPN directly
   by `scripts/fetch-*.ts`, refreshed daily by GitHub Actions, and checked into
   the built site rather than fetched at view time. See
   [Static data pipeline](#static-data-pipeline).

```
espn/types.ts        raw ESPN payload shapes (everything optional)
espn/client.ts        fetch both divisions, dedupe, merge      <- only fetch() of ESPN in the frontend
game/types.ts         the app's own model (no ESPN names, no display strings)
game/weeks.ts          slug <-> ESPN (seasontype, week); no ESPN imports
game/transform.ts     pure raw -> app mapping, incl. calendar -> week options
game/storedScoreboard.ts  the on-disk/wire contract server/ writes and storage.ts reads
game/storage.ts        fetch one week's games from the GCS bucket
game/weekOptions.ts    week picker + "current week", from static/data/weeks.json
game/ratings.ts        Sagarin ratings -> matchup score, from static/data/sagarin.json
game/conferences.ts    conference/Power 4 lookup, from static/data/conferences.json
game/broadcasters.ts   channel list, from static/data/broadcasters.json
game/sort.ts            comparators + day grouping
game/openingWeek.ts    Week 0 / Week 1 split
game/load.ts            the storage -> transform -> sort composition every route shares
game/filter.ts          pure Game[] -> Game[] predicates
game/settings.svelte.ts persisted user prefs (favorites, filters, theme)
format.ts               every user-facing string
components/             presentation only
```

Two constraints are worth knowing before changing anything:

**1. Never add headers to a direct ESPN request.** ESPN answers `GET` with
`access-control-allow-origin: *`, but answers the CORS preflight `OPTIONS` with
**403**. Any non-safelisted request header (including `Accept`, or what
`cache: 'reload'` adds) turns the request into a preflighted one, which then
fails — *in browsers only*. `curl` and Node keep working, so this breakage is
invisible outside a real browser. This only matters for `src/lib/espn/client.ts`
(shared by `server/` and the `scripts/fetch-*.ts` scripts) — the browser itself
never calls ESPN.

**2. The page must not be prerendered with data.** `src/routes/+layout.ts` sets
`prerender = true` **and** `ssr = false`: the build emits an inert HTML shell, and
games are fetched at view time. If `load` ever ran during prerendering, every
visitor would get scores frozen at deploy time. `grep gameId build/index.html`
should always come back empty.

A corollary: because the shells contain no links, SvelteKit's prerender crawler
can never discover `/week5` on its own, so `src/routes/[week=week]/+page.ts`
exports a static `entries` list (`week0`..`week20`, `bowls`, `playoff`). Without
it the build fails outright rather than falling back to `404.html`.

## The refresh backend

`server/` is a separate Cloud Run service (own `package.json`) with no framework
— a plain `node:http` server (`server/index.ts`) — that keeps `cfb-scoreboard-data`
current so the frontend never has to hit ESPN itself:

- **`POST /bootstrap`** — reads ESPN's calendar for whatever season is current and
  starts one independent, self-rescheduling chain per reachable week.
- **`POST /refresh-week`** — fetch + store one week; if `reschedule` is set,
  enqueues its own next check via Cloud Tasks. The delay is computed by
  `server/reschedule.ts` (a pure port of the old Python scheduler): tight while a
  game is live, backing off once everything for the day is either not started or
  finished.
- **`POST /check-season`** — polled daily by Cloud Scheduler; detects an ESPN
  season rollover and, if one happened, restarts the refresh chains for the new
  season and schedules `/cleanup-old-season` for the old one.
- **`POST /cleanup-old-season`** — deletes the previous season's GCS files once
  the new season actually has data of its own (retries for ~8 days before giving
  up rather than deleting speculatively).

Each week's file is `games-{seasonYear}-{seasonType}-{week}.json`, written via
`server/gcs.ts` and read back by `src/lib/game/storage.ts` — the wire format is
the trimmed `StoredScoreboard`/`StoredGame` shape in `game/storedScoreboard.ts`,
not the full `Scoreboard`/`Game` model every component uses.

Deploying: copy `.env.deploy.example` to `.env.deploy` (gitignored — project ID,
region, bucket name, service account names, allowed CORS origins) and run
`scripts/deploy.sh`. It's idempotent — safe to re-run for both first-time setup
and routine redeploys — and provisions the GCS bucket, service accounts, Cloud
Tasks queue, Cloud Run service, and the daily `check-season` Cloud Scheduler job.
Pass `--bootstrap` on first-time setup (or a deliberate restart) to also kick off
the refresh chains.

## Static data pipeline

`static/data/conferences.json`, `sagarin.json`, `weeks.json`, and
`broadcasters.json` are generated by `scripts/fetch-*.ts`, each hitting ESPN's
public API directly rather than reading the GCS bucket — these run independently
of any deployed week, so there's nothing in the bucket for them to read from
anyway. They're gitignored and refreshed two ways:

- **Daily**, by `.github/workflows/refresh-data.yml` (11:00 UTC, after Sagarin's
  typical early-morning update), which then does a full rebuild + GitHub Pages
  deploy.
- **Carried forward** on every ordinary `master` push, by
  `.github/workflows/deploy.yml`, which checks the last-known copies out of the
  `gh-pages` branch before building — otherwise a normal code deploy would ship a
  build missing all four files.

`sagarin.json` ratings have no fixed scale; `game/ratings.ts` rescales them
linearly per-fetch so the lowest rating in the file maps to 1 and the highest to
99.

## ESPN quirks this app handles

These are all real and all present in live payloads (`src/lib/espn/client.ts` and
`game/transform.ts`):

- **FBS and FCS overlap.** `groups=80` and `groups=81` both return FBS-vs-FCS
  matchups — 48 of 208 games in one sampled week. Events are deduplicated by id.
- **Rank 99 means unranked**, rather than the field being omitted.
- **`score` is a string** (`"28"`).
- **Team colors are bare hex** with no leading `#`, and are validated before being
  used in CSS.
- **Some teams have no logo** (9 of 416 in one sampled week) — initials are shown.
- **`timeValid: false` means the kickoff time is unknown.** The `date` is then a
  placeholder set to *midnight Eastern* on the intended day. Grouping such a game
  by the viewer's local day would file it under the previous day west of Eastern,
  so TBD games are bucketed in `America/New_York` specifically. Everything else
  uses the viewer's own timezone.
- **`records[].type` is only stable for `total` and `vsconf`.** The home/away
  entries are named `homerecord`/`awayrecord` in some seasons and `home`/`road`
  in others.
- **`odds` may be absent, `null`, or empty**, so it is always read as `odds?.[0]`.
- **Cancellations and postponements arrive as state `post`**, distinguished only
  by the human-readable description.

A malformed event is skipped and counted rather than thrown, so one bad record
from an undocumented API cannot blank the page.

## Deploying the frontend

Static build (`@sveltejs/adapter-static`), deployed to GitHub Pages by
`.github/workflows/deploy.yml` / `refresh-data.yml` via
`JamesIves/github-pages-deploy-action`:

```bash
BASE_PATH=/cfb-games npm run build   # repo is a GitHub *project* page
```

`paths.relative` is on, so assets resolve from whatever subdirectory the site is
served at. `static/.nojekyll` is committed because GitHub Pages otherwise strips
SvelteKit's `_app/` directory. `npm run preview` needs the same `BASE_PATH` value
as the build, since the config reads it at load time.

## Extending

The seams are deliberate and narrow:

- **Sorting:** add a comparator to `comparators` in `src/lib/game/sort.ts`. No
  component needs to change.
- **Filtering:** add pure `(game: Game) => boolean` predicates to
  `src/lib/game/filter.ts`. Keep them pure — the previous version's filters
  mutated the games they filtered, which made the data flow impossible to follow.
- **A week ESPN doesn't have** (`/week16` in a 15-week season) is not an error:
  ESPN clamps it back to week 1, so the page compares the requested slug against
  the week that came back and says so rather than mislabeling the page.
- **A dropped field:** if a component starts needing something `StoredGame`
  doesn't carry, add it back to `game/storedScoreboard.ts` first — don't widen it
  back to the full `Scoreboard`/`Game` model wholesale.

## Notes and caveats

- ESPN's API is undocumented and unversioned, with no published rate limits and
  no stability guarantee. Live responses carry `cache-control: max-age=10`.
- The **live-game** rendering path (`state: 'in'` — clock, quarter, live badge) is
  exercised for real once games are actually in progress each season; win
  probability / betting odds for in-progress games is a tracked follow-up, not yet
  built.
- Node 22 (CI's `actions/setup-node` version) is the baseline; `package.json`
  currently runs vite 8.
- `previous/` is a gitignored reference copy of the pre-rebuild Svelte 3 app (old
  `src/routes/index.svelte`, `src/lib/gameListComps/`, etc.), kept around during
  the migration. It's byte-identical to commit `04190e5`, so it can be recovered
  at any time with `git show 04190e5:src/lib/types.ts`.
</content>
