// Static Daybook files are served straight from assets. Anything not found there
// (i.e. /workout/...) lands here and is proxied from the workout app's repo, so
// pushing to Jackson-Workout-Plan updates /workout/ with no redeploy.
const WORKOUT_SRC = 'https://raw.githubusercontent.com/jacksonhamm-lab/Jackson-Workout-Plan/main/';
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json', webmanifest: 'application/manifest+json', png: 'image/png', svg: 'image/svg+xml', ico: 'image/x-icon' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
