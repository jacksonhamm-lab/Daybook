# Daybook City

The plan for a new home: an island city at night, seen from above, with one district per place. Tap a district's
icon and the camera flies in; you stand inside that place's room, first-person, with the page over it. It's built
behind a per-device flag, and the Dex home stays the default until the switch-over (Phase 6).

- **Where things stand, test results and the next step are in [Handoff](#handoff)** at the bottom. Update it before
  stopping for any reason.
- The repo is public, so this file holds technical state only. Personal details (schedule, courses, dates) stay out.
- The full build prompt is kept outside the repo; section numbers such as §13.5 refer to it.

## The design in brief

- **Home (city mode):** a calm island city seen from above, like a model on a table: the four eras of buildings, a
  megatower, a megablock, an elevated highway and rail, palms, dense signs. Six small icons float over six districts,
  each a symbol in the district's colour with one word. At most an icon gets a tiny dot, and only for something due or
  waiting on a decision. The city shows no levels, numbers or bars.
- **Going in:** tap an icon or its district. The camera flies in and you're standing inside, first-person, in about
  0.7 s, as today. The page sits low over the room like a sheet.
- **In a room:** you stand at one spot (the counter or desk) and every hotspot is in view. One tap either does the
  thing (with Undo where it changes data) or opens that part of the page (a section or a sheet), never one big page.
  A list button shows every hotspot as a plain list.
- **Looking around:** on the laptop, a small mouse drag looks around the room. On the phone, a sideways drag on the
  room band does the same, and up-and-down drags still scroll the page. A drag never opens anything. No walking or
  stepping in Phase 1.
- **Leaving:** ‹, Esc, browser back, or a drag down from the top of the page takes you back out to the city. To see
  more of the room, scroll the page back to the top.
- **Levels, XP and trophies stay.** The level badge in the top bar opens Progress. In city mode Progress also holds
  the six stats.
- **Phase 1 is all of that as a greybox:** block geometry in the right places, the real cameras, flights, layouts and
  hotspots, under the real pages. The art comes in Phases 3–5.

**Places.** The data comes from `attributes()`, unchanged; its `k`, `c`, `icon` and `go` drive the icons.

| Icon | `k`, colour | District | Opens (`go`) | Room | Phase 1 hotspots |
|---|---|---|---|---|---|
| Plan | `focus` `#64d2ff` | A stacked megablock: balconies, one warm top-floor window, a rooftop | `week:` | `apartment` | Fridge note, Calendar, Notebook, Phone |
| Work | `grind` `#0a84ff` | Downtown black-glass towers around the megatower, with a wood-and-brass clothing shop at street level | `hours:shifts` | `shop` | Register, Ledger, Notepad |
| Train | `strength` `#ff9f0a` | A pale-concrete warehouse gym: roll-up door, orange neon | `training:` | `gym` | Rack, Stopwatch, Whiteboard, Split chart |
| Cardio | `stamina` `#ff375f` | A ski village on the mountain: chalets, a rounded lift station, gondola line, pines, snow | `training:cardio` | `ski` | Lift board, Ticket window |
| Fuel | `fuel` `#ffd60a` | A night-market food-stall alley: lanterns, steam, stacked sign blades | `training:fuel` | `stall` | Blender, Gainer tub, Menu board, Paper bag, Counter |
| Jobs (School from Phase 2) | `hustle` `#30d158` | A stone castle on a forested point over the water | `jobs:` | `castle` | Desk (applications). School hotspots are declared for Phase 2. |

**Composition:** the mountain runs across the back, the water along the front and right, and the skyline stands in
rows across the water. The rail loops the island and the megatower is the tallest point. **Text in 3D:** none in
Phase 1 (sign and ad frames are blank). From Phase 3, signs carry generic words only. Never logos, crests, real
brands, game names or the real shop's name. The 3D neon may run warmer than the icon colour so the city stays cozy;
the icons keep their exact colours.

**Ground rules that shape every phase:**
- **A place, not a UI.** The neon lives in the world. Pages, sheets and the top bar keep their current card style.
  Banned from any new UI, the icons and the hotspots: scanlines, glitch text, hex grids, reticles, leader lines,
  monospace or cyan-on-black readouts, clipped or angled panels, holographic rings. Text always sits on a card or a
  solid pill.
- **Real 3D, built in code:** geometry, materials and light. No paintings, image layers, depth maps, panoramas or
  flat picture planes. Nothing generated, no credits. The style is flat cel shading: bold colour blocks, neon rim
  light, violet and teal shadows (never grey), ink outlines, banded skies and a big moon.
- **Original shapes and neutral names** in code, ids, comments and data: `megatower`, `megablock`, `highway`, `rail`,
  `skyline`, `palms`, `ads`, `signs`, `holo`, `lanes`, and the era ids `concrete`, `kitsch`, `corp`, `luxe`, `stone`.
- **One menu.** In city mode the six icons are the menu and replace the chips. No bottom nav, tab strips, in-page
  pills, zoom, pinch, swipes or free roaming.
- **Clutter is part of the look:** dense, lived-in set dressing built in code, always a step quieter than the
  hotspots and inside the budgets.
- **Performance:** one WebGL context; compile every shader before showing anything; pause when hidden; never add,
  remove or hide a light at runtime (it rebuilds every shader).

## Phases

- **Phase 0, groundwork** (done on `city-p1`, see Handoff): the home render split, one back target (`placeKey()`,
  `homeTarget(k)` and the `GROW.chip` fix), `perf.js`, the sync safety fix (Worker guard, `KNOWN`, unknown task
  categories, `BUILD`), dead quests code out, and these docs. Nothing visible changes except "Build p0" in
  Settings › Sync.
- **Phase 1, the greybox city and rooms** (next): the flag and loader, a greybox island with six districts, floating
  icons, fly-ins, and six first-person greybox rooms under the existing pages, each with working hotspots and clutter
  slots.
- **Phase 2, School** (1–2 sessions, its own prompt). Precondition: steps 1 and 2 of the
  [School order](#school-order-and-data-shapes). Built like Work: where Work tracks pay period, hours and pay, School
  tracks **the week, study hours and what's due**.
  - **Prefill nothing:** courses, dates, course lengths and residencies come from his schedule or from him, never
    from the repo.
  - **Setup on first open:** stream, track (optional), weekly goal (default 15 h, a guess, editable), course-site
    link. Stored in `S.school`.
  - **Headline:** this week's study hours against the goal, plus a countdown to the next item due. Arrows step through
    the weeks, with seven day rows.
  - **Study clock:** the same disc as Work, with its own `studyClock`, so it never clashes with a shift. You pick a
    course when you start. Sessions are editable.
  - **School tasks only:**
    - Fields: title, course, type (Reading, Discussion post, Discussion reply, Paper, Team task, Presentation,
      Residency prep, Admin), due date (required), and an optional note or link.
    - Grouped as Overdue, This week, Later, and Done (collapsed).
    - Quick add understands a course code, a type and a day ("<code> post thu"), and `#school` quick adds go to the
      School page.
    - **Keep them out of everything else:** filter `cat === 'school'` explicitly in `tasksOn`, `overdue`/rollover,
      `slipped` (decisions card, apartment dot, app badge), Tomorrow, `noteClearDay`, Focus counts, the compose
      sheet's `CAT_ORDER` chips, and the Worker's morning brief and push badge. XP counting stays on its own path.
  - **Cards:** the current course (which week of the course, hours so far, the course-site link); up next; residency
    (a countdown and a travel checklist, blended stream only, hidden on campus); the course list (from his schedule,
    empty until then).
  - **Reminders:** papers 3 days before and that morning; discussion posts that morning; a Sunday-evening review;
    residency 30 and 7 days out; a new course the day before. **This needs new Worker logic** in the reminder cron
    (relative-day rules, a weekly rule, and reading `courses` and `school`); list it and test it on the scratch
    Worker.
  - **Elsewhere:** Hustle becomes School (study hours). Jobs becomes a collapsed "Career (paused)" module on Plan,
    reached from the apartment's filing box. The castle hotspots go live: desk for tasks, hourglass for the study
    clock, noticeboard for course and residency, bookshelf for the course list. The School page exists on both homes.
  - **Not in v1:** grades, course-site sync, citations, calendar import.
  - **Data:** see [School order and data shapes](#school-order-and-data-shapes).
- **Phase 3, look-dev** (4–6 sessions): the room kit, with the shop and its downtown block finished first.
  - **Kit:** `cel()`, a MeshToonMaterial with `vertexColors` and FrontSide, its ramp patched for coloured shadows plus
    a stepped fresnel rim in the room's neon (one program for every solid); virtual light pools in vertex colours;
    merged inverted-hull ink on props and H-tagged clutter only (averaged normals on a welded copy, never on the
    shell; the shell gets dark trim strips; M and S clutter and anything two-sided or planar gets ink bands);
    additive glow quads on a 256² atlas and the shared atlas shader; a CanvasTexture signage atlas with generic words
    only and no logos; one `Points` system each for dust, steam or snow; rain as streaks; banded skies; a fixed light
    rig (one hemisphere, one directional, at most two point lights, counts never changed), warmed at mount.
  - **Review:** he approves from screenshots at 390×844 and 1280×800 under the real UI. Expect 2–3 rounds.
  - **Clutter:** kit v1 (about 16 builders plus `stack`, `row` and `spill`), the seeded scatter and keep-out checks,
    the `clutterA`/`clutterB` merge, paper cells, the ink rule, the tier draw ranges and the perf-card line. The shop
    gets clutter at a luxe level (a neat sales floor with busy alterations and stock-in corners) and denser street
    clutter through its door, under the highway. Each review shows clutter off and on, plus a greyscale check.
  - **CC0 models (optional):** only to replace a code-built composite that fails the shop review; his yes per
    download, at most 6 named items; gltf-transform plus the meshopt decoder only. The Worker's model route accepts
    `^[a-z]+\.glb`, so name the file `roomkit.glb` or widen the regex. Served from KV, never committed.
  - **Settings:** a "Still rooms" option in Settings › Performance.
- **Phase 4, five rooms** (6–11 sessions): apartment, gym, ski village, stall and castle study hall, each to the
  shop's recipe, including a dense clutter pass with about 5 new kit builders per room. He approves each from a
  clutter-off and clutter-on pair.
- **Phase 5, city art** (3–6 sessions):
  - the full city look: signs, ad screens, the hologram, the train, highway and air traffic, street clutter, haze,
    weather (light rain downtown only, snow on the mountain), neon and ink on the city
  - sunset and day versions following slope time (moved to Settings); the day is sunny and sun-bleached
  - a fast first paint from the existing CSS sky plus the icons (no screenshot or poster image)
  - **data reactions** (hung on `City.update`): an OPEN sign while clocked in, tower floors filling with pay-period
    hours, gondola lights for cardio, a lantern per shake, a roof beacon for decisions, fireworks on level-up
  - windows, trim, halos, drift and weather stay ambient
- **Phase 6, switch-over** (1 session):
  - After a week of use and his yes, the city becomes home, and `?home=dex` brings the old one back.
  - About 2 weeks later, delete the Dex code and remove only the Dex entries from sw.js's models cache. Keep the
    cache-first exception for the room kit.
  - The KV models stay; deleting them is his call.
- **Totals:** about 18–30 sessions over 3–5 months, 0 credits.

## The flag (Phase 1, not built yet)

- **Storage:** `localStorage.daybook_home = 'city'`, or absent. It's per device, never synced, and has no Settings UI.
  Absent means the Dex home runs exactly as today.
- **URL:** `?city=1` or `?city=0`, and `?perf=1` (the perf card). Strip them with `history.replaceState`, keeping
  `history.state`.
- **Quick add (Spotlight only, not the per-day `.qadd` forms):** input that is exactly `city on`, `city off` or
  `city perf` after trimming, in any case (iOS capitalises). Intercept it before `parseQuick`.
  - `spotPreview` shows "Turn city on", "Turn city off" or "Show/hide perf card". Enter applies it, with no task and
    no XP.
  - `city on` / `city off` save the flag and reload. The Home Screen app has its own storage and no URL bar, so this is
    how it gets flipped there.
  - `city perf` toggles `localStorage.daybook_cityperf` and shows or hides the card live.
- **Loader:** replace `<script type="module" src="rider.js">` with:
  - a tiny inline classic script in `<head>` that reads the flag, handles the URL params, sets `window.DAYBOOK_CITY`
    and `window.DAYBOOK_BUILD` (Phase 1 bumps it to `'p1'`; the main script's `BUILD` reads it), and injects one
    `<link rel="modulepreload">` for the chosen entry only, so rider.js still starts fetching during parsing as it
    does today
  - an inline module that runs
    `import(window.DAYBOOK_CITY ? './city.js?v=' + BUILD : './rider.js?v=' + BUILD)`, **never both** (the preload URL
    must match exactly)
  - Each module self-mounts the way rider.js does today. index.html keeps `let CITY = !!window.DAYBOOK_CITY`, and
    every `City` call is guarded with `window.City &&`.
- **Same build:** sw.js is network-first per request, so a flaky network can mix builds. city.js reads `v` from
  `import.meta.url` and fetches `city/layout.json?v=…` and `city/rooms.json?v=…`; it exports `BUILD`, and a mismatch
  with `window.DAYBOOK_BUILD` is treated as an import failure (below).
- **Requests:**
  - **Flag off:** no request for `city.js` or `city/*.json`.
  - **Flag on:** no request for rider.js, motion.js, gear.js, dress.js, buddy.js, three-vrm, GLTFLoader, `models/*`,
    `anims.json` or `scenes/*`. city.js imports only `three` (import map),
    `./vendor/jsm/utils/BufferGeometryUtils.js` and `./perf.js`.
- **If city.js fails to import, `city/layout.json` fails to load, or the build doesn't match:** call
  `logProblem('city', e)`, set `CITY = false` for the session, re-render (the Dex home), then import rider.js.
- **City mode writes only** `daybook_home` and `daybook_cityperf`, both per device. Phases 0 and 1 add no synced key
  and no task field.

## Back paths

What each way back does. City mode is shown; with the flag off it's the same without the camera or rooms.

| Path | Code | Expected |
|---|---|---|
| ‹ button | `data-act="home"` → `goHome` → `history.back()` → popstate → `goHome(true)` | Veil fills, room disposed, city home; the camera flies out of that district while the veil shrinks into its icon; the icon pops and takes focus |
| Escape | `goHome`, after closing Spotlight or a sheet as today | Same |
| Browser back | popstate → `goHome(true)` | Same |
| Drag down from the top of the page (touch, scrollY ≤ 2) | drag block → `goHome` | Same. A touch on the room band never goes home. |
| Key 1, or the island tap while clocked in | `switchTab('today')` | Instant: no veil, no pop; room disposed; city at overview, running, icons placed |
| Keys 2–5, `data-tab` buttons | `switchTab(page)` | Page jump; the room swaps to `placeKey()`'s room without a flight; a later back flies out of that district and shrinks into its icon |
| Home pills | `data-act="attr"` → `openPage` | Same as tapping that icon |

There are no deep links: `goAttr` is only called from `openPage` and the hotspots.

## Budgets

Shown on the perf card.

| Tier | City fps, use / idle | Room fps, looking / under page | Pixel ratio | Room: draws, triangles, textures |
|---|---|---|---|---|
| Balanced | 30 / 15 | 30 / on change | 1.5 | ≤25, ≤80k, ≤16 MB |
| Saver (Opera, limiter) | 20 / 10 | 20 / still | 1 | ≤18, ≤50k, ≤8 MB |
| Smooth (opt-in) | 60 / 30 | as Balanced | city ≤1.75, rooms 1.5 | as Balanced |

- **City:** ≤40 draw calls and ≤100k triangles (Saver ≤30 and ≤60k).
- **Phase 1 greybox, every tier:**
  - city: ≤24 draw calls, ≤30k triangles, ≤10 MB of textures (about 13 draws: 6 districts, ground, water,
    mountain, skyline, windows, neon, glow)
  - each room: ≤15 draw calls, ≤20k triangles, ≤4 MB, clutter slots included (about 150 tris, 0 draws)
- **Rooms with clutter (Phase 3 on):** about 11 draws, ~68k triangles and ~1.8 MB in Balanced; about 11 draws and
  ~49k in Saver. Clutter's own share is +2 draws (`clutterA`, `clutterB`), ≤21k triangles plus its H pieces' ink,
  0 MB of textures. If a room runs over, thin `clutterB`'s farthest groups first, then `clutterA`'s far mid pieces;
  never the hotspot objects.
- **Definitions:**
  - **Idle** means 20 s with no input on the city.
  - **On change** means a room renders only when something changes (look, enter, resize, the uncovered rect
    growing). From Phase 3, a room with life (rain, steam) runs at the full cap while visible, never a visible 10 fps.
  - **Still** (Saver) means a room renders only on enter, look, resize and the uncovered rect growing.
  - **0 fps** when the app is hidden, when the sheet covers the whole band, and while a sheet, the overlay or
    Spotlight is open.
- **Budgets are per tier, not per device.** Auto may pick Saver on a phone (`weak` reads `hardwareConcurrency`), so
  read the real tier from the card.
- **Whenever the frame cap changes, call `watchPerf(now, cap)`** so Auto never measures throttled frames (see
  ARCHITECTURE.md, Performance).
- **`renderer.info.programs.length` must not rise after the reveal,** across fly-ins and every room (a context restore
  excepted).
- **Production settings:** `renderer.debug.checkShaderErrors = false` (on locally). At most one texture upload per
  frame.
- **Perf card** (`?perf=1` or `city perf`): a small solid light card in Inter, not HUD-styled, with no blur. It shows:
  - tier (pick and level), scene (city or room id), cap in force
  - fps, and the longest frame in the last 5 s
  - draw calls, triangles, programs, geometries, DPR
  - clutter: slots or pieces and triangles per layer (A, B, paper), the ink triangles, the clutter build time, and how
    many the keep-out checks dropped
  - textures: count and estimated MB (sum of `w × h × 4 × (mipmaps ? 1.33 : 1)` over city-owned textures;
    `renderer.info` only counts them)

## School order and data shapes

**School is Phase 2, its own prompt.** Phase 1 writes no School data and no new synced key.

**Why it isn't in Phase 1:**
1. **An older copy of the app can wipe new keys.** Pre-p0 `mergeState` drops top-level keys it doesn't know, then
   PUTs. Phase 0's Worker guard stops that on the server for every copy, old or new.
2. **Pre-p0 code crashes on unknown categories.** It reads `CATS[t.cat].color` unguarded. After the guard this costs
   no data: a stale copy just errors until it's reopened, which loads new code.
3. **School ships separately.** It goes to the current home too, independent of the city flag.
4. **Context budget.**

**The order:**
1. **Phase 0** ships at Gate A: the Worker guard, the client carry-through, unknown categories tolerated, and
   `BUILD = 'p0'`. He taps Export backup first.
2. **The Gate A device check:** every browser and app where the sync code has been typed shows "Build p0" in
   Settings › Sync (or is closed). Record yes/no and the date in Handoff.
3. **Phase 1:** no new data.
4. **Phase 2, School** (precondition: steps 1 and 2 done; he taps Export backup again before it ships):
   - School tasks are `S.tasks` with `cat:'school'`, `course`, `type`, and **always a `date`** (the due date), so
     `load()`/`mergeState` never re-date them.
   - New keys, fixed shapes so the per-item stamps work (an array can't carry `.u` through JSON):
     - `study{date}: { s: [{ start, end, course }], u }`, like `shifts`; added to the per-date loops in
       `stampChanges` and `mergeState`, so `study:<date>` tombstones work
     - `courses[]`, each with an `id`; added to the id-list loops with `tasks`, `jobs`, `notes`
     - `studyClock` + `studyClockU`, like `clock` + `clockU`
     - `school` + `schoolU` (`{ goal, stream, track, link }`), like `settings` + `settingsU`
   - All four join `KNOWN`, and `BUILD` bumps. The "never change `stampChanges`" rule ends here; extend it exactly as
     above.
   - Two-device test: clear a study day, re-add a session, and both devices converge.

**Target:** School is live well before his program starts (the dates are kept outside the repo), so he can set up
courses. It may run before Phase 1 is finished if he asks, but never before step 2.

## Handoff

Technical state only. Updated 2026-10-30.

- **Branch:** `city-p1`, made from `main` at `a92ca26`. Local only, never pushed. The head is this Handoff commit, on
  top of `e69ba08`; `git log --oneline main..city-p1` lists seven commits.
- **Part A (Phase 0): done.** Every seam is committed and tested:
  - P0.1 `67b2956` home render split (`renderStage()`, `renderToday(part)`, `todayShared()`): done
  - P0.2 `d354856` `GROW.chip = { k, tab }` on every `openPage` path, `placeKey()`, `homeTarget(k)` (BUGS.md #7):
    done
  - P0.3 `9452647` `perf.js`, cap-aware `watchPerf`, `window.Perf`: done
  - P0.4 `ee4a6ca` Worker guard in the `syncApi` PUT, `KNOWN` carry-through in `mergeState`, `catOf`/`knownCat`,
    `BUILD = 'p0'`: done
  - P0.5 `876b78b` dead quests code out: done
  - P0.6 `e69ba08` docs: this file, ARCHITECTURE.md fixes, `docs` in `.assetsignore`, stale Access comments in
    `wrangler.jsonc`: done
- **Gate 0:** decisions 1, 2 and 4 answered with the defaults. Decision 3 answered, see memory. Drag-to-look on the
  phone requested for Part B (§8.9): a sideways drag on the room band looks around, yaw only, and vertical drags still
  scroll the page.
- **Tests (§13.2), all pass.** Flag off, headless Chrome, fake data, scripts kept outside the repo.
  - **Same home:** the innerHTML of the home, every page with each module open and closed, every sheet and Spotlight
    (41 captures) matches `main` at 390×844 and 1366×768. The only difference is the Build line in Settings › Sync.
    A `main`-against-`main` control gives 41/41.
  - **Frozen Dex frames:** byte-identical at 390×844. At 1366×768, under 25 px differ by 1/255, within `main`'s own
    run-to-run noise.
  - **Back paths:** 64/64 at both sizes, with real touch drags at 390×844, animated and reduced motion.
    - ‹, Escape, browser back and the drag down each shrink into the right chip; Escape closes a sheet or Spotlight
      first.
    - Key 1 and the island tap go home with no veil.
    - Fuel, then keys 2/3/4/5, then ‹ shrinks into focus/grind/fuel/hustle; `data-tab` buttons and the home pills
      shrink into their chips.
    - Reduced motion stores `{ k: 'fuel', tab: 'training' }` and clears it on the way home.
    - `main` scores 20/64 on the same suite (Fuel, key 2, ‹ shrinks into Fuel).
  - **Perf:**
    - Every tier from Settings (at DPR 3 and 1), every stored pick at boot and a weak device give the same
      `data-perf`, Dex pixel ratio and canvas as `main`.
    - `Perf.watch`: 10 fps on full cap steps down to Saver at 4 s with `main`'s log line. Half cap, cap 0, a gap over
      500 ms, hidden and reduced motion never count. A cap change restarts the 4 s window, and a picked tier never
      steps down.
    - End to end, a blocked main thread steps Auto down on both builds. `perf.js` loads once, with no `?v=` copy.
  - **Sync, §13.2 checks 1–9,** on scratch `wrangler dev --local` Workers:
    - 300 generated known-key pairs merge byte-identically to `main`'s `mergeState`.
    - Unknown key `zz`: taken from the server, the server's copy wins when both have it, a local-only copy is kept.
      `ui` is never sent.
    - The Worker guard keeps `zz` on a PUT without it, replaces it when sent and stores `null`. The 409, 400 and 401
      responses are unchanged.
    - Two devices on the new client and Worker, with `zz` and four `cat:'school'` tasks, converge with both
      untouched, and no school task shows anywhere.
    - Controls: `main`'s client and Worker drop `zz`; `main`'s client against the new Worker keeps it.
  - **Unknown categories in the app:** six `cat:'school'` tasks never show on home or any page and never crash. XP
    still counts them, and `noteClearDay` won't clear a day while one is open.
  - The syntax check and `node --check` pass. The console and problem log stay clean throughout.
- **Open:**
  - `origin/main` has one commit that isn't on `city-p1` (`8edd767`, task XP 10 → 30, one line in index.html). A test
    merge is clean. Merge it into `city-p1` before the Gate A push and re-run the HTML diff against `origin/main`.
  - A scratch worktree has `main` checked out, so `git checkout main` in the repo is refused until it's removed.
  - Don't push `city-p1` itself until Cloudflare branch builds are confirmed off (§15). Gate A pushes `main` only.
  - Key 1 and the island tap go home through `switchTab`, which doesn't clear `GROW.chip`, so Fuel, key 1, key 4, ‹
    still shrinks into Fuel (same as `main`). Phase 1's keys 2–5 room swap would show the wrong room after that trip.
  - With the flag off, focus lands on `<body>` after going home (same as `main`). The icon taking focus is Part B.
  - `noteCard` still reads `CATS[n.cat]` directly (already guarded; an unknown category renders as uncategorised).
  - The app badge from `slipped()` leaves out unknown-category reminders; the Worker's push badge still counts them.
    Phase 2 filters both.
  - `seen`, `clearDays` and `submitted` are known keys `mergeState` never merged, so a device without one PUTs on
    each sync (a rev bump, no data loss).
  - `src/worker.js` comments still mention Cloudflare Access and the old `.vrm` upload command. Left alone because
    Phase 0 changes worker.js only for the guard.
  - Dead `#v-today .grid` and `#v-today .slip-card` rules remain in the first 760 px media query.
- **Backup:** `city-p1-2026-10-30.bundle`, made after this commit and kept outside the repo (decision 4).
- **Gate A:** not asked yet. **Gate A device check: not yet confirmed.**
- **Next step:**
  1. Merge `origin/main` into `city-p1` and re-run the HTML diff.
  2. Gate A: he taps Settings › Export backup on the iPhone first. Push only on his go: merge `city-p1` into `main`
     and push `main`. Confirm it's live (the `Build p0` marker, and the commit's check-runs for the Worker guard).
  3. The §13.5 device check: every copy with the sync code shows "Build p0" and a clean sync, or is closed. Record
     yes/no and the date here.
  4. Then Part B: the flag and loader, the greybox city, icons and flight, then the shop room (Gate B).
