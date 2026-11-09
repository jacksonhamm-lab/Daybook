/* School's reminders, worked out from the synced state and "now" in his timezone ({ date, hm, dow }, dow 0 = Monday).
   Pure, so it can be tested on its own. Each comes back with a key; the cron sends a key once a day.
   - a paper: 3 days before, and that morning
   - a discussion post: that morning
   - the residency (blended only): 30 days and 7 days out
   - a new course: the day before
   - Sunday evening: a look at the week ahead
   Nothing is sent until School is set up (school.on). */
const addDays = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mins = s => (+s.slice(0, 2)) * 60 + (+s.slice(3, 5));
/* on the minute, or up to 10 minutes late if a run was missed (the same window as every other reminder) */
const dueAt = (hm, target) => { const d = mins(hm) - mins(target); return d >= 0 && d <= 10; };
const hours = s => { if (!s || !/^\d\d:\d\d$/.test(s.start || '') || !/^\d\d:\d\d$/.test(s.end || '')) return 0; let d = mins(s.end) - mins(s.start); if (d < 0) d += 1440; return d / 60; };
const fh = h => String(Math.round(h * 10) / 10);
export const SUNDAY_REVIEW = '19:00';

export function schoolReminders(S, now, morning = '08:00') {
  const sc = S && S.school; if (!sc || !sc.on) return [];
  const out = [], courses = S.courses || [], open = (S.tasks || []).filter(t => t.cat === 'school' && !t.done && t.date);
  const label = id => { const c = id && courses.find(x => x.id === id); return c ? (c.code || c.name || '') : ''; };
  const add = (key, title, body) => out.push({ key, payload: { title, body, tag: key, url: '/' } });
  if (dueAt(now.hm, morning)) {
    const in3 = addDays(now.date, 3);
    for (const t of open) {
      const c = label(t.course), what = (c ? c + ' · ' : '') + t.title;
      if (t.type === 'Paper' && t.date === in3) add('sp3:' + t.id, 'Paper due in 3 days', what);
      if (t.type === 'Paper' && t.date === now.date) add('sp0:' + t.id, 'Paper due today', what);
      if (t.type === 'Discussion post' && t.date === now.date) add('spo:' + t.id, 'Discussion post due today', what);
    }
    const r = sc.res || {}, list = Array.isArray(r.list) ? r.list : [];
    if (sc.stream === 'blended' && r.start) {
      if (r.start === addDays(now.date, 30)) add('sr30:' + r.start, 'Residency in 30 days', 'Time to book the travel.');
      if (r.start === addDays(now.date, 7)) add('sr7:' + r.start, 'Residency in a week', list.length ? `${list.filter(x => x.done).length} of ${list.length} on the list packed.` : 'Make your travel list in the castle.');
    }
    const tmr = addDays(now.date, 1);
    for (const c of courses) if (c.start === tmr) add('sc:' + c.id, 'New course tomorrow', [c.code, c.name].filter(Boolean).join(' · ') || 'A new course starts tomorrow.');
  }
  if (now.dow === 6 && dueAt(now.hm, SUNDAY_REVIEW)) {
    const mon = addDays(now.date, 1), sun = addDays(now.date, 7), next = open.filter(t => t.date >= mon && t.date <= sun), late = open.filter(t => t.date < now.date);
    let h = 0; for (let i = 0; i < 7; i++) { const day = (S.study || {})[addDays(now.date, -i)]; if (day && Array.isArray(day.s)) day.s.forEach(s => { h += hours(s); }); }
    const goal = Math.max(1, +sc.goal || 15);
    add('sweek:' + now.date, 'The week ahead', `${fh(h)} of ${goal}h studied this week · ${next.length} due next week${late.length ? ` · ${late.length} late` : ''}`);
  }
  return out;
}
