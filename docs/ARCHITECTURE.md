# Architecture

How Daybook is put together, where things live, and how to change it safely.
Start here before touching code.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole app: CSS, markup and the main script (~3,200 lines). No build step. |
| `rider.js` | Dex, the 3D character: Jackson's VRoid model skiing downhill (or in his Work / Sleep outfit). Talks to the page through `window.Buddy` and `window.buddyContext()`. |
| `dress.js`, `gear.js` | The ski outfit, built in code on the model: jacket, pants, boots, gloves (`dress.js`); mask, goggles, skis, poles (`gear.js`). |
| `physique.js` | The gym look's build: muscle shapes pushed into the body, plus anime shadows and ink lines drawn by the skin shader. |
| `buddy.js` | The old code-built Dex. Only loaded if the models can't be fetched. |
| `models/` (not in git) | The `.vrm` files, slimmed and gzipped. **Never commit them** (public repo); they are served from KV, see Hosting. |
| `vendor/` | three.js r169 (`three.module.min.js`), `RoundedBoxGeometry.js`, `RoomEnvironment.js`, `jsm/` (GLTFLoader and BufferGeometryUtils from r169) and `three-vrm.module.min.js` (@pixiv/three-vrm 3.5.5). Loaded through an import map in `<head>`. |
| `meals.json` | The Protein Prep Book: recipes, grocery list, prep plan, snacks. |
| `sw.js` | Service worker. Network-first cache, push notifications, notification buttons. |
| `src/worker.js` | Cloudflare Worker: sync API, push API, reminder cron, `/workout/` proxy. |
| `src/push.js` | Web Push encryption (RFC 8291) and VAPID signing (RFC 8292), no libraries. |
| `wrangler.jsonc` | Worker config: custom domain, KV binding, cron, VAPID public key. |
| `icons/`, `manifest.webmanifest` | Home-screen app icons and manifest. |
| `docs/` | These notes. |

## Hosting and deploy

- Lives at **apps.jacksonhamm.ca**, a Cloudflare Worker named `daybook` with static assets.
- **A push to `main` deploys on its own** in about 40 seconds (Cloudflare Workers Builds via the GitHub app).
- Check a deploy is live: `curl -s "https://apps.jacksonhamm.ca/?cb=$RANDOM" | grep -c <something new>`.
- Secrets live in the Cloudflare dashboard, not the repo: `SYNC_KEYS` (allowed sync-code hashes) and `VAPID_PRIVATE_JWK`.
- `/workout/*` is proxied from the Jackson-Workout-Plan repo so both apps share one origin and one localStorage.
- `/models/<name>.vrm` is served by the Worker from KV key `model:<name>.vrm` (stored gzipped, sent with `content-encoding: gzip`). To update a model: slim it (textures over 1024px halved, thumbnail shrunk, then gzip), run `npx wrangler kv key put --binding SYNC --remote "model:ski.vrm" --path models/ski.vrm.gz`, and bump `V` in `rider.js` so phones fetch the new file. The service worker caches models cache-first.

## Data

Everything is one object, `S`, saved to `localStorage.daybook_v1` and synced.

| Key | Holds |
|---|---|
| `tasks[]`, `jobs[]`, `notes[]` | Lists of items with `id` and `u` (last changed). |
| `shifts{date}`, `workouts{date}`, `extra{periodEnd}`, `shakes{date}`, `meals{week}`, `grocery{id}`, `snacks{name}` | Keyed maps, each value stamped with `u`. |
| `tomb{}` | Deletions, kept 30 days so other devices learn about them. |
| `settings` | Name, pay rate, payday anchor and cycle, cut-off, goals, reminders, workout link. |
| `template[7]` | The weekly training split (D1–D4, HIIT, REST). |
| `ui` | Per-device view state (tab, open modules). **Never synced.** |

Workout logs (`workout_state_v3`, `log_*_v1`) belong to the workout app and are read from localStorage.

## Sync

- `save()` stamps whatever changed, then syncs a few seconds later.
- The Worker stores state in KV under a hash of the sync code; the code itself stays on the device.
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
| `/* ---------- fuel` | Prep book loading, meal picks, grocery, shakes. |
| `/* ---------- the game layer` | XP, levels, trophies, quests. |
| `/* ---------- arc navigation` | The looping tab wheel. |
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
