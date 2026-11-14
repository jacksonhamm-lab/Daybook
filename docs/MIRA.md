# Mira

Mira Kade lives in the apartment. His ask (2026-11-13): she's "kind of like a girlfriend but all she does right now is
just stand there". His picks: all of the ideas below, in phases; voice **warm and teasing**; AI chat **skipped for
now**; a voice through **ElevenLabs** (later phase, his account, his key).

## Her voice (every line follows this)

- Warm, a little playful, proud when he gets things done, a gentle tease when he doesn't. Never nagging, never guilt.
- Short lines. Plain words, no em dashes, nothing that sounds like an assistant ("I'd be happy to", "Great job!").
- She calls him "you" (and sometimes his name from Settings). No pet names that sound generated.
- She is an adult, dressed, and the app stays tasteful. Nothing explicit, ever.

## How lines work (`mira.js`)

- Every line has a stable `id`, a `say` and maybe an `info`.
  - `say` is fixed text with **no data in it**. It is the part that can be voiced (one clip per id, generated once).
  - `info` carries the data (times, counts, task titles). It is shown, never sent to the voice service.
- Variants per id; the pick is stable for the day (seeded by date + id) so she doesn't flicker between taps.
- `Mira.brief(ctx)`, `Mira.checkin(ctx)`, `Mira.review(ctx)` turn a plain context (built by `APP.mira()` in
  index.html) into a list of steps. city.js only shows them; index.html does the actions. Testable without the city.

## Phases

1. **M1 Talk (built p24).** A dialogue box in her close-up. Tap her and she greets you, then the day brief: shift,
   session, list, late, decisions, school, pay. Each step that belongs somewhere has GO, which flies there. From 9 pm
   it's the check-in: each open task today with DONE / TOMORROW / LET GO, then a closing line. Sundays from 5 pm, the
   week in review (hours, sessions, study, what slipped) then the check-in.
2. **M2 Caller and reactions (built p26, 2026-11-14).**
   - **The phone:** picking up DECIDE puts her on the line (`miraCall`, `#dcCall`): one thing waiting, its name and
     time; several, how many; none, she just wanted to hear him. Her voice after the pickup sound; hanging up stops her.
   - **Reactions** (`miraReact` in index.html): her voice a beat after the moment, her words in the island once it's
     free (an Undo goes first; after 8 s the words are dropped). Cleared list, new benchmark best, clocking out.
   - **The evening nudge** (`miraNudge`): 7 to 9 pm, a lifting or HIIT day not done, once a day while the app is open;
     its GYM button flies there (`City.go`).
   - **Where she is** (`figSpot`): on the clock by day, `work` (tablet, or her phone at the glass); 11 pm `late` (in bed
     on her phone); after midnight `sleep` (asleep, no phone). The door is behind the resting camera, so "waiting at the
     door" became waiting with her tablet. Test hook `City._.work(on)`. Test t74.
3. **M3 Everywhere.** A small holo call of her in the gym (rest countdown), the castle (keeps the study clock), the
   shop (clock-in). "Tell Mira": plain words become a note or a task.
4. **M4 Closeness.** LINK only grows (streaks, finished lists, sessions, study). Levels unlock poses, outfits,
   apartment things and evening spots. Outfits need new models (his call on how).
5. **V Voice (built p25, 2026-11-14).** His picks: an ElevenLabs library voice (`mDxkcO3nsRCNeB4si9qg`; he turned down
   "Kano"), and **Japanese with English subtitles** ("way better"). `Mira.JA` holds the Japanese for every variant id
   (written by me, not a native speaker; worth a native read). `tools/mira-voice.mjs`:
   - `sample|all <voice> --lang ja` makes clips into `models/voice/ja/` (gitignored); skips ones already made with the
     same text and voice. 96 clips cost about 1,440 credits.
   - The key: typed at a hidden prompt (Ctrl+V reads the clipboard), and kept, at his yes, in `%USERPROFILE%\.mira-voice-key`.
   - `kvfile --lang ja` packs them for one upload: `npx wrangler kv bulk put --binding SYNC --remote models/voice/kv-ja.json`
     (KV keys `voice:ja/<id>.mp3`; the Worker serves `/models/voice/ja/<id>.mp3`).
   - App: `mvSay(id)` in index.html plays the clip through the cue engine's UI bus (volume, silent switch, ducks the
     ambience), fetched ahead per talk, cached decoded; `MV.v` bumps the cache when clips change. Switch: System > Sound >
     Mira's voice (per device, on by default, only with Sound on). Without her voice, the tick per line.
   - **Changing a line:** edit `L` and `JA` in mira.js, run `all` again (only changed lines are made), `kvfile`, upload,
     bump `MV.v`.
