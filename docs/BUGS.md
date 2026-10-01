# Bugs

Known problems, what causes them, and status. Newest at the top of each section.

## Open

_None right now. Add new ones here with what you did, what happened, and on which device._

## Fixed

### 1. Sheets are hard to slide closed (2026-09-30)
- **Cause:** a sheet could only be dragged by its handle bar, a 42×5px target. If the
  browser took over the touch (to scroll), the drag was never ended, so the sheet could
  stick half-closed. Closing only counted distance, not a quick flick.
- **Fix:** drag down from anywhere on the sheet while it's scrolled to the top, or from
  the handle any time. A quick flick closes it too. A cancelled touch snaps it back.

### 2. Scrolling doesn't start from the bottom of the screen (2026-09-30)
- **Cause:** the tab wheel covered a full-width band along the bottom of the screen
  (about 140px) and blocked all touch gestures there, even over its see-through corners.
- **Fix:** only the wheel's visible parts catch touches, and vertical swipes on it now
  scroll the page. Sideways drags still turn the wheel.

### 3. Scrolling can set off a tap (2026-09-30)
- **Cause:** the fast-double-tap guard (which stops iOS zooming) treated any touch that
  ended within 350ms of the previous one as a tap, and clicked whatever was under the
  finger. The end of a quick scroll could open or tick something.
- **Fix:** it only fires for a touch that didn't move.

### 4. The page can pan sideways for a moment (2026-09-30)
- **Cause:** when a tile opens, the others slide into place, and while they slide they
  poke past the right edge. iPhone Safari ignores `overflow-x: hidden` on `body`, so the
  page could wobble sideways.
- **Fix:** content is clipped horizontally with `overflow-x: clip`, which Safari
  respects.

### 5. The page behind a sheet scrolls, and closing can jump (2026-09-30)
- **Cause:** iPhone doesn't honour `overflow: hidden` on `body`, so swipes on a sheet's
  edges scrolled the page underneath.
- **Fix:** the page is pinned in place while a sheet is open and returned to the exact
  scroll position when it closes.

### 6. The tab wheel rides up over the keyboard (2026-09-30)
- **Cause:** on iPhone, fixed bars move above the keyboard and cover the field you're
  typing in near the bottom.
- **Fix:** the wheel hides while a text field has focus.

## Watch list

- Opening a tile scrolls it into view; if you're scrolling at the same moment it can
  feel like a fight. Revisit when the navigation is redesigned (see NAV.md).
- Typing a task into a day's add box drops it straight onto that day, while Quick add
  asks questions first. Two behaviours for one action.

## Audit (2026-09-30), fixed

- **Stacked render loops.** `size()` drew a frame directly while one was already pending, so
  every re-render added another 3D loop (the scene drew N times per frame). Now it cancels
  the pending frame first.
- **Hidden Dex window kept drawing.** Opacity 0 isn't "out of view"; the renderer now goes back
  to the hidden stage when the window hides.
- **Number keys:** `6` threw after Notes left the tabs; keys now map to the pages that exist.
- **Browser back:** going home (‹, Escape, drag, the Dex window) now pops the page's history
  entry; a back press during a transition is retried, not lost.
- **+2h reminders:** sends are keyed on task + time, so a moved reminder fires at its new time;
  +2h late at night moves it to tomorrow instead of wrapping to 1am today.
- **Sync race:** an edit made while a sync is in flight is merged back and synced next, not
  overwritten.
- **Service worker:** models live in their own cache and a new version replaces the old file;
  error responses no longer overwrite the offline copy.
- Smaller: Home no longer builds eight modules it throws away; Notes→Plan migration moved into
  `load()`; pages shrink back into the chip that opened them; every particle pool rescales with
  the canvas; per-frame allocations removed from `fists()` and particle loops; worker
  `paySubmitDays` default and `sent.last` pruning; aria-labels on the avatar/level buttons; focus
  moves to the page's back button.

Still worth watching on the phone: backdrop blur on the chips and the grain overlay sit on top of
a 60fps canvas; check Safari's profiler if the scene ever feels heavy.

## Audit 2 (Oct 1)

- **Sync:** state moved from KV to a Durable Object (KV served stale copies to the other device,
  which then overwrote newer changes); idle syncs no longer write; a pending change flushes when
  the app is backgrounded; clock-in syncs; the laptop no longer un-ticks workouts done on the phone.
- **Service worker never installed:** the manifest and app icons had been deleted, so precaching
  failed (no offline copy, notifications couldn't turn on). Restored.
- **Pay period off by one** on cut-off Thursdays across a DST change (day count wasn't rounded).
- **Quick-add tasks weren't saved**; custom time/date in the compose card filed the task on the
  first wheel tick (now Next/Add moves on).
- **Subscription hours box** wrote to the wrong key and snapped back.
- **"Clock in again"** replaced the day's first stint; it now extends the shift (gap = break).
  Over 14h on the clock asks before logging.
- **+2h on a repeating task** changed its reminder for good; now it's a one-day `snooze` (client
  `remAt()`, worker `at()`).
- Wishlist → Applied counts from the day you applied; wishlist jobs give no XP.
- Restoring an older backup no longer crashes (missing keys backfilled in `load()`), and restores
  the workout app's state.
- Dex's window no longer covers the bottom of pages or floats over the keyboard.
- A failed outfit load waits a minute before retrying (was every frame).
- Left open overnight or past a reminder, the app catches up once a minute.
- Smaller: phone sheets slide closed; Export uses the share sheet on iPhone; a job's link icon
  doesn't also open the job; closing a sheet mid-edit can't throw; compose chips and small
  buttons are bigger.
- Not fixed: the session sheet for a past week shows this week's ticks (the workout app only
  keeps the current week).
