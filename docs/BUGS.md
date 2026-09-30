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
