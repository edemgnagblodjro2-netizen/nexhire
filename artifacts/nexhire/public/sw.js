const CACHE = 'nexhire-v64';
const PRECACHE = [
  '/nexhire/',
  '/nexhire/css/main.css?v=20260525m',
  '/nexhire/js/app.js?v=20260526c',
  '/nexhire/img/hero-bg1.jpg',
  '/nexhire/img/hero-bg2.jpg',
  '/nexhire/img/hero-bg3.jpg',
  '/nexhire/img/team-bento.jpg',
  '/nexhire/favicon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Skip non-HTTP schemes (chrome-extension:, blob:, data:, etc.)
  if (!e.request.url.startsWith('http')) return;
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/nexhire/api/')) return;
  // Network-first: try network, cache on success, fall back to cache
  e.respondWith(
    (async () => {
      try {
        const r = await fetch(e.request);
        if (r && r.status === 200) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return r;
      } catch (_) {
        const cached = await caches.match(e.request);
        return cached || new Response('', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});

self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'Nexhire', {
      body: data.body || '',
      icon: '/nexhire/img/icon-192.png',
      badge: '/nexhire/img/icon-192.png',
      data: { url: data.url || '/nexhire/' },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url));
});
