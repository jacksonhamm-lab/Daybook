# Architecture

How Daybook is put together, where things live, and how to change it safely.
Start here before touching code.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole app: CSS, markup and the main script (~3,200 lines). No build step. |
| `rider.js` | Dex, the 3D character: four Tripo models (ski, gym, work, camp) on the Today stage, their scenes, props and camera. |
| `motion.js` | His routines from motion-captured clips: walking between spots, picking things up, closing his fingers on props. |
| `dress.js`, `gear.js` | The cel-shading materials and ink outline (`dress.js`); skis, poles and finger poses (`gear.js`). |
| `tools/blender/` | Headless Blender scripts that turn a Tripo export into an app-ready GLB (see docs/CHARACTER.md, Models v5). |
| `buddy.js` | The old code-built Dex. Only loaded if the models can't be fetched. |
| `models/` (not in git) | The `.vrm` files, slimmed and gzipped. **Never commit them** (public repo); they are served from KV, see Hosting. |
| `vendor/` | three.js r169 (`three.module.min.js`), `RoundedBoxGeometry.js`, `RoomEnvironment.js`, `jsm/` (GLTFLoader and BufferGeometryUtils from r169) and `three-vrm.module.min.js` (@pixiv/three-vrm 3.5.5). Loaded through an import map in `<head>`. |
| `meals.json` | The Recipe Book (`v: 2`): 16 recipes at three portions each (two tonight, one spare), amounts written into every step. Each recipe carries `g`, its shopping items as aisle-and-item id plus amount (`["Produce\|Garlic", "2 cloves"]`); `aisles` is the shelf order; plus `snacks`. Bump `v` and `bookOk()` together when the shape changes. |
| `sw.js` | Service worker. Network-first cache, push notifications, notification buttons. |
| `src/worker.js` | Cloudflare Worker: sync API, push API, reminder cron, `/workout/` proxy. |
| `src/push.js` | Web Push encryption (RFC 8291) and VAPID signing (RFC 8292), no libraries. |
| `wrangler.jsonc` | Worker config: custom domain, KV binding, Durable Object `Store` (synced state), cron, VAPID public key. |
| `icons/`, `manifest.webmanifest` | Home-screen app icons and manifest. |
| `docs/` | These notes. |

## Hosting and deploy

- Lives at **apps.jacksonhamm.ca**, a Cloudflare Worker named `daybook` with static assets.
- **A push to `main` deploys on its own** in about 40 seconds (Cloudflare Workers Builds via the GitHub app).
- Check a deploy is live: `curl -s "https://apps.jacksonhamm.ca/?cb=$RANDOM" | grep -c <something new>`.
- Secrets live in the Cloudflare dashboard, not the repo: `SYNC_KEYS` (allowed sync-code hashes) and `VAPID_PRIVATE_JWK`.
- `/workout/*` is proxied from the Jackson-Workout-Plan repo so both apps share one origin and one localStorage.
- `/models/<name>.vrm` is served by the Worker from KV key `model:<name>.vrm` (stored gzipped, sent with `content-encoding: gzip`). To update a model: slim it (textures over 1024px halved, thumbnail shrunk, then `node tools/strip-morphs.js in.vrm out.vrm` to drop the face blendshapes no expression uses, then gzip), run `npx wrangler kv key put --binding SYNC --remote "model:ski.vrm" --path models/ski.vrm.gz`, and bump `V` in `rider.js` so phones fetch the new file. The service worker caches models cache-first.

## Data

Everything is one object, `S`, saved to `localStorage.daybook_v1` and synced.

| Key | Holds |
|---|---|
| `tasks[]`, `jobs[]`, `notes[]` | Lists of items with `id` and `u` (last changed). |
| `shifts{date}`, `workouts{date}`, `extra{periodEnd}`, `shakes{date}`, `meals{week}`, `grocery{id}`, `snacks{name}` | Keyed maps, each value stamped with `u`. |
| `tomb{}` | Deletions, kept 30 days so other devices learn about them. |
| `settings` | Name, pay rate, payday anchor and cycle, cut-off, goals, reminders, workout link. |
| `template[7]` | The weekly training split (D1–D4, HIIT, REST). |
| `clock` | The running shift timer. Synced (stamped `clockU`), so clocking in on the phone shows on the laptop. |
| `ui` | Per-device view state (tab, open modules). **Never synced.** |

**Training program (2026-10-05):** lives in `program.json` (days `d1`-`d5`: sections of exercises with sets). Edit that file
to change the program. It used to be parsed out of the old workout app, which Daybook no longer needs.
- Program 2 is five lifting days (Push, Pull, Legs, Max Day, Upper), one conditioning day and one rest day (`SPLIT`).
- `migrateProgram()` moves the weekly split onto it once (`settings.programV`) and pins the old split onto past days,
  so earlier weeks keep their history and streak.
- Set ticks are stored by an exercise's place in its day. When exercises are *removed*, list their old places in `TICK_EDITS` (index.html) under a new number: ticks already made that week are moved once per device, so they stay on their exercises. For bigger reshuffles, bump `W_STATE` to clear the week's ticks.

Workout logs (`workout_state_v4`, `log_*_v1`) are per device, in localStorage.
They only exist on the device that ran it, so `syncAuto()` only un-ticks an auto-done session on a device that has that session's log.

## Pay periods

- Two-week periods, **Friday to Thursday** (`payAnchor` 2026-09-25 is a payday; the period ends the
  day before payday). Paid the Friday after it ends.
- Hours go to Len on the **Monday** of payday week (`submitDay` = payday − `paySubmitDays` 4), with
  Tue–Thu estimated from recent same-weekday shifts. E.g. Sep 25 – Oct 8: send Mon Oct 5, paid Fri Oct 9.
- **The Work page is period-based** (his call: always show the period total): the headline is the
  period's hours × rate (+ subscription hours), all 14 days are listed Fri → Thu, and the arrows step
  by period (`PAY.date`, `curPeriod()`). "Copy for Len" copies the submit summary.

## Sync

- `save()` stamps whatever changed, then syncs ~1s later. Backgrounding the app flushes a pending change at once (keepalive).
- The Worker stores state in a **Durable Object** (`Store`, one per sync-code hash), not KV. KV reads can be ~60s stale
  in another location, which let one device overwrite the other's newer changes. The old KV copy (`state:<hash>`) is
  carried over on first read and is no longer written.
- A sync only PUTs when the merged state differs from the server's (`sig()`, order-blind), so idle devices don't write.
- Devices merge item by item (newest `u` wins, tombstones win over older items), and a `409` triggers a re-merge.
- **A new keyed map or list must be added to both lists in `stampChanges()` and `mergeState()`**, or it won't sync.

## Code map (index.html)

Line numbers drift, so search for the section comment instead.

| Section comment | What's there |
|---|---|
| `/* ===== v3` … `v5` …` / attributes` (in `<style>`) | CSS layers from each redesign. The v4 `.dash/.stg/.pnl/.stc` rules are now unused. |
| `/* ---------- state` | Defaults, `load()`, `save()`, `commit()` (save + re-render). |
| `/* ---------- cross-device sync` | `stampChanges`, `mergeState`, `syncNow`. |
| `/* ---------- notifications` | Push subscribe/unsubscribe, sync code mirrored to IndexedDB for the service worker. |
| `/* ---------- pay periods` | `periodFor`, `periodHours`, `extraHours`, submit-to-Len window. |
| `/* ---------- quick-add parser` | Spotlight text → task, shift, job, workout. |
| `/* ---------- dynamic island` | Toasts and the live pill. |
| `/* ---------- sound` | `sfx(name)`: quiet cues synthesised with Web Audio (no audio files). Off by default; the switch is in Settings and is stored per device in `localStorage.daybook_sound`, never synced. Add a cue to `SFX`, then call `sfx()` next to the matching `haptic()`. |
| `/* ---------- fuel` | Recipe book loading, meal picks (ticked on the recipe row), the shopping list (`amtSum()` adds amounts across the picked recipes), shakes. |
| `/* ---------- the game layer` | XP, levels, trophies, quests. |
| `/* ---------- notes` | Notes tab, `orb()` halo, `weekBars()`. |
| `/* ---------- views` | `hero()`, `taskLi`, clock disc, `sessionArt`. |
| `/* ---------- modules` | `mod()`, `toggleMod()`, and the Today, Hours and Training views. |
| `/* ---------- attributes` | Dex's six stats, `goAttr()`. Also `window.buddyContext`. |
| `renderWeek`, `renderJobs` | The other two tabs. |
| `/* ---------- sheets` | `SHEETS` (compose, task, shift, session, job, note, book, progress, settings), `openSheet`, `closeSheet`. |
| `/* ---------- render` | `render()`: rebuilds the current tab's HTML, mounts Dex, keeps animations running. |
| `/* ---------- actions` | One click handler, switching on `data-act`. Input, change and submit handlers follow. |
| `/* ---------- boot` | Builds the arc, first render, sync, service worker. |

## How rendering works

- `render()` replaces the current tab's HTML every time data changes. Anything that must survive (Dex's canvas, open modules) is re-attached or restored after.
- Buttons declare `data-act="name"` (plus `data-v` / `data-id`); the one click handler dispatches. Add a `case` there for a new button.
- Bottom sheets: `openSheet(type, arg)` renders `SHEETS[type](arg)`; `refreshSheet()` redraws it in place.

## Conventions

- Commit as Jackson: `git -c user.name="Jackson Hamm" -c user.email="jackson.hamm@icloud.com" commit`.
- Patch scripts: **never** `str.replace(a, b)` with code in `b`. `$$` and `` $` `` get eaten. Use `s.replace(a, () => b)` or split/join.
- After an edit, syntax-check the main script: `new Function(src.slice(src.lastIndexOf('<script>') + 8, src.lastIndexOf('</script>')))`.
- Keep `docs/` current when behaviour changes.

## Testing locally

- The `daybook` preview server serves the scratchpad folder; the app is at `http://localhost:8765/db/index.html`.
- Put the slimmed `.vrm` files (ungzipped) in `models/` so the local server can serve them.
- The preview pane throttles animation when hidden. To inspect Dex, step frames by hand: `Buddy._.frame(t)`. Move the camera with `Buddy._.state.camDist` and `camY`; swing it with `state.orbit` (hold it with `state.drag = {x:0,y:0,orbit:0,moved:0}`).
- To see another outfit, override the context: `window.buddyContext = () => ({ ...orig(), mode: 'work' })` then `Buddy.update(buddyContext())`.
- Screenshots right after a programmatic scroll are sometimes blank; take a second one.

## Performance

- **Quality levels** (per device, `localStorage.daybook_perf`, Settings > Performance):
  - Smooth: 60fps.
  - Balanced: 30fps, 1.5x pixels.
  - Saver: 20fps, 1x pixels, no backdrop blur, grain or moving beams.
  - Auto starts on Balanced (Saver on a machine with 4 cores or less, or 4GB or less). It drops to Saver if it measures under
    70% of the target frame rate, e.g. under Opera's CPU limiter.
  - `html[data-perf]` carries the level for CSS, and the halo rings follow it.
- **No big main-thread blocks:** a new outfit is warmed up before it's shown (`warm()`: `compileAsync`, then each mesh drawn
  off camera, a frame apart).
  - Before this, the first draw blocked the page for 2-3s on Windows. ANGLE compiles shaders at draw time, and all 57 face
    blendshapes were being packed (now stripped to 14).
  - Lights are never hidden. The camp's point lights sit on the scene root and go to intensity 0, because a light appearing or
    disappearing rebuilds every shader.
- **Resilience:** a frame that throws is skipped and logged, and the loop keeps going. A WebGL context loss pauses the loop and
  resumes it when the context comes back.
- **Problem log:** `window.logProblem(where, err)` keeps the last 40 errors in `localStorage.daybook_log`. Settings >
  Performance > "Copy problem log" copies them with the browser, level, DPR and window size.
