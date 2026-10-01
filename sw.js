// Network-first so a new deploy shows up on the next open; cache is only the offline fallback.
const CACHE = 'daybook-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'daybook-models').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.includes('/api/')) return;   // live data is never cached
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', location).pathname)) return;
  // Dex's models are big and only change with a new ?v=, so serve them from the cache first
  if (url.pathname.includes('/models/')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      // models get their own cache, and a new version replaces the old file instead of piling up
      if (res.ok) { const copy = res.clone(); caches.open('daybook-models').then(async c => { for (const k of await c.keys()) if (new URL(k.url).pathname === url.pathname) await c.delete(k); await c.put(e.request, copy); }); }
      return res;
    })));
    return;
  }
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }   // never replace a good offline copy with an error
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

// Push notifications. iOS requires a visible notification for every push event.
// The sync code, stashed by the page so the worker can act on notification buttons.
function readCode() {
  return new Promise(resolve => {
    const req = indexedDB.open('daybook', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) return resolve('');
      const get = db.transaction('kv', 'readonly').objectStore('kv').get('code');
      get.onsuccess = () => resolve(get.result || '');
      get.onerror = () => resolve('');
    };
    req.onerror = () => resolve('');
  });
}

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Daybook', body: e.data ? e.data.text() : 'Reminder' }; }
  // open reminders on the app icon (home-screen apps, iOS 16.4+)
  if (typeof d.badge === 'number' && self.navigator.setAppBadge) (d.badge ? self.navigator.setAppBadge(d.badge) : self.navigator.clearAppBadge()).catch(() => {});
  e.waitUntil(self.registration.showNotification(d.title || 'Daybook', {
    body: d.body || '',
    tag: d.tag || 'daybook',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: { url: d.url || './', id: d.id || '', date: d.date || '' },
    renotify: true,
    actions: d.id ? [{ action: 'done', title: 'Done' }, { action: 'snooze', title: 'Tomorrow' }] : [],
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const info = e.notification.data || {};
  // "Done" and "Tomorrow" act straight from the notification and update the app.
  if ((e.action === 'done' || e.action === 'snooze') && info.id) {
    e.waitUntil((async () => {
      const code = await readCode();
      if (!code) return;
      await fetch('./api/reminder', {
        method: 'POST',
        headers: { 'x-sync-key': code, 'content-type': 'application/json' },
        body: JSON.stringify({ id: info.id, date: info.date, action: e.action }),
      }).catch(() => {});
      const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      list.forEach(c => c.postMessage({ type: 'reminder-acted' }));
    })());
    return;
  }
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.location.href).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus();
    return clients.openWindow(target);
  }));
});
