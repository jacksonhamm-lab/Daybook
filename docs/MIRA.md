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
2. **M2 Caller and reactions.** Reminders and decisions ring as her (his own ring); pick up and she reads it.
   A cheer when the list clears, a word on a new benchmark best, an evening nudge if training isn't done. Where she
   stands follows his day (at the door while he's on the clock, asleep after 11).
3. **M3 Everywhere.** A small holo call of her in the gym (rest countdown), the castle (keeps the study clock), the
   shop (clock-in). "Tell Mira": plain words become a note or a task.
4. **M4 Closeness.** LINK only grows (streaks, finished lists, sessions, study). Levels unlock poses, outfits,
   apartment things and evening spots. Outfits need new models (his call on how).
5. **V Voice.** ElevenLabs: a voice designed from a description (not a copy of anyone). A script he runs with his
   own key generates one clip per line id; clips live in KV, never in the repo. Only `say` text is sent.
