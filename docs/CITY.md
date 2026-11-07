# Daybook City

The plan for a new home: an island city at night, seen from above, with one district per place. Tap a district's
icon and the camera flies in; you stand inside that place's room, first-person, with the page over it. It's built
behind a per-device flag, and the Dex home stays the default until the switch-over (Phase 6).

- **Where things stand, test results and the next step are in [Handoff](#handoff)** at the bottom. Update it before
  stopping for any reason.
- The repo is public, so this file holds technical state only. Personal details (schedule, courses, dates) stay out.
- The full build prompt is kept outside the repo; section numbers such as §13.5 refer to it.
- **The approved look test is the source of the look.** It's kept outside the repo. He approved how it looks and runs
  on his iPhone, so `city.js` starts from it and the greybox phase is skipped. Where older text below disagrees with
  what's built, the build and this note win.

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
- **Phase 1 is the look test in the app:** the real city, the shop with real Work data, and the other five districts
  opening their existing pages. Their rooms come in Phase 4.

**Places.** The data comes from `attributes()`, unchanged; its `k`, `c`, `icon` and `go` drive the icons.

| Icon | `k`, colour | District | Opens (`go`) | Room | Phase 1 hotspots |
|---|---|---|---|---|---|
| Plan | `focus` `#64d2ff` | A stacked megablock: balconies, one warm top-floor window, a rooftop | `week:` | `apartment` | Today pane, Week grid, Notebook, Decide screen, Career drawers |
| Work | `grind` `#0a84ff` | Downtown black-glass towers around the megatower, with a wood-and-brass clothing shop at street level | `hours:shifts` | `shop` | Register, Ledger, Notepad |
| Train | `strength` `#ff9f0a` | A pale-concrete warehouse gym: roll-up door, orange neon | `training:` | `gym` | Rack, Stopwatch, Whiteboard, Split chart |
| Fuel (Cardio merged in, p13) | `fuel` `#ffd60a` | A ski village on the mountain: chalets, a rounded lift station, gondola line, pines, snow | `training:fuel` | `chalet` | Fridge (shopping list), Cookbook (this week's meals), Blender (shakes), Lift ticket (log cardio) |
| (none from p13) | | A night-market food-stall alley: lanterns, steam, stacked sign blades | | | Scenery; free for a later room. |
| Jobs (School from Phase 2) | `hustle` `#30d158` | A stone castle on a forested point over the water | `jobs:` | `castle` | Desk (applications). School hotspots are declared for Phase 2. |

**Composition:** the mountain runs across the back, the water along the front and right, and the skyline stands in
rows across the water. The rail loops the island and the megatower is the tallest point. **Text in 3D:** signs and
ads carry made-up words only.

**His calls, 2026-11-06:** Cardio alone was too thin for a room (logging takes two seconds), so the ski village holds
Cardio and all of Fuel in one chalet: you stand in its kitchen, nobody there. Cardio and Fuel become one icon (five icons,
one per room); the Stamina and Fuel stats both still count. Place names say what's inside, as place · job: HOME · TASKS,
SHOP · SHIFTS, GYM · LIFTS, CHALET · FOOD, CASTLE · JOBS (the big words Plan, Work, Train, Fuel, Jobs stay). Never logos, crests, real brands, game names or the real shop's name. The 3D neon may run warmer than the icon colour so the city stays cozy;
the icons keep their exact colours.

**Ground rules that shape every phase:**
- **The red HUD is wanted.** He lifted the earlier ban: the city and the rooms carry the tasteful red HUD from the
  look test (angled panels, thin rules, small monospace tags, floating labels). It lives in a shadow root inside
  `city.js`, so its styles and the app's never touch. Pages, app sheets and the toasts keep their current card style
  for now. Everything in the HUD that looks like his data is his data; moving bars and the side ladder are decoration
  and carry no claims.
- **Real 3D, built in code:** geometry, materials and light. No paintings, image layers, depth maps, panoramas or
  flat picture planes. Nothing generated, no credits. The style is flat cel shading: bold colour blocks, neon rim
  light, violet and teal shadows (never grey), ink outlines, banded skies and a big moon. One exception: the
  apartment's figure is his own model file, served from KV like Dex's and never committed (see the handoff).
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
- **Phase 1, the city and the shop in the app** (built on `city-p1`, see Handoff): the flag and loader, the look-test
  city as home, the flight, the shop with real clock, shifts and pay, and the other five icons opening their existing
  pages. The greybox is skipped. Sound is not part of this; a new sound set is its own later phase (Phase S), and the
  existing `sfx()` cues stay.
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

## The flag

- **Storage:** `localStorage.daybook_home = 'city'`, or absent. It's per device, never synced, and has no Settings UI.
  Absent means the Dex home runs exactly as before.
- **URL:** `?city=1` turns it on, `?city=0` off. The parameter is stripped with `history.replaceState`, keeping
  `history.state`.
- **Quick add (p12):** `city on` and `city off` set or clear the flag on this device and reload. This is the way to flip
  it in the Home Screen app, which has its own storage and no URL bar. Not built: `city perf` and `?perf=1`; the HUD's
  GFX button is the perf readout.
- **Loader:** a tiny classic script in `<head>` reads the flag, handles the URL, sets `window.DAYBOOK_CITY` and
  `window.DAYBOOK_BUILD` (the main script's `BUILD` reads it), and injects one `<link rel="modulepreload">` for the
  chosen entry only. An inline module then imports `./city.js?v=<build>` or `./rider.js`, **never both**. Only with the
  flag on, it also adds a small style that hides the app's top bar, FAB and empty main on the home.
- **Same build:** `city.js` exports `BUILD`. If it doesn't match `window.DAYBOOK_BUILD`, it throws, and that counts as
  an import failure. Bump the value in three places together: the head script (twice) and `city.js`.
- **Requests:**
  - **Flag off:** no request for `city.js`.
  - **Flag on:** no request for rider.js, motion.js, gear.js, dress.js, buddy.js, three-vrm, GLTFLoader, `models/*`,
    `anims.json` or `scenes/*`. `city.js` imports only `three` (import map, vendored r169, the same version as the look
    test) and `./perf.js`. It adds no external script or font. The app's existing Inter and Unbounded stylesheet still
    loads, because the existing pages use it.
- **If `city.js` fails to import, the build doesn't match, or WebGL won't start:** `CityApp.fallback` logs it with
  `logProblem('city', e)`, shows the first, friendly reason as a toast, drops the flag for the session, re-renders the
  Dex home and imports rider.js.
- **City mode writes only** `daybook_home`. No new synced key, no new task field. Clock actions go through the app's own
  state and `save()`, so they sync as they always did.
- **The bridge:** `city.js` has its own `S` and `$`, so it reaches the app through `window.CityApp` (index.html, flag on
  only): `tab`, `covered`, `act(name, dataset)` (runs an existing `data-act` exactly as a tap would), `open(go, el)`,
  `clockIn` (the same state change as `clock-in`, with Undo), `clock`, `home`, `work`, `sfx`, `log`, `fallback`. `home`
  and `work` only call the functions the pages use. The app calls `City.update()` at the end of `render()`, and
  `homeTarget` asks `City.chip(k)` for what a page shrinks back into.
- **Fonts:** system only, no download. The look test's five web fonts are replaced by condensed and heavy system
  fonts (`--hud-font`, `FONT_EN`, `FONT_DISP`, `FONT_JP`, `FONT_MONO`). Bundling the originals is a decision for him.
- **Test rig:** `?cityrig` stops the loop, and `City._` steps frames (`frame`, `city`, `fly`, `room`, `sheet`, `skip`).

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
- **The look test's real numbers replace these for now.** It runs its own adaptive quality (resolution first, then
  bloom and reflections; 60 fps, 30 when idle), kept as approved. At 390×844: city about 600k triangles and 74 draw
  calls, shop about 647k and 61. At 1366×768: city about 604k and 81, shop about 718k and 68. That's over the older
  budgets in this section, which were written before the look test and don't drive it. Settings › Performance doesn't
  change the city's quality yet.
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

Technical state only. Updated 2026-11-06.

- **Live:** `main` at `45ba491` is build `p13`: p7 (the close up on her, the DECIDE monitor, the city opening), p8
  (her natural close-up motion and her card), p9 (her forearms), p10 (the gym, every room usable in place) p11 (split edits, one card at a time), p12 (the small fixes) and p13 (the chalet), behind
  `?city=1`, flag off by default. Live `city.js` byte-identical to the repo (2026-11-07); live `index.html` identical
  apart from the Cloudflare Web Analytics beacon Cloudflare adds at the edge; `/api/sky` answers from `SKY_AT`
  (set as a secret); `her.glb?v=1` (KV, unchanged since p4) serves.
  Pushes go `git push origin <branch>:main`, never the branch itself, until Cloudflare branch builds are confirmed
  off (§15). Workers Builds took about 15 minutes to pick up the p5 push, about one minute for p6 to p10. He checked p9 on his iPhone at `?city=1` (2026-11-04): smooth, no heat, no reloads.
- **Branch:** `city-close`, pushed as build `p13`. `BUILD` is `'p13'` in `city.js`, `index.html` and the
  `city.js?v=` query.
- **Built (p13, the chalet, round 1 for his review, 2026-11-06):** Fuel and Cardio in one room (his call: cardio alone was
  too thin). Fuel now flies into the chalet; Cardio's icon is gone (five icons, the six stats unchanged).
  - **App side:** `CityApp.fuel()` (shakes today and this week, picked meals, recipes, the list by aisle, snacks, cardio
    this week and recent), `recipe(n)`, and actions `shake`, `groc`, `grocClear` (Undo), `snack`, `pick`, `cardio` (Undo
    on its toast; 1 to 600 min), `cardioType`. The book loads in the background on the first read, then re-renders.
  - **Names:** `ICONS[].d` is place · job: HOME · TASKS, SHOP · SHIFTS, GYM · LIFTS, CHALET · FOOD, CASTLE · JOBS.
    `ANCHORS.fuel` is over the chalet's ridge.
  - **Where:** `CH` (200, -850), floor y 229.2, west of the lift station. The slope rises about 1 m per metre to the
    north, so the chalet stands on a level snow pad dug into the hill (`chalet()` in `mountain()`: a lofted shoulder, a
    short stone plinth, timber walls, a steep snowy roof with its ridge along x, a chimney, a deck with a railing over
    the pad, the door on the uphill side). Its +X gable end is glass: one lit quad facing out, the hole behind it.
    Random village chalets, pines and string lights that would overlap it (`inCH`) are drawn into a throwaway builder
    or skipped after their random numbers are taken, so the rest of the village and forest is unchanged.
  - **Room (`CR`, `buildChalet`, `chaletAtlas`, empty):** 9 deep x 6.4 wide, walls 2.7, vaulted to 5.55 with a ridge
    beam, rafters and tie beams. You stand at the back looking at the glass (lift station right, gondola line left,
    the city's skyline far right). Right wall: green cabinets, butcher-block top, tiles, sink, black range, copper hood,
    and the cream fridge at the front end with the list on its door. Middle: the island with the cookbook on a stand
    and the blender; three stools, a red ski jacket on the far one with the lift ticket. Left: the door at the back,
    hooks, a bench, boots, skis, a trail poster, the stove on a stone hearth in the front corner. Clutter: rug, logs,
    jars, kettle, pot, bread, oranges, mugs, candle, radio, plants, books, string lights on the ridge.
  - **Painted from his data, repainted only on change (`chaletSig`):** the fridge list (by aisle, ticked items struck
    through), the cookbook (this week's picks with protein), the lift ticket (the week's cardio minutes of 90).
  - **Hotspots and cards (`TABS.chalet`):** LIST (fridge) -> `cList`, MEALS (cookbook) -> `cMeals` (THIS WEEK, ALL and
    the book's categories; pick; open a recipe in place: macros, ingredients, method, the spare portion; back),
    SHAKES (blender) -> `cShakes` (today's two, the week as cells), CARDIO (ticket) -> `cCardio` (the week against 90,
    a log box with type chips and SOMETHING ELSE, recent logs). The panel `#chBox`: shakes, cart, cardio bars.
  - **Phone:** `ROOM_DEF.chalet.turn` (0.1) leans the resting view right so all four tags fit (`restYaw` now reads a
    room's own `turn` as well as a figure's).
  - **Weather:** `skyW()` is the weather as shown: in the chalet (any mode but city) rain falls as snow, nothing wet.
  - Tests: t50 (31 checks at both sizes), t2 (Fuel flies to the chalet, five icons), rv13 (the review shots).
- **Built (p12, the small fixes, 2026-11-06):**
  - **Umbrellas only in rain.** Walkers 4 and 6 carry an umbrella mesh; `skyTick` shows it when `SKY.w.rain > .05`,
    so dry and snowy days have none.
  - **Weather dims the room's own lamps.** `roomLights()` scales each room lamp by `room.lampK`
    (`1 - L * mix(.55, .2, cloud)`): full at night, low on a clear day, between when overcast. The clutter toggle keeps it.
  - **Settings › Performance drives the city.** `perfPick` maps the tier (`PQ`/`PM`): auto as tuned (60 fps); balanced
    30 fps and sharpness capped at 1.5; saver 20 fps (10 idle), sharpness 1, no bloom or reflections. `adapt()` judges
    against the tier's own fps. Changes apply live through `onPerf`.
  - **`city on` / `city off`** in quick add (see The flag).
  - Tests: t49 (17 checks).
- **Built (p11, his notes on p10, 2026-11-05):**
  - **The split edits in the gym.** SPLIT card: EDIT THE SPLIT, a select per weekday (`data-gtpl`, `CityApp.tplSet(i, k)`,
    the Plan page's `S.template`, repeats weekly). SESSION card: a SWAP row for the day shown (`data-gpick`,
    `CityApp.sessPick(d, k)`, the day sheet's `sess-pick`, that day only, this week only).
  - **One card at a time** (he found the long stack overwhelming). `TABS` lists each room's cards and tab names;
    `showCard(id)` marks `.card.cur`, builds `#shTabs` and sets `#shPage` to `NN/NN`. A hotspot opens its own tab; a day
    on the split shows the SESSION tab. Global cards (`#sheet.g`) have no tabs.
  - Tests: t47 (split, 10 checks, plus `dc_*` shots). t43 now picks a lifting day if today has no sets; t2 steps frames
    until the shop sheet is in (in the rig the slide only moves while frames draw).
- **Built (p10, the gym, round 1 for his review):** Train now flies into the gym (`ICONS` train `room: 'gym'`).
  - **Where:** `GR`, a 12 x 10 x 5 bay inside the northside gym, its +X wall the building's real east wall
    (`GYM.x + 31`). The way in is a new side roll-up door on that wall (`GDOOR`: 3.8 m wide, 3.4 m high), seen
    through a hole in the city's depth like the apartment's glass. In the city the doorway is one quad facing out, so
    from inside (the street through the door, `RT.bg`) it's culled. The big front door and roof sign are unchanged.
  - **Hotspots (his choice):** SESSION, the rolling whiteboard (today's session, a box per working set, ticked as
    done); SPLIT, a lit chart high on the wall right of the door (this week, today marked, done days ticked); RACK,
    the power rack (the three benchmarks: last, PB, a spark line); REST, the interval clock over the door (the app's
    own rest timer, `startRest`, the one the island counts down; 60 s, 90 s, 2 min, +30 s, stop).
  - **Data:** `CityApp.train()` (index.html): today's session and its sets from `wState()`, the week from `wo()`,
    the benchmarks from `benchLogs()`, the streak; `rest(sec)` and `restLeft()`. The whiteboard and the chart are
    painted from it into the gym's own atlas (`gymAtlas`) and repainted only when `gymSig` changes (`room.paint`).
  - **Panel** `#gymBox`: today's code and name, a SETS bar, the week as seven cells (done underlined in the
    session's colour, today outlined). Sheet cards `cSess`, `cSplit`, `cBench`, `cRest`.
  - **Empty gym** (his choice): no figure. Clutter: dumbbell rack, kettlebells, heavy bag, plyo boxes, mat, ball,
    fan, lockers, water cooler, bag, towel, shaker, leaning plates, chalk bowl, posters (made-up words), pull-up
    bar, battle rope. The neon reads FUERZA like the roof sign.
  - **Test:** `t42.mjs W H tag` (fake gym data seeded): rest, clutter off, both looks, the four sheets, a rest
    started, the flight. `t2` now expects strength to fly to the gym.
- **Built (p10, the rooms usable in place, his rule 2026-11-04):** "I don't want to have to open sessions or anything,
  this goes for the plan etc. I want the UI that is cyberpunk themed to be usable." Nothing in a room's sheet opens
  an app page or app sheet any more; every edit happens in the HUD, through `CityApp`, the pages' own way.
  - **Gym:** each set is a button (`APP.set`, the Training page's `toggleSet`: sound, rest timer, auto-done); MARK
    DONE (`sessDone`); a day on the split shows its session in the card above (`gymDay`); each benchmark logs from
    its own box (`bench`).
  - **Plan:** an ADD box under today and under the picked day (`addTask`, the quick-add parser, so "call Len 3pm"
    works); a task's title opens its editor in the row (rename, TODAY / TOMORROW / NEXT WEEK, a time, DELETE with
    Undo of just that task); from the panel it opens the sheet on that editor. Notes: WRITE ONE box (`noteAdd`), a
    note opens to edit in place (saved as he types, a beat behind), PIN, DELETE. The picked day's shift edits in
    place (start, end, break, his usual shifts as one-tap chips, CLEAR).
  - **Work:** a row in the shifts list picks its day and the same shift editor sits under the list.
  - While he types in a box, that part of the sheet isn't redrawn (`typing`); it catches up when he leaves it.
  - **Fixed:** the app's keyboard shortcuts (1-9 switch tabs, N and / open quick add, T, arrows) fired while typing
    in a city box, because the city's fields are in a shadow root and the app read `e.target` (the host). It now
    reads `e.composedPath()[0]`.
  - **The top bar and CAREER too (his yes, same day):** the brand (Progress), + (quick add) and the settings button
    open the city's own cards (`gProg`, `gAdd`, `gSys`, `data-g`), shown alone in the sheet (`#sheet.g`,
    `openGlobal`). Progress: level ring, XP, the six stats, trophies. Quick add: the app's parser with a live
    preview; a plain task goes to today (no compose sheet). System: the app's settings (name, pay, goals,
    reminders, sound, performance, sync, backup) through `APP.setting` and the app's own actions (`APP.act`);
    `APP.sys()` never hands over the sync code, only whether there is one. CAREER opens `cCareer`: applications,
    status in one tap, add, remove with Undo, the posting link.
  - **Still leaves the HUD:** only the districts without a room yet (Cardio, Fuel, Jobs) open their pages.
  - **Tests:** `t43.mjs` (gym in place), `t44.mjs` (Plan and Work in place, and the shortcut fix), `t46.mjs`
    (progress, system, quick add, career).
- **Built (p8, her motion close up, her card):**
  - **Moves between close-up poses** are staggered (`FIG.lag`: body first, upper arms .1 later, forearms .17,
    hands .24, over 2.6 s). `figSwing` then sets where each upper arm points, straight from the old pose's direction
    to the new one's, bowed out in front of her, and folds the elbow in on the way (`key.arm`: each upper arm's
    direction and elbow bend, her frame). No more arms swinging out through her side, over her head or through her.
  - **Over the shoulder** turns her about half as far (ry -.8, look -.6), so she doesn't spin on the spot.
  - **Holding a pose** close up: deeper breath, her weight rolling slowly hip to hip (hips tilt, legs counter, so
    her feet stay put), the low back answering, a little head tilt; the head wanders at .5 (was .3).
  - **Her card** (`#herBox`): MIRA KADE, online, resident FL 88, age 27; her current pose and its number; MOOD
    (today's tasks done, .35 to 1, .8 with nothing due) and LINK (overall progress); a LIKES line on a laptop only.
    Fades in once the view has moved in; bottom right on a laptop, along the bottom on a phone.
  - **Rig hook:** `closeGo(j)` starts the move into close pose j.
- **Built (p9, her forearms):** `figSwing` steers each forearm by where it points too (`key.arm[].e`), not just
  its bend, so hello to hips brings the hand down in front of her instead of flipping it over at the elbow. To or
  from a raised upper arm (hand in hair) the forearm passes straight up halfway, so the hand rises and falls by the
  side of her head instead of sweeping across her face.
- **Built (p7, close up on her, the monitor, the opening):**
  - **Close up:** a tap on her (her posed box on screen, a little generous; hotspots win) or V moves the view in on
    her at the glass in 1.15 s, with a longer lens (fov × .78). `def.figure.view(aspect)` places the camera: hips up
    on a laptop, thighs up on a phone, her face in the top third. Whatever the hour she comes to the glass:
    `def.figure.close` lists the close-up poses (a wave first, hands on hips, a hand in her hair, arms folded, a look
    over her shoulder), every 7 to 11 s. They follow the spot's poses in `FIG.keys` (`FIG.nS` is how many are the
    spot's; `lo`/`hi` the range she cycles). Close-up poses blend even through a big turn; the wave swings for 3 s.
  - **Stepping back:** a tap anywhere, ‹, Escape, V or browser back. The close-up has its own history entry, so back
    leaves it before leaving the room. She goes back to the pose she left. Flying out from close up snaps her back
    (`closeReset`). The tags and the room panel fade out while close; drag-to-look is off.
  - **DECIDE monitor:** the table's screen is now an ordinary monitor in use (sidebar, two windows of text, a graph),
    not the A and B cards.
  - **Opening:** with the flag on, the app's cold-open screen (the rings) is the city's: red corners close in, a scan
    line opens on DAYBOOK with a red and cyan split that settles, `CITY` and `LV · DAY · TIME` typed below, then the
    city's own loading bar. With the flag off the rings stay.
  - **Rig hooks:** `close(on, i)` (snapped, pose i held), `tapHer()` (her middle on screen); `stats()` adds `close`,
    `closeK`; `pose(i)` and `stats().poses` still count the spot's poses only.
- **Built (p6, the sky):**
  - **Where and what:** `/api/sky` (Worker) reads the secret `SKY_AT` ("lat,lon"; without it, the visitor's rough
    place from Cloudflare), asks Open-Meteo for the weather there now (code, cloud, precipitation, snowfall, the last
    three hours' precipitation, snow depth) and keeps it ten minutes in the Cache API. The page asks on start and
    every 15 minutes, keeps the last answer in `localStorage` (`city.sky`, weather good for three hours) and works
    the sun out itself (`sunAt`, from the place and the clock). The scene's -z is south: the sun crosses the opening
    view left to right.
  - **One sky state:** `skyTick` (in `drawScene`, four times a second) turns the sun's height into daylight `L`
    (0 below -10°, 1 above 7°) and warm hours `W` (around sunrise and sunset), and the weather into cloud, rain, snow,
    wet street, snow lying and fog (`skyWeather`, WMO codes). Weather eases over about a minute. The colours are
    tables (`SKY_N`, the night exactly as painted; `SKY_D` and `SKY_W`, clear and overcast) mixed with `mixN`, which
    is exact at both ends.
  - **Daylight 0 is the night as it was:** every shader change is a `mix(night, day, uSky.x)` or a scale that is 1 at
    night, and the default weather is rain, so with no answer (first start offline, the rig) nothing changes. Checked
    by pixels against p5.
  - **What changes:** the key light becomes the sun (kept 7° up for lighting) and the city's shadows are baked again
    once it has moved about a degree, never mid-flight (`bakeCity`). Ambient, fog, rim and the street pools come from
    the tables; lamps, glows, light in the air and bloom fade by day; windows: fewer lit, glass reflects the day sky;
    asphalt lighter by day; the mountain blue and hazed. The sky (`SKY_FS`) draws the day sky beside the night one:
    gradient, sun and its disc behind cloud, clouds coloured by day. A clear night thins the clouds and shows stars.
  - **Weather:** rain falls as before, scaled by how hard it rains; snow is the same particles slowed, wandering,
    round (`uRainK`). Snow lying whitens whatever faces up, drifts first (`uSky.w`). A dry street keeps a little
    sheen. Fog thickens the air. The shop glass has drops only while it rains (`uDrops`).
  - **Rooms by day:** `skyRoom()` lifts a room's ambient toward daylight (`def.ambDay`, else `ROOM_DAY`), the window
    throws daylight instead of its neon colours, and she is lit by daylight (`FIG_DAY`).
  - **Previews:** `?sky=dusk,snow` shows a sky by name (times: night, dawn, morning, day, afternoon, dusk; weather:
    rain, clear, cloud, snow, fog, wet). Rig hooks: `sky(s)`, `skyNow()`, `sun(ms, lat, lon)`, `wx(record)`.
- **Built (p5, her spots and live motion):**
  - **Spots:** `figSpot()` reads the clock: `day` 6:00 to 18:00 (the window corner), `eve` to 23:00 (at the glass),
    `late` until 6:00 (the bed). `def.figure.spots` lists three key poses per spot (`FIG_POSES` by name, placed by
    `at`, `ry`, `lay`, holding `phone` 'both' | 'l' | 'r' | 'tablet'). `buildApartment(spot)` draws what goes with
    the spot (the window glow only in the evening).
  - **Live rig:** the model's skinned mesh is kept and drawn with `FIG_FS` through three's skinning chunks (GLSL3).
    Each key pose is a set of bone rotations plus a root placement measured from a CPU-skinned box. `figTick` (in
    `drawScene`) moves to the next key every 40 to 70 s: a 2.2 s blend when the move is small, a scan-line wipe
    (0.8 s, `FIG_CUT`) when it isn't. Idle: breath, a slow head drift, a hand flick for one-handed holds. None of it
    under reduced motion. Both programs compile when she loads, not mid-wipe.
  - **What she holds:** a phone or a tablet slab, parented to the hand bone; `FIG_PH` lights her face from it.
  - **Moving on:** a new day while the room is on screen repaints it but pins her spot (`loadRoom(id, keep)`). After
    time away (another page, or the app hidden: `S.away`), she has moved on to the clock's spot.
  - **Rest view on a phone:** `restYaw()` turns the resting view by `def.figure.turn[spot]` when the screen is
    narrower than .8 (late: .18, so the bed is in view; the TODAY pane is then off the left edge, and the bottom panel
    carries today's list). `restView(y)` is the room view turned by `y`. Flights end on it: the way in lands on the
    turned view and the way out leaves from wherever the view is, so neither jumps.
  - **Rig hooks:** `hour(h)` overrides the clock, `pose(i, go)` (holds), `figBox()` (a loose box: the posed box's
    corners turned by `ry`), `rest()`, `view()`, and `stats()` reports spot and pose. Rig flights land at yaw 0.
- **Built (p4, the apartment, Plan's room):**
  - A 9×8×4 m high-rise flat inside the pale megablock, its +X wall all glass. Hotspots TODAY (today's tasks: tick,
    Undo; the row order is taken afresh on each way in and fixed for the visit), WEEK (the month, today filled), NOTES,
    DECIDE (the A/B screen) and CAREER (Jobs, paused). Each opens its panel. Clutter on and off as in the shop.
  - **Depth hole:** the room sits behind the block's solid facade. While flying in or out (camera on the glass side,
    within 140 m), `SC.hole` draws the window's shape with no colour, pushing the city's depth back so the room shows
    through. The quad's z is forced to 0 so it is never near-clipped. Rain is drawn after the room on those frames,
    cut at the glass (`uCut` in `RAIN_VS`).
  - **View camera:** `def.view` gives the glass a skyline seen from higher up and further off, carried rigidly from
    the rest eye (`streetCam`). It's used for the glass background, the reflections and the light shafts.
    `fxOverGlass` draws the room's light over the glass.
  - **Figure:** `def.figure` loads a model file through the vendored `GLTFLoader`. It is posed by bone names (Mixamo
    or VRoid) and drawn with `FIG_FS` (window light in hard steps, a violet room fill, rim); since p5 it stays skinned
    and moves (above). It hides with the clutter. If the file is missing, the room simply
    has no one in it. The apartment's is `models/her.glb?v=1`: his own model, a Tripo FBX converted to GLB. It is
    private like Dex's: gitignored, in KV as `model:her.glb` (gzipped), never in git. Bump `?v=` on any change.
  - **Flight:** the window is entered between the mullions, clear of the figure. The turn goes by the lit kitchen to
    the rest view.
- **Tests, headless SwiftShader, fake data, muted, scripts outside the repo:**
  - **Flag on,** 63/63 at 390×844 and 1366×768: the Phase 1 battery, now expecting the model and loader requests.
    At 390×844 the break-via-the-sheet tap can land while the sheet is still sliding under load; it passes alone.
  - **Apartment:** the tour and the flight in and out show no errors at both sizes, in every spot; the review checks
    (row order, Undo, re-entry, midnight, panel touches) 20/20 at 390×844 and 18/18 at 1366×768 (three checks are
    phone-only, one desktop-only); panels and sheets 79/79 and 78/78; earlier room checks 30/30 at both sizes and 39/39.
  - **Her (p5):** each pose checked for support, no penetration of the sofa, bed or glass, in frame at both sizes and
    clear of the flight path, by the designer and again by a separate checker; spot changes 8/8 at 1366×768.
  - **Rest view (p5):** 11/11 at both sizes: the way in lands on the turned view, the way out and a reversed flight
    don't jump, rig flights hold yaw 0, and loading the page isn't counted as time away.
  - **Sky (p6):** the sky logic 21/21 at both sizes (night as painted, the sun's path, WMO codes, easing, the kept
    answer, previews). Renders of the 13 named skies from the opening view and the street, and the apartment and
    shop by day, dusk, night, rain and snow, show no errors. By day the rain and the drops on the glass are toned down
    so a bright sky doesn't clip to white.
  - **Close up (p7):** 10/10 at both sizes: she's on screen, a tap on her goes close and the view moves in, a tap
    steps back and she returns to her spot's poses, in the evening (at the glass) and late (from the bed). Each
    close-up pose rendered and looked at, at both sizes.
  - **City and shop pixels** at night (the default) match p5 apart from the HUD clock, date and day meter.
  - **Flag off,** against live `p4`: identical at 390×844; at 1366×768 only Dex's clock-dependent bedtime state and a
    count-up caught mid-way differ (Dex's files are unchanged).
- **Not tested:** a real iPhone (FPS, heat, memory with the live rig), Safari, the real sync code.
- **Open:**
  - `her.glb` changes need a `?v=` bump and a new KV upload (its own go): `npx wrangler kv key put --binding SYNC
    --remote "model:her.glb" --path models/her.glb.gz`.
  - The secret `SKY_AT` (the place the sky follows) lives only in Cloudflare (`wrangler secret put SKY_AT`), never in
    the repo; without it the sky follows wherever the visitor is.
  - The ski village (when built) only switches between snow and sun, and has night too.
  - The Inter and Unbounded stylesheet still comes from Google Fonts for the existing pages, with or without the flag.
  - After a context restore, three logs harmless "object does not belong to this context" warnings.
  - Key 1 and the island tap go home through `switchTab`, which doesn't clear `GROW.chip` (same as `main`).
  - `noteCard` still reads `CATS[n.cat]` directly; Phase 2 filters the badge counts.
  - `seen`, `clearDays` and `submitted` are known keys `mergeState` never merged (a rev bump per sync, no data loss).
  - `src/worker.js` comments still mention Cloudflare Access and the old `.vrm` upload command.
- **Next step:**
  1. His review of p11 and p12 live; the rainy-glass street through the door is open to tweak.
  2. His review of the chalet (p13). Then the castle. School (Phase 2) and sound (Phase S) in the agreed order.
