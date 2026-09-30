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

These can be combined. **Decision:** pending.
