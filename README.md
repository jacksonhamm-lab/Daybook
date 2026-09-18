# Daybook

Work hours, tasks, training and job applications in one place.

Live: https://jacksonhamm-lab.github.io/Daybook/

- **Today**: activity rings for the week, clock in/out, today's session, tasks, follow-ups.
- **Week**: Focus (day tiles) or Board (7 columns). Drag tasks between days.
- **Hours**: shift log, usual-shift presets, copy a weekly summary, 8-week chart.
- **Training**: pulls the program live from [Jackson-Workout-Plan](https://github.com/jacksonhamm-lab/Jackson-Workout-Plan). Set progress, cardio and benchmark logs are shared with the workout app through the same localStorage keys (both apps live on `jacksonhamm-lab.github.io`).
- **Jobs**: application pipeline, link → company autofill, follow-up nudges after 7 days.

Quick add (Ctrl/⌘ K, `/`, `n`, or the + button) understands:

```
call dentist fri
email Len about promo #work
stretch every day #gym
work 9-5 tomorrow 30m break
applied Patagonia - Campaigns Associate
gym done
```

Data is stored in the browser. Use Settings → Export backup to move between devices.

Single `index.html`, no build step. `sw.js` is network-first so deploys show up on the next open.
