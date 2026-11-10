# Architecture

How Daybook is put together, where things live, and how to change it safely.
Start here before touching code.

## Files

Daybook is the city (`city.js`), and since 2026-11-10 it is called **Arcadia** on screen (title, Home Screen name, boot, HUD,
notifications, backups). The repo, the Worker (`daybook`), the domain, storage keys (`daybook_v1`...), caches and the
backup's `daybook` key keep the old name so data, sync and old backups keep working. The old home, Dex and the pages were retired in November 2026: the city took over in
p17 and their code was deleted in p18. index.html keeps the data, sync and app logic the city reads through
`window.CityApp`.

| Path | What it is |
|---|---|
| `index.html` | The data and logic: state, sync, pay periods, quick add, School, the island toasts, and `window.CityApp` (~1,700 lines). A small `<style>` for the boot screen, the toasts and CITY OFFLINE. No build step. |
| `city.js` | Daybook itself: the island, its rooms and the red HUD (in a shadow root). All 3D is built in code. Reads and acts on the app through `window.CityApp`. See docs/CITY.md. |
| `perf.js` | The performance tiers and Auto's step-down (see Performance). Sets `html[data-perf]` and `window.Perf` when imported. |
| `tools/blender/` | Headless Blender scripts that turn a Tripo export into an app-ready GLB (see docs/CHARACTER.md, Models v5). |
| `models/` (not in git) | `her.glb`, the apartment's figure, served from KV (see Hosting). Dex's old looks were deleted from KV on 2026-11-10. **Never commit models** (public repo). |
| `vendor/` | three.js r169 (`three.module.min.js`, loaded through an import map in `<head>`) and `jsm/` (GLTFLoader and the BufferGeometryUtils it imports). |
| `meals.json` | The Recipe Book (`v: 2`): 16 recipes at three portions each (two tonight, one spare), amounts written into every step. Each recipe carries `g`, its shopping items as aisle-and-item id plus amount (`["Produce\|Garlic", "2 cloves"]`); `aisles` is the shelf order; plus `snacks`. Bump `v` and `bookOk()` together when the shape changes. |
| `sw.js` | Service worker. Network-first cache, push notifications, notification buttons. |
| `src/worker.js` | Cloudflare Worker: sync, push, sky and model APIs, reminder cron. |
| `src/push.js` | Web Push encryption (RFC 8291) and VAPID signing (RFC 8292), no libraries. |
| `wrangler.jsonc` | Worker config: custom domain, KV binding, Durable Object `Store` (synced state), cron, VAPID public key. |
| `icons/`, `manifest.webmanifest` | Home-screen app icons and manifest. The icon is Arcadia's A (2026-11-10); `icons/arcadia.svg` is its source, rendered to the four PNGs (512, 192, 180, 64) in headless Edge. |
| `docs/` | These notes. `CITY.md` is the plan for the city home, with its Handoff. Not served on the site (`.assetsignore`). |

## Hosting and deploy

- Lives at **apps.jacksonhamm.ca**, a Cloudflare Worker named `daybook` with static assets.
- **A push to `main` deploys on its own** in about 40 seconds (Cloudflare Workers Builds via the GitHub app).
- Check a deploy is live: `curl -s "https://apps.jacksonhamm.ca/?cb=$RANDOM" | grep -c <something new>`.
- Secrets live in the Cloudflare dashboard, not the repo: `SYNC_KEYS` (allowed sync-code hashes) and `VAPID_PRIVATE_JWK`.
- There's no Cloudflare Access in front of the site (turned off on 2026-09-19). The sync and push APIs check the sync code.
- The assets directory is the repo root. `.assetsignore` keeps `.dev.vars`, `.wrangler`, `.claude`, `.git`, `models`, `node_modules`, `tools` and `docs` off the site; check it still lists them before any direct `npx wrangler deploy`.
- The old workout app (Jackson-Workout-Plan) and its `/workout/` proxy were retired in November 2026 (p18); the program lives in `program.json`.
- `/models/<name>` is served by the Worker from KV key `model:<name>` (stored gzipped, sent with `content-encoding: gzip`). To update `her.glb`: build it with the `tools/blender/` pipeline (docs/CHARACTER.md, Models v5), gzip it (`gzip -9 -k models/her.glb`), run `npx wrangler kv key put --binding SYNC --remote "model:her.glb" --path models/her.glb.gz` (a remote write: his go first), then bump `?v=` on its `url` in city.js. The service worker caches models cache-first.

## Data

Everything is one object, `S`, saved to `localStorage.daybook_v1` and synced.

| Key | Holds |
|---|---|
| `tasks[]`, `jobs[]`, `notes[]` | Lists of items with `id` and `u` (last changed). |
| `shifts{date}`, `workouts{date}`, `extra{periodEnd}`, `shakes{date}`, `meals{week}`, `grocery{id}`, `snacks{name}` | Keyed maps, each value stamped with `u`. |
| `tomb{}` | Deletions, kept 30 days so other devices learn about them. |
| `settings` | Name, pay rate, payday anchor and cycle, cut-off, goals, reminders. |
| `template[7]` | The weekly training split (D1–D4, HIIT, REST). |
| `clock` | The running shift timer. Synced (stamped `clockU`), so clocking in on the phone shows on the laptop. |
| `ui` | Was the old pages' view state; empty now, still stripped before a sync. **Never synced.** |
| `since`, `seen[]`, `clearDays[]`, `submitted{payday}`, `settingsU`, `templateU`, `clockU` | First day used, trophies already shown, all-clear days, when hours went to Len, and the change stamps for `settings`, `template` and `clock`. |

Every top-level key above is listed in `KNOWN` in index.html (see Sync).

**Training program (2026-10-05):** lives in `program.json` (days `d1`-`d5`: sections of exercises with sets). Edit that file
to change the program. It used to be parsed out of the old workout app, which Daybook no longer needs.
- Program 2 is five lifting days (Push, Pull, Legs, Upper, Max Day; Max Day is Day 5 since 2026-10-08 so it ends the week), one conditioning day and one rest day (`SPLIT`).
- `migrateProgram()` moves the weekly split onto it once (`settings.programV`) and pins the old split onto past days,
  so earlier weeks keep their history and streak.
- Set ticks are stored by an exercise's place in its day. When exercises are *removed*, list their old places in `TICK_EDITS` (index.html) under a new number: ticks already made that week are moved once per device, so they stay on their exercises. When two days trade places, add `swap: [a, b]` and their ticks move across. For bigger reshuffles, bump `W_STATE` to clear the week's ticks.

Workout logs (`workout_state_v4`, `log_*_v1`) are per device, in localStorage.
They only exist on the device that ran it, so `syncAuto()` only un-ticks an auto-done session on a device that has that session's log.

## Pay periods

- Two-week periods, **Friday to Thursday** (`payAnchor` 2026-09-25 is a payday; the period ends the
  day before payday). Paid the Friday after it ends.
- Hours go to Len on the **Monday** of payday week (`submitDay` = payday − `paySubmitDays` 4), with
  Tue–Thu estimated from recent same-weekday shifts. E.g. Sep 25 – Oct 8: send Mon Oct 5, paid Fri Oct 9.
- **The shop is period-based** (his call: always show the period total): the headline is the period's hours × rate
  (+ subscription hours), all 14 days are listed Fri → Thu, and it steps back through periods (`CityApp.work(d)`).
  "Copy for Len" copies the submit summary.

## Sync

- `save()` stamps whatever changed, then syncs ~1s later. Backgrounding the app flushes a pending change at once (keepalive).
- The Worker stores state in a **Durable Object** (`Store`, one per sync-code hash), not KV. KV reads can be ~60s stale
  in another location, which let one device overwrite the other's newer changes. The old KV copy (`state:<hash>`) is
  carried over on first read and is no longer written.
- A sync only PUTs when the merged state differs from the server's (`sig()`, order-blind), so idle devices don't write.
- Devices merge item by item (newest `u` wins, tombstones win over older items), and a `409` triggers a re-merge.
- **A new keyed map or list must be added to both lists in `stampChanges()` and `mergeState()`**, or it won't sync.
- **Keys from a newer version survive older copies** (Phase 0, for School). An old copy of the app (a Home Screen app
  resumed after days, a snoozed tab, an offline start) only merges the keys it knows, so on its own it would PUT a
  state without a newer key, and the Durable Object keeps no history. Two guards:
  - **Worker (the real protection):** the `syncApi` PUT copies every top-level key the stored state has and the body
    lacks into the body before writing ("an older app copy never removes keys it doesn't know"). The `if-match` rev
    check is unchanged. Nothing in the app deletes a top-level key (only `ui` is stripped, and it's never stored).
  - **Client:** `KNOWN` (next to `mergeState`) lists every top-level key this version reads or writes. At the end of
    `mergeState`, any key in the server's copy that isn't in `KNOWN` is taken as-is (the server's copy wins; this
    version never edits it). Keys only this device has are left alone. Known keys merge exactly as before.
  - **A new top-level key must be added to `KNOWN`**, or an older copy's rules apply to it.
- **Task categories from a newer version** (e.g. Phase 2's `cat:'school'`) never crash: `catOf(k)` falls back to
  Personal, and `tasksOn`, `slipped` and `overdue` skip tasks whose `cat` isn't in `CATS` (`knownCat`), so Today,
  Plan, Tomorrow, Needs a decision, the overdue roll-over and the app badge leave them alone. XP, trophies and the
  clear-day check still count every task.
- **`BUILD`** (set as `window.DAYBOOK_BUILD` in `<head>`, now `'p18'` on `city-clean`; `city.js` and the `city.js?v=` query must match) is shown as "BUILD p0" in the city's system card, so each device can
  show which copy it runs. Bump it when a release changes the data's shape.

## Code map (index.html)

Line numbers drift, so search for the section comment instead.

| Section comment | What's there |
|---|---|
| `<style>` | The boot screen (`.cb`), the island toasts, `#noCity`, confetti. Everything else is styled inside city.js's shadow root. |
| `/* ---------- state` | Defaults, `load()`, `save()`, `commit()` (save, then `render()`). |
| `/* ---------- cross-device sync` | `stampChanges`, `KNOWN`, `mergeState`, `syncNow`. |
| `/* ---------- notifications` | Push subscribe/unsubscribe, sync code mirrored to IndexedDB for the service worker. |
| `/* ---------- sound` | `sfx(name)`: quiet cues synthesised with Web Audio (no audio files). Off by default; the switch is in the system card and is stored per device in `localStorage.daybook_sound`, never synced. Add a cue to `SFX`, then call `sfx()` next to the matching `haptic()`. |
| `/* ---------- training program and logs` | `program.json`, the split, set ticks and benchmark logs (per device). |
| `/* ---------- school` | School's data and every edit to it (`SCHOOL`). |
| `/* ---------- pay periods` | `periodFor`, `periodHours`, `extraHours`, submit-to-Len window. |
| `/* ---------- quick-add parser` | Quick add text → task, school work, shift, job, workout (`parseQuick`, `applyQuick`). |
| `/* ---------- dynamic island` | Toasts, Undo, the live clock and rest pill. |
| `/* ---------- fuel` | Recipe book loading, meal picks, the shopping list (`amtSum()` adds amounts across the picked recipes), shakes. |
| `/* ---------- the game layer` | XP, levels, trophies. |
| `/* ---------- attributes` | The city's five stats (`attributes()`). |
| `/* ---------- render` | `render()`: after any change, tells the city (`City.update()`), refreshes the island and the app badge. |
| `/* ---------- actions` | `toggleTask`, `toggleSet`, clocking, and one click handler for the `data-act` names the city and the island still use (`CityApp.act(name)` runs one). |
| `/* ---------- the city's way in` | `window.CityApp`: how `city.js` reads and acts on the app (docs/CITY.md), and `fallback()`, the CITY OFFLINE screen. |
| `/* ---------- boot` | The boot screen, `migrateProgram`, first render, program load, sync, service worker. |

## Conventions

- Commit as Jackson: `git -c user.name="Jackson Hamm" -c user.email="jackson.hamm@icloud.com" commit`.
- Patch scripts: **never** `str.replace(a, b)` with code in `b`. `$$` and `` $` `` get eaten. Use `s.replace(a, () => b)` or split/join.
- After an edit, syntax-check the main script (`node --check` on it copied out to a `.js` file) and `city.js` (copied to a `.mjs`).
- Keep `docs/` current when behaviour changes.

## Testing locally

- **Server:** from the repo root, `npx http-server . -p 8765 -c-1`. The app is at `http://localhost:8765/index.html`.
  A `.claude/launch.json` for the preview pane is fine (`.claude/` is gitignored).
- **Fake data only.** Seed a made-up `daybook_v1` on localhost with a script kept outside the repo: tasks, a shift, a
  training day, shakes, a reminder that has gone by, and a pay period inside its submit window. Never screenshot the
  live site with real data.
- **Headless browsers:** Chrome or Edge with `--headless=new --mute-audio` and a throwaway `--user-data-dir`.
- **Seeded runs:** for frozen-frame comparisons, use a scratch copy of the repo outside it, with a tiny script that
  seeds `Math.random` and stubs `Date` before anything else runs. Never add test files to the repo.
- **Notched-iPhone inset:** desktop emulation reports a 0px safe-area inset. In the scratch copy, replace
  `env(safe-area-inset-top)` with `var(--sat, 0px)` and set `--sat: 47px` to check the header and anything placed
  below it.
- **Sync tests:**
  - Never run `wrangler dev` on the repo root (it reloads forever), and never use `--remote`.
  - Copy the repo to a scratch folder with the assets in `./public`, and give that copy's `.dev.vars` a throwaway
    test sync code, hashed the way `src/worker.js` expects.
  - Two "devices" are two origins with separate storage, e.g. `localhost:8787` and `127.0.0.1:8787`.
- **Stepping frames:** the preview pane throttles animation when hidden, so step by hand: `City._.frame(t)` with `?cityrig`.
- **Blank screenshots:** one taken right after a programmatic scroll can come out blank. Take a second one.
- **Touch look in rooms** (Phase 1): synthetic `TouchEvent`s fire no pointer events and never scroll, so use real
  touch input: CDP `Input.dispatchTouchEvent` with touch emulation on (moves of about 120px, sideways and up-down).
- **Reduced motion:** use emulation, or stub `matchMedia` before load in the scratch copy.
- Screenshots and scratch files stay outside the repo.

## Performance

- **Quality levels** (per device, `localStorage.daybook_perf`, Settings > Performance):
  - Smooth: 60fps.
  - Balanced: 30fps, 1.5x pixels.
  - Saver: 20fps, 1x pixels, no backdrop blur, grain or moving beams.
  - Auto starts on Balanced (Saver on a machine with 4 cores or less, or 4GB or less). It drops to Saver if it measures under
    70% of the target frame rate, e.g. under Opera's CPU limiter.
  - `html[data-perf]` carries the level for CSS.
- **`perf.js`** holds all of this. Import it as `./perf.js` (no `?v=`) so there's
  only ever one copy.
  - Importing it sets `html[data-perf]` and `window.Perf = { get, set, watch }`. Exports: `PERF` (fps and DPR per level),
    `weak`, `tier()` (the level in force), `perf(pick)` (reads `{ pick, level }`, or picks and saves one), `onPerf(fn)`
    (called on every level change, returns an off switch) and `watchPerf(now, cap)`.
  - The system card's Performance row reads and sets it through `window.Perf` (`perfNow`, `set-perf`), falling back to
    `localStorage.daybook_perf` before it has loaded.
  - **Auto is cap-aware.** Whatever draws calls `watchPerf(now, cap)` after each frame with the fps it's capped to right
    now. It measures only while `cap` is the tier's full fps; idle at half rate, drawing on demand, standing still, under a
    sheet, paused, hidden and reduced motion all reset it, and a change of cap starts the 4s window over. Otherwise a quiet
    half-fps scene would drop every device to Saver.
- **No big main-thread blocks:** a room's shaders are warmed up before it's shown (ANGLE compiles shaders at draw time on
  Windows, which used to block the page for seconds).
- **Resilience:** a frame that throws is skipped and logged, and the loop keeps going. A WebGL context loss pauses the loop and
  resumes it when the context comes back.
- **Problem log:** `window.logProblem(where, err)` keeps the last 40 errors in `localStorage.daybook_log`. The system
  card's COPY PROBLEM LOG (or CITY OFFLINE's) copies them with the browser, level, DPR and window size.
