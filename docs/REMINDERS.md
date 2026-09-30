# Reminders

## Now

- A task can have a reminder time. The Worker checks every minute (cron) in the saved
  timezone and sends a Web Push notification.
- Notifications have **Done** and **Tomorrow** buttons that update the task directly.
- Reminders that went by while a task is still open show in the **Needs a decision**
  tile on Today, so nothing gets silently dismissed.
- Optional morning rundown at a set time.
- iPhone needs the home-screen app and permission once per device.

## What Jackson wants

- Behave like Apple Reminders: stay at the top of the screen and not get buried under
  other notifications.

## The limit

- Web apps on iPhone can't pin a notification or mark it time-sensitive. Once it's in
  Notification Centre it gets buried like any other.

## Options

1. **Send tasks into Apple Reminders.** The Worker writes each reminder task to iCloud
   Reminders over CalDAV, so they're real Apple reminders (persistent, time-sensitive,
   on the lock screen). Needs an Apple app-specific password stored as a Worker
   secret. Ticking one off would need to sync back.
2. **Nag mode.** Re-send every N minutes until Done or Tomorrow is tapped.
3. **Badge.** Show the open-reminder count on the app icon (supported for home-screen
   apps since iOS 16.4).

**Decision (2026-09-30): nag mode + badge.** Apple Reminders over CalDAV would need his iCloud
app-specific password (he has to set that up himself; not done). An .ics feed can't help:
iOS strips alarms from subscribed calendars.

- **Nag mode:** Settings → Reminders → "Keep reminding until it's done" (off / every 2 hours /
  every 4 hours, saved as `settings.nag` in minutes; default 4 hours, his call). The cron re-sends an open reminder every N minutes with
  the same tag (replaces the last one and alerts again) until Done or Tomorrow, stopping at
  10:30pm. `sent.last[taskId]` holds when it last went out.
- **Badge:** every reminder push carries the open count; the service worker sets the app
  icon badge, and the app keeps it right whenever it renders.
- Tested with a simulated cron: fires at the time, nags on the interval, stops once done.
