// Static Daybook files are served straight from assets. Anything not found there
// (i.e. /workout/...) lands here and is proxied from the workout app's repo, so
// pushing to Jackson-Workout-Plan updates /workout/ with no redeploy.
const WORKOUT_SRC = 'https://raw.githubusercontent.com/jacksonhamm-lab/Jackson-Workout-Plan/main/';
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json', webmanifest: 'application/manifest+json', png: 'image/png', svg: 'image/svg+xml', ico: 'image/x-icon' };

import { sendPush } from './push.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Sync store: one JSON blob per sync code, keyed by the hash of the code so the
// code itself is never written down. SYNC_KEYS (a secret) lists the allowed hashes.
async function syncApi(request, env) {
  const code = request.headers.get('x-sync-key') || '';
  if (!code || code.length < 16) return json({ error: 'missing code' }, 401);
  const hash = await sha256(code);
  const allowed = (env.SYNC_KEYS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.includes(hash)) return json({ error: 'unknown code' }, 401);
  const id = 'state:' + hash;

  if (request.method === 'GET') {
    const raw = await env.SYNC.get(id);
    return json(raw ? JSON.parse(raw) : { rev: 0, data: null });
  }
  if (request.method === 'PUT') {
    const body = await request.text();
    if (body.length > 2000000) return json({ error: 'too large' }, 413);
    let data;
    try { data = JSON.parse(body); } catch (e) { return json({ error: 'bad json' }, 400); }
    const raw = await env.SYNC.get(id);
    const rev = raw ? (JSON.parse(raw).rev || 0) : 0;
    const expected = +(request.headers.get('if-match') || 0);
    if (expected !== rev) return json({ error: 'conflict', rev }, 409); // caller re-reads and merges
    const next = { rev: rev + 1, at: Date.now(), data };
    await env.SYNC.put(id, JSON.stringify(next));
    return json({ rev: next.rev, at: next.at });
  }
  return json({ error: 'method not allowed' }, 405);
}

/* ---------------- reminders ----------------
   Every minute the cron reads each synced state, works out what is due in the
   user's own timezone, and pushes it. A per-day "sent" list stops repeats. */

async function auth(request, env) {
  const code = request.headers.get('x-sync-key') || '';
  if (!code || code.length < 16) return null;
  const hash = await sha256(code);
  const allowed = (env.SYNC_KEYS || '').split(',').map(s => s.trim()).filter(Boolean);
  return allowed.includes(hash) ? hash : null;
}

async function pushApi(request, env, url) {
  const hash = await auth(request, env);
  if (!hash) return json({ error: 'unknown code' }, 401);
  const subsKey = 'push:' + hash;
  const subs = (await env.SYNC.get(subsKey, 'json')) || [];

  if (url.pathname === '/api/push/subscribe' && request.method === 'POST') {
    const sub = await request.json();
    if (!sub || !sub.endpoint || !sub.keys) return json({ error: 'bad subscription' }, 400);
    const next = subs.filter(s => s.endpoint !== sub.endpoint);
    next.push({ endpoint: sub.endpoint, keys: sub.keys, added: Date.now() });
    await env.SYNC.put(subsKey, JSON.stringify(next));
    const index = (await env.SYNC.get('subs-index', 'json')) || [];
    if (!index.includes(hash)) await env.SYNC.put('subs-index', JSON.stringify([...index, hash]));
    return json({ ok: true, devices: next.length });
  }
  if (url.pathname === '/api/push/unsubscribe' && request.method === 'POST') {
    const { endpoint } = await request.json();
    await env.SYNC.put(subsKey, JSON.stringify(subs.filter(s => s.endpoint !== endpoint)));
    return json({ ok: true });
  }
  if (url.pathname === '/api/push/test') {
    if (!subs.length) return json({ error: 'no devices registered' }, 400);
    await deliver(hash, subs, { title: 'Daybook', body: 'Reminders are working.', tag: 'test' }, env);
    return json({ ok: true, devices: subs.length });
  }
  return json({ error: 'not found' }, 404);
}

// KV has no compare-and-set, so re-read and retry a couple of times.
async function mutateState(hash, env, fn) {
  for (let i = 0; i < 3; i++) {
    const cur = (await env.SYNC.get('state:' + hash, 'json')) || { rev: 0, data: null };
    if (!cur.data) return false;
    const next = fn(JSON.parse(JSON.stringify(cur.data)));
    if (!next) return false;
    const again = (await env.SYNC.get('state:' + hash, 'json')) || { rev: 0 };
    if ((again.rev || 0) !== (cur.rev || 0)) continue;
    await env.SYNC.put('state:' + hash, JSON.stringify({ rev: (cur.rev || 0) + 1, at: Date.now(), data: next }));
    return true;
  }
  return false;
}

async function reminderApi(request, env) {
  const hash = await auth(request, env);
  if (!hash) return json({ error: 'unknown code' }, 401);
  const { id, action, date } = await request.json();
  const day = date || localNow('UTC').date;
  const ok = await mutateState(hash, env, S => {
    const t = (S.tasks || []).find(x => x.id === id);
    if (!t) return null;
    t.u = Date.now();
    if (action === 'done') {
      if (t.repeat) { t.doneOn = t.doneOn || {}; t.doneOn[day] = true; } else t.done = true;
    } else if (action === 'snooze') {
      const d = new Date(day + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      t.date = d.toISOString().slice(0, 10);
      if (t.repeat) { t.doneOn = t.doneOn || {}; t.doneOn[day] = true; } // today's run is handled
    }
    return S;
  });
  // Let it fire again tomorrow.
  if (ok && action === 'snooze') {
    const sent = (await env.SYNC.get('sent:' + hash, 'json')) || { keys: [] };
    sent.keys = (sent.keys || []).filter(k => k !== 't:' + id);
    await env.SYNC.put('sent:' + hash, JSON.stringify(sent), { expirationTtl: 172800 });
  }
  return json({ ok });
}

async function deliver(hash, subs, payload, env) {
  const dead = await Promise.all(subs.map(s => sendPush(s, payload, env)));
  const alive = subs.filter((s, i) => !dead[i]);
  if (alive.length !== subs.length) await env.SYNC.put('push:' + hash, JSON.stringify(alive));
}

// "now" as the user sees it, e.g. { date: '2026-09-24', hm: '08:05', dow: 3 }
export function localNow(tz) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' })
    .formatToParts(new Date()).reduce((o, p) => (o[p.type] = p.value, o), {});
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hm: `${hour}:${parts.minute}`,
    dow: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday),
  };
}
const dowOf = date => (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7;
export const occursOn = (t, date) => {
  if (!t.repeat) return t.date === date;
  if (t.date && date < t.date) return false;
  const w = dowOf(date), r = t.repeat.t;
  return r === 'daily' || (r === 'weekdays' && w < 5) || (r === 'weekly' && w === t.repeat.dow);
};
const isDone = (t, date) => (t.repeat ? !!(t.doneOn && t.doneOn[date]) : !!t.done);
// Fire on the minute, or up to 10 minutes late if a run was missed.
export const dueNow = (hm, target) => {
  const m = s => (+s.slice(0, 2)) * 60 + (+s.slice(3, 5));
  const diff = m(hm) - m(target);
  return diff >= 0 && diff <= 10;
};

async function runReminders(hash, env) {
  const subs = (await env.SYNC.get('push:' + hash, 'json')) || [];
  if (!subs.length) return;
  const stored = await env.SYNC.get('state:' + hash, 'json');
  const S = stored && stored.data;
  if (!S) return;
  const st = S.settings || {};
  if (st.remindOff) return;
  const tz = st.tz || 'America/Edmonton';
  let now;
  try { now = localNow(tz); } catch (e) { now = localNow('UTC'); }

  const sentKey = 'sent:' + hash;
  const sent = (await env.SYNC.get(sentKey, 'json')) || {};
  if (sent.date !== now.date) { sent.date = now.date; sent.keys = []; }
  const already = k => sent.keys.includes(k);
  const outgoing = [];

  // Morning brief
  if (st.remindDaily && dueNow(now.hm, st.remindAt || '08:00') && !already('brief')) {
    const tasks = (S.tasks || []).filter(t => occursOn(t, now.date) && !isDone(t, now.date));
    const shift = (S.shifts || {})[now.date];
    const wo = (S.workouts || {})[now.date] || {};
    const session = wo.s || (S.template || [])[dowOf(now.date)] || 'REST';
    const bits = [`${tasks.length} task${tasks.length === 1 ? '' : 's'}`];
    if (shift && shift.start && shift.end) bits.push(`shift ${shift.start}–${shift.end}`);
    if (session !== 'REST') bits.push(session + (wo.done ? ' done' : ''));
    outgoing.push({ key: 'brief', payload: { title: 'Today', body: bits.join(' · '), tag: 'brief', url: '/' } });
  }

  // Hours go to Len on the Monday of payday week.
  if (st.remindSubmit !== false && dueNow(now.hm, st.remindAt || '08:00') && !already('submit')) {
    const cyc = Math.max(1, +st.payCycle || 14);
    const anchorMs = Date.parse((st.payAnchor || '2026-09-25') + 'T12:00:00Z');
    const todayMs = Date.parse(now.date + 'T12:00:00Z');
    const gapDays = Math.round((todayMs - anchorMs) / 864e5);
    const send = +st.paySubmitDays ?? 4;
    const untilPayday = ((-gapDays % cyc) + cyc) % cyc; // days from today to the next payday
    if (untilPayday === send) {
      outgoing.push({ key: 'submit', payload: { title: 'Send your hours', body: 'Payday Friday — Len enters them tomorrow', tag: 'submit', url: '/' } });
    }
  }

  // Per-task reminders
  (S.tasks || []).forEach(t => {
    if (!t.remind || !occursOn(t, now.date) || isDone(t, now.date)) return;
    if (!dueNow(now.hm, t.remind) || already('t:' + t.id)) return;
    outgoing.push({ key: 't:' + t.id, payload: { title: t.title, body: 'Due now · swipe for Done or Tomorrow', tag: 't:' + t.id, url: '/', id: t.id, date: now.date } });
  });

  if (!outgoing.length) return;
  for (const item of outgoing) {
    await deliver(hash, subs, item.payload, env);
    sent.keys.push(item.key);
  }
  await env.SYNC.put(sentKey, JSON.stringify(sent), { expirationTtl: 172800 });
}

export default {
  async scheduled(event, env, ctx) {
    const index = (await env.SYNC.get('subs-index', 'json')) || [];
    for (const hash of index) {
      try { await runReminders(hash, env); } catch (e) {}
    }
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/state') return syncApi(request, env);
    if (url.pathname.startsWith('/api/push/')) return pushApi(request, env, url);
    if (url.pathname === '/api/reminder' && request.method === 'POST') return reminderApi(request, env);
    if (url.pathname === '/api/vapid') return json({ key: env.VAPID_PUBLIC || '' });
    if (url.pathname === '/workout') return Response.redirect(`${url.origin}/workout/`, 301);
    if (!url.pathname.startsWith('/workout/')) return env.ASSETS.fetch(request);

    let path = url.pathname.slice('/workout/'.length);
    if (path === '' || path.endsWith('/')) path += 'index.html';
    const res = await fetch(WORKOUT_SRC + path, { cf: { cacheTtl: 60, cacheEverything: true } });
    if (!res.ok) return new Response('Not found', { status: 404 });
    return new Response(res.body, {
      headers: {
        'content-type': TYPES[path.split('.').pop()] || 'application/octet-stream',
        'cache-control': 'no-cache',
        'x-content-type-options': 'nosniff',
      },
    });
  },
};
