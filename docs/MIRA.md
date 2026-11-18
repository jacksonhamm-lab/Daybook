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
   - **Reactions** (`miraReact` in index.html): her voice a beat after the moment, her words with it in the city's
     caption strip (p37; the island keeps its Undo). With no city, or an island button (the nudge's GYM), her words wait
     in the island once it's free (an Undo goes first; after 8 s they're dropped). Cleared list, new benchmark best,
     clocking out.
   - **The evening nudge** (`miraNudge`): 7 to 9 pm, a lifting or HIIT day not done, once a day while the app is open;
     its GYM button flies there (`City.go`).
   - **Where she is** (`figSpot`): on the clock by day, `work` (tablet, or her phone at the glass); 11 pm `late` (in bed
     on her phone); after midnight `sleep` (asleep, no phone). The door is behind the resting camera, so "waiting at the
     door" became waiting with her tablet. Test hook `City._.work(on)`. Test t74.
3. **M3 Everywhere (built p27, 2026-11-14).**
   - **Her holo call** (`#holo`, `holoTick` in city.js, every 0.5 s): a small cyan call of her above the room's panel.
     - **Gym:** a rest starts, she's on the call counting it (+30S, STOP); the first rest of a visit in her voice. It runs
       out: "Up. Next set." in her voice; stopped early, she hangs up quietly.
     - **Castle:** once a day, with the clock off, she asks to keep the time (START). Starting it, each whole hour, and
       stopping it (a minute or more), in her voice; between, small (her face and the clock). Tap small to open it.
     - **Shop:** by day (6 am to 9 pm), off the clock with nothing logged today, she asks once a day (CLOCK IN).
       Clocking in: "Have a good shift" with the time. Clocking out is M2's "come home".
     - × hangs up until the next thing happens. The app owns the timers; the call only watches them.
     - **(p37, his note: "the hologram is hard to read and see")** A solid plate (.95), her line 16 px (17 on a
       laptop), labels 12 px, info 13 px, a 44 px ×, a lighter face tint with fainter scan lines and a softer flicker.
       Under a phone's sheet it docks as a one-row chip in the band above it (her face, LIVE, the clock; 46 px at most,
       clear of the sheet's ×; a tap shows her line again in the strip; typing to her takes it off the dock). Under
       the plan board, or a call ringing at the top, it steps aside. It waits for her voice before it hangs up or goes
       small (10 s past its time at most). Test t89.
   - **Her face** (`faceGrab`): right after a frame, close up and settled, her head and shoulders into a 120x150 JPEG,
     kept in `localStorage.daybook_mface` (this device only, never synced or uploaded). Before he has seen her close
     up, the call shows MK.
   - **Tell Mira** (`APP.tell` in index.html; TELL in her close-up and on the call): plain words become a note when he
     says so ("note", "remember that", "idea", "write down") or it reads like a thought (over 12 words or several
     sentences, no day or tag), else a task through the quick-add parser (days, #tags, course codes, shifts, jobs).
     "Remind me to", "I need to" and the like drop out of the title. She answers (`tell.task`, `tell.note`,
     `tell.huh`) with what was made as info.
   - Test hooks `City._.holo()`, `hv()`, `face()`, `faceClear()`, `tell(w, text)`. Test t75.
4. **M4 Closeness (built p28, 2026-11-14).**
   - **LINK** (`link()` in index.html): points from his data, so it syncs: each cleared day 10, session 8, clean
     training week 25 (any in the last two years), study hour 4, task 1. Only grows: each device keeps the most it has
     seen (`localStorage.daybook_link`). Levels at `Mira.LINK_AT` (0, 60, 160, 300, 480, 700, 960, 1260, 1600, 2000).
   - **Unlocks** (`Mira.UNLOCKS`; city.js `linkHas(id)`, spots and close poses carry `un`): LV2 close pose A STRETCH,
     LV3 string lights on the glass, LV4 evenings in bed with her phone, LV5 close pose HANDS BEHIND HER, LV6 late ramen
     on the table, LV7 evenings reading by the glass, LV8 a neon heart over the bed, LV9 close pose A KISS, LV10 a
     blossom tree by the glass. Her things are drawn last in buildApartment with their own random stream; a new level
     rebuilds the apartment on the way in (`room.lv`).
   - **A level up** (`linkCheck`, every 30 s and after a tick): once per device, a celebration and her line
     (`link.up`). A device's first run counts from LV1, so the levels he already has get their moment. Her next talk
     says what's new after her hello (`link.new`, info `LINK LV n · NEW: ...`), once (`daybook_link_told`).
   - **Her card:** LINK shows LV and the bar to the next, and `NEXT // LV n · everything it brings`.
   - **Outfit colours** (his pick over new models, Nov 15): navy is hers; crimson LV2, emerald LV4, violet LV6, pearl
     LV8, gold LV10 (`Mira.FITS`, UNLOCKS kind `fit`). Her shader (`FIG_FS`, uniform `uFit`) tints the texture's navy
     cloth (bluish, saturated or near black) keeping its shading; her chest's pale satin by its place in the model's own
     space (front is -y, height z); never her eyes (four spots on the 2048 texture) or what she holds. OUTFIT on her
     buttons swaps them for swatches, locked ones showing their level; a pick is kept in `S.settings.miraFit` (synced,
     `APP.fit/fitSet/fitOk`) and she answers (`fit.pick`, 3 lines).
   - Test hooks `CityApp.link()`, `linkTest(pts)` (raises only), `City._.stats().lv/closeN`, `City._.fit()`. Tests
     t76, t77.
5. **M5 Calls (built p29, 2026-11-15).** She rings wherever he is (city or any room), he picks up, she says what it's
   about (her voice, no data in it; the thing on screen) and his answer does it. `#call`, `callTick` (every second;
   asks `APP.calls(at)` every 5 s), `callRing/callAnswer/callStep/callDo/callBye`.
   - **What rings, most pressing first** (`APP.calls` in index.html): a reminder come due (`slipped()`, every due one in
     the same call: DONE / +2H / TOMORROW through `APP.decide`); still clocked in 30 min past today's logged shift end or
     10 h in (CLOCK OUT / STILL HERE); hours for Len, 10 am to 8 pm in the submit window until sent (COPY HOURS /
     LATER); the check-in, 9 to 11 pm with tasks open (the close-up's list, DONE / TOMORROW / LET GO, then
     `checkinEnd`); school due today or tomorrow, 5 to 9 pm (CASTLE / LATER); the gym, 7 to 9 pm on a session day not done
     (GYM / SKIP TODAY; it replaces the island nudge); Sunday 5 to 10 pm, next week (PLAN IT opens the board there).
   - **Manners:** one at a time, 90 s between calls; never in a flight, while he types, close up with her, or while she
     counts his rest; reminders not while DECIDE is open. Rings 25 s (his own ring or the built-in, again every 6.5 s),
     then missed; up to 3 min hidden doesn't count (away longer, or into a new day, and it's missed, not rung again on
     his return), nor up to 60 s while Sound is on but held (the card says TAP FOR SOUND).
     (p37) Declined or missed: again after `CALL_AGAIN` (reminder 60 min, max 3 rings, then DECIDE holds it;
     clock-out 60; Len 180; week 120), the rest not today. A check-in done in person counts. Kept per device per day in
     `localStorage.daybook_calls`. A reminder call marks `daybook_rung`, so the apartment phone doesn't ring for it too;
     with calls on, index.html's reminder chime and evening nudge stay quiet (`City.calls()`).
   - **Switch:** System > Sound > Mira's calls (per device, `daybook_mcalls`, on by default).
   - **Lines:** 13 new keys, 27 variants (`call.remind`, `.next`, `call.ok.done/later/tomorrow`, `call.clockout`, `.still`,
     `call.len`, `.done`, `call.later`, `call.study`, `call.skip`, `call.week`); the gym call says `nudge.gym`, the
     check-in its own lines.
   - Test hooks `City._.call(at)`, `callState()`, `callMem()`, `callReset()`, `ringFor(ms)`. Test t79.
6. **V Voice (built p25, 2026-11-14).** His picks: an ElevenLabs library voice (`mDxkcO3nsRCNeB4si9qg`; he turned down
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
   - **Her words always on screen (p37, his note: "Mira also says things sometimes without subtitles ... the panel
     covers what she says ... write itself out at the top").** One caption strip (`#mcap`, `capSync` in city.js), under
     the top bar, typed out with MIRA // in front, two lines at most on a phone. It shows a line only when the line's own
     box can't be seen: the holo under a phone's sheet or the plan board, her close-up hidden (HIDE: the rest of the
     line in progress) or under a sheet or the board, a call or holo gone while her voice still plays, and lines with no
     box (reactions, the voice preview: `City.caption`). Held for her voice + 0.9 s or the time to read it, whichever is
     longer, 12 s at most; gone at once when her voice is stopped (`mvStop` calls `City.hush`). It moves below a call,
     the flight box or the island when they're in the way (beside the side sheet or a call on a laptop). Taps go through
     it; a hidden polite node reads it out once, only when the strip takes over. The speaking signal
     `CityApp.saying()` (`{ id, playing, left }` or null) is read off the audio clock and the context's state, so it
     can't stick; a clip whose context won't wake within 0.8 s is dropped, not played late on the next tap. A call's
     last word waits for her voice (3.4 s at least, 5.6 s at most). Test hooks `City._.cap()`. Test t89.
   - **Changing a line:** edit `L` and `JA` in mira.js, run `all` again (only changed lines are made), `kvfile`, upload,
     bump `MV.v`.
