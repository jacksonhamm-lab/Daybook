// Static Daybook files are served straight from assets. Anything not found there
// (i.e. /workout/...) lands here and is proxied from the workout app's repo, so
// pushing to Jackson-Workout-Plan updates /workout/ with no redeploy.
const WORKOUT_SRC = 'https://raw.githubusercontent.com/jacksonhamm-lab/Jackson-Workout-Plan/main/';
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json', webmanifest: 'application/manifest+json', png: 'image/png', svg: 'image/svg+xml', ico: 'image/x-icon' };

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/state') return syncApi(request, env);
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
