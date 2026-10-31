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
| Plan | `focus` `#64d2ff` | A stacked megablock: balconies, one warm top-floor window, a rooftop | `week:` | `apartment` | Fridge note, Calendar, Notebook, Phone |
| Work | `grind` `#0a84ff` | Downtown black-glass towers around the megatower, with a wood-and-brass clothing shop at street level | `hours:shifts` | `shop` | Register, Ledger, Notepad |
| Train | `strength` `#ff9f0a` | A pale-concrete warehouse gym: roll-up door, orange neon | `training:` | `gym` | Rack, Stopwatch, Whiteboard, Split chart |
| Cardio | `stamina` `#ff375f` | A ski village on the mountain: chalets, a rounded lift station, gondola line, pines, snow | `training:cardio` | `ski` | Lift board, Ticket window |
| Fuel | `fuel` `#ffd60a` | A night-market food-stall alley: lanterns, steam, stacked sign blades | `training:fuel` | `stall` | Blender, Gainer tub, Menu board, Paper bag, Counter |
| Jobs (School from Phase 2) | `hustle` `#30d158` | A stone castle on a forested point over the water | `jobs:` | `castle` | Desk (applications). School hotspots are declared for Phase 2. |

**Composition:** the mountain runs across the back, the water along the front and right, and the skyline stands in
rows across the water. The rail loops the island and the megatower is the tallest point. **Text in 3D:** signs and
ads carry made-up words only. Never logos, crests, real brands, game names or the real shop's name. The 3D neon may run warmer than the icon colour so the city stays cozy;
the icons keep their exact colours.

**Ground rules that shape every phase:**
- **The red HUD is wanted.** He lifted the earlier ban: the city and the rooms carry the tasteful red HUD from the
  look test (angled panels, thin rules, small monospace tags, floating labels). It lives in a shadow root inside
  `city.js`, so its styles and the app's never touch. Pages, app sheets and the toasts keep their current card style
  for now. Everything in the HUD that looks like his data is his data; moving bars and the side ladder are decoration
  and carry no claims.
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
- **Not built:** the `city on` / `city off` / `city perf` quick-add words and `?perf=1`. The Home Screen app has its own
  storage and no URL bar, so it can't be flipped until the quick-add words exist. The HUD's GFX button is the perf
  readout for now.
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

Technical state only. Updated 2026-10-31.

- **Branch:** `city-p1`, local only, never pushed. It was the same as live `main` at `bdacab4` (Phase 0 and the XP change
  are live), and the city commits sit on top. `git log --oneline bdacab4..city-p1` lists them. `BUILD` is `'p1'` on this
  branch only. Don't push `city-p1` itself until Cloudflare branch builds are confirmed off (§15).
- **Built (Phase 1):** `city.js` (the look test's world, people, flights, HUD and quality logic, in a shadow root), the
  flag and loader, and `window.CityApp`. See [The flag](#the-flag).
  - Home: the city replaces the Dex home with the flag on. Work flies into the shop. Plan, Train, Cardio, Fuel and Jobs
    open their existing pages through `openPage`, and back returns to the city. The sixth icon says Jobs because that's
    the existing route; it becomes School in Phase 2.
  - The app's Progress, Quick add and Settings are reached from the HUD's top strip (DAYBOOK, +, the initial).
  - Shop: real clock (Undo on clock in and clock out, Break), the real period's shifts (a row opens the existing shift
    sheet) and pay. Pins and panels on the home read `attributes()`, tasks, level and sync.
  - Removed: `SHIFT_ROWS`, EXAMPLE DATA, the fake toasts, fake hours on the till, ledger and notepad props, the fake
    audio readout. The till's sale lines and the tailor's measurements stay as shop props.
  - Fixed: the clock-out timer no longer freezes, and the first friendly failure message is the one shown.
  - Added: recovery after a lost WebGL context; the city stops drawing on other pages and under a sheet.
  - Ad names now made up: ZENKIRA, CHISPAZ, OJIVEX-9, ZAPTRO, PLAYORA, NOCTELO, TRONZO. A quick web search found no brand
    for any of them. That isn't a trademark clearance.
- **Fonts, what changed:** the look test's five web fonts are gone. The HUD uses a condensed system font, signs a heavy
  system sans, Japanese the system Gothic. Sign words were resized to fit. On Windows that's Bahnschrift, Arial Black and
  Yu Gothic; on iPhone it should be Avenir Next Condensed, Avenir Next and Hiragino, not yet seen.
- **Tests, all pass, headless SwiftShader, fake data, scripts outside the repo:**
  - **Flag on,** 63/63 at 390×844 and 1366×768: city, flight, shop, clock in, Undo, clock out, Undo, break, shifts, pay,
    back, browser back, Escape, all five other districts, Settings, Quick add, Progress. Clocking in shows on the Hours
    page. No Dex file is requested.
  - **Counts,** against the look test: 1366×768 is identical (city 81 calls, 603,994 triangles; shop 68, 718,254). At
    390×844, city 74 calls and 600,394 triangles (look test 601,794), shop 61 and 646,678 (648,078).
  - **Flag off** against `bdacab4`, reduced motion: 26/26 captures identical at both sizes (home, pages, sheets,
    Spotlight, clock, chip and back) apart from the Build line, with the same requests and no city file.
  - **Service worker:** with the flag on, `city.js` and three are cached, and a reload with the server gone starts the
    city and clocks in. Registration was forced on in the scratch copy, because the app only registers it on https.
  - **Failures:** no WebGL and a blocked `city.js` both show their message and fall back to Dex. A lost and restored
    context draws again.
  - **Real time, no rig,** at 280×500: flight, tap-skip, live timer, the idle stop under sheets and on pages.
  - **Sync,** on a local scratch Worker: city device and flag-off device exchange clock in, clock out, Undo and a shift.
    No new synced keys. Dex itself was stubbed out on the second device to keep the machine responsive.
- **Not tested:** a real iPhone, real FPS, heat, battery, Safari, iOS fonts and memory limits, the real sync code, and
  the Home Screen app.
- **Open:**
  - He's asked to confirm the shop name "Sastrería Oro", and whether to bundle the original fonts (they weren't
    downloaded, no assets in this phase).
  - The flag can't be flipped in the Home Screen app, because the quick-add words aren't built.
  - The Inter and Unbounded stylesheet still comes from Google Fonts for the existing pages, with or without the flag.
  - Settings › Performance doesn't drive the city's quality yet, and the city is well over the older budgets above.
  - After a context restore, three logs harmless "object does not belong to this context" warnings while it frees the
    old targets.
  - With `?cityrig` on Windows, shader checks log a harmless compile warning. Outside the rig they're off.
  - Key 1 and the island tap go home through `switchTab`, which doesn't clear `GROW.chip` (same as `main`).
  - `noteCard` still reads `CATS[n.cat]` directly. The app badge leaves out unknown-category reminders while the
    Worker's push badge counts them; Phase 2 filters both.
  - `seen`, `clearDays` and `submitted` are known keys `mergeState` never merged, so a device without one PUTs on each
    sync (a rev bump, no data loss).
  - `src/worker.js` comments still mention Cloudflare Access and the old `.vrm` upload command. Dead `#v-today .grid`
    and `#v-today .slip-card` rules remain in the first 760 px media query.
- **Next step:**
  1. He answers the two questions above.
  2. His go to put this on the live site, still flag-off by default. Then the iPhone check at `?city=1`: looks, heat, FPS.
  3. Fix what that finds, then Phase 2 (School) or the rooms, in his order. Sound is Phase S.
