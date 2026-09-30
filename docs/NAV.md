# Navigation

## Now

- **Tabs:** Today, Week, Hours, Training, Jobs, Notes, on a looping arc wheel (bottom
  on phones, left edge on wide screens). Drag, scroll or tap a neighbour.
- **Modules:** secondary content sits in tiles that show one number and open in place,
  one at a time per tab.
- **Sheets:** bottom sheets for editing (task, shift, session, job, note, prep book,
  progress, settings). Close by dragging the handle, tapping outside, or Done.
- **Quick add:** the + in the top bar opens Spotlight.

## Where we want to go

- **A few buttons, then depth.** A small top-level menu. Tapping one grows it into the
  full view (the button becomes the page) and closing shrinks it back.
- Transitions should hand one element to the next (shared-element style), not cut.
- Closing anything should be easy: drag down from anywhere on a sheet, not just the
  handle.

## Decision (2026-09-30)

- **Dex's stat chips are the menu.** Home is the Today stage; the six chips around Dex
  open pages. The arc wheel is gone (it was most of the "feels complex").
- **Four pages instead of six tabs:**
  | Page | Old tabs | Opened by |
  |---|---|---|
  | Plan | Week + Notes (notes sit under the week) | Focus |
  | Work | Hours | Grind |
  | Train | Training (cardio, fuel inside) | Strength, Stamina, Fuel |
  | Jobs | Jobs | Hustle |
- **Grow and shrink.** Tapping a chip grows it into the page; going back shrinks the
  page into that chip. Back = the ‹ button, Escape, the browser back, or dragging the
  page down from the top.
- **Home base is always Dex.** He wants no bottom nav and no in-page tab strip: the
  buttons on the scene are the only menu, and exiting a page always returns to him.
  A page shows just a ‹ button and its name.
- **Home is the scene, full screen.** The cards that used to sit under the stage moved to
  the pages that own them: clock in/out is at the top of Work, "needs a decision" at the
  top of Plan, tasks and tomorrow are in Plan, fuel in Train, follow-ups in Jobs. When
  something is live, a pill appears on the scene (on the clock + timer, reminders due).
- **On phones the scene is full bleed:** edge to edge and top to bottom, the header floats over
  it, and the camera fits his height (the scene runs off the sides) so he fills the screen.
- **Dex rides along.** On a page, while you're clocked in, mid-session, or on the Train
  page on a training day, he shows in a small floating window (bottom right) in the
  matching outfit and setting; tap it to go home. `placeDex()` moves the same renderer
  between the stage and the window.
- Transitions run on timers, not animation promises, so navigation can't get stuck if an
  animation stalls.
- Internally the view keys stay `today / week / hours / training / jobs` (`notes` renders
  into `#v-notes` alongside `week`), so old links and code paths still work.
