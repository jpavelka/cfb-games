# cfb-games

A site that shows a week of college football games. This version fetches games
directly from ESPN's unofficial scoreboard API in the browser — there is no backend,
no database, and no scheduled scraper.

Current scope: **any week of the current season's FBS + FCS games, in chronological
order.** User-configurable sorting is the next feature; see [Extending](#extending).

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

## Weeks and routes

```
/            whatever week ESPN considers current
/week5       regular season week 5
/bowls       the full bowl schedule   (ESPN: seasontype 3, week 1)
/playoff     the CFP bracket          (ESPN: seasontype 3, week 999)
```

`/` sends **no** week selectors, which is the only correct way to ask ESPN what "now"
is — **there is deliberately no date arithmetic anywhere in this app.** Every other
route sends `week` + `seasontype` and no `dates`, which ESPN answers for the current
season, so one request per page serves both the games and the week picker.

The picker itself is built from `leagues[0].calendar`, which every response carries.
Slug ↔ ESPN coordinates live in `src/lib/game/weeks.ts`, and `src/params/week.ts`
gates the route so unrelated paths still 404.

Only the current season is reachable. ESPN's `dates=YYYY` param would extend this to
past seasons, but a slug alone cannot express a season year, so it would need a second
dropdown and every link would have to carry the year.

## How it fits together

Data flows one way, and each layer only knows about the one below it:

```
espn/types.ts      raw ESPN payload shapes (everything optional)
espn/client.ts     fetch both divisions, dedupe, merge      <- only fetch() in the app
game/types.ts      the app's own model (no ESPN names, no display strings)
game/weeks.ts      slug <-> ESPN (seasontype, week); no ESPN imports
game/transform.ts  pure raw -> app mapping, incl. calendar -> week options
game/sort.ts       comparators + day grouping
game/load.ts       the fetch -> transform -> sort composition both routes share
format.ts          every user-facing string
components/        presentation only
```

Two constraints are worth knowing before changing anything:

**1. Never add headers to the ESPN request.** ESPN answers `GET` with
`access-control-allow-origin: *`, but answers the CORS preflight `OPTIONS` with
**403**. Any non-safelisted request header (including `Accept`, or what
`cache: 'reload'` adds) turns the request into a preflighted one, which then fails —
*in browsers only*. `curl` and Node keep working, so this breakage is invisible
outside a real browser. There is exactly one `fetch()` call in the codebase, in
`src/lib/espn/client.ts`, and it is commented accordingly.

**2. The page must not be prerendered with data.** `src/routes/+layout.ts` sets
`prerender = true` **and** `ssr = false`: the build emits an inert HTML shell, and
games are fetched at view time. If `load` ever ran during prerendering, every
visitor would get scores frozen at deploy time. `grep gameId build/index.html`
should always come back empty.

A corollary: because the shells contain no links, SvelteKit's prerender crawler can
never discover `/week5` on its own, so `src/routes/[week=week]/+page.ts` exports a
static `entries` list. Without it the build fails outright rather than falling back to
`404.html`.

## ESPN quirks this app handles

These are all real and all present in live payloads:

- **FBS and FCS overlap.** `groups=80` and `groups=81` both return FBS-vs-FCS
  matchups — 48 of 208 games in one sampled week. Events are deduplicated by id.
- **Rank 99 means unranked**, rather than the field being omitted.
- **`score` is a string** (`"28"`).
- **Team colors are bare hex** with no leading `#`, and are validated before being
  used in CSS.
- **Some teams have no logo** (9 of 416 in one sampled week) — initials are shown.
- **`timeValid: false` means the kickoff time is unknown.** The `date` is then a
  placeholder set to *midnight Eastern* on the intended day. Grouping such a game by
  the viewer's local day would file it under the previous day west of Eastern, so
  TBD games are bucketed in `America/New_York` specifically. Everything else uses the
  viewer's own timezone.
- **`records[].type` is only stable for `total` and `vsconf`.** The home/away entries
  are named `homerecord`/`awayrecord` in some seasons and `home`/`road` in others.
- **`odds` may be absent, `null`, or empty**, so it is always read as `odds?.[0]`.
- **Cancellations and postponements arrive as state `post`**, distinguished only by
  the human-readable description.

A malformed event is skipped and counted rather than thrown, so one bad record from
an undocumented API cannot blank the page.

## Deploying

Not wired up yet. The build is static (`@sveltejs/adapter-static`) and ready:

```bash
BASE_PATH=/cfb-games npm run build   # repo is a GitHub *project* page
```

`paths.relative` is on, so assets resolve from whatever subdirectory the site is
served at. `static/.nojekyll` is committed because GitHub Pages otherwise strips
SvelteKit's `_app/` directory. Note that `npm run preview` needs the same
`BASE_PATH` value as the build, since the config reads it at load time.

When wiring up CI, use the official `actions/configure-pages` /
`upload-pages-artifact` / `deploy-pages` actions, which requires setting the repo's
Pages source to **GitHub Actions**.

## Extending

The seams are deliberate and narrow:

- **Sorting:** add a comparator to `comparators` in `src/lib/game/sort.ts`. No
  component needs to change.
- **Filtering:** add pure `(game: Game) => boolean` predicates. Keep them pure — the
  previous version's filters mutated the games they filtered, which made the data
  flow impossible to follow.
- **URL state:** the week already lives in the path; sort and filter selections belong
  in query params on both routes, so views stay linkable.
- **A week ESPN doesn't have** (`/week16` in a 15-week season) is not an error: ESPN
  clamps it back to week 1, so `ScoreboardView` compares the requested slug against
  the week that came back and says so rather than mislabeling the page.

Two things from the previous version **cannot** be rebuilt from the ESPN scoreboard
alone: the matchup/surprise/situation interest scores (they needed Massey power
ratings) and conference-name filtering such as the old P5 filter (the payload carries
only an opaque `conferenceId`). Both would require adding a data source.

## Notes and caveats

- ESPN's API is undocumented and unversioned, with no published rate limits and no
  stability guarantee. Responses carry `cache-control: max-age=10`, which this app
  relies on rather than cache-busting.
- The **live-game** rendering path (`state: 'in'` — clock, quarter, live badge) is
  written but untested against real data, because no in-progress game exists in the
  API outside the season. Same for canceled and postponed games.
- Node: vite is pinned to 6.x because vite 7+ requires Node `^20.19.0 || >=22.12.0`
  and this project was set up on Node 20.18.1. Upgrading Node lets the whole
  toolchain move forward.
- `previous/` is a gitignored reference copy of the pre-rebuild app. It is
  byte-identical to commit `04190e5`, so it can be recovered at any time with
  `git show 04190e5:src/lib/types.ts`.
