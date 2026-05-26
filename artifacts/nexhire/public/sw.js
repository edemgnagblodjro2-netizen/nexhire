const CACHE = 'nexhire-v72';
const VERSIONED = [
  '/nexhire/css/main.css?v=20260526a',
  '/nexhire/js/app.js?v=20260526k',
  '/nexhire/img/hero-bg1.jpg',
  '/nexhire/img/hero-bg2.jpg',
  '/nexhire/img/hero-bg3.jpg',
  '/nexhire/img/team-bento.jpg',
  '/nexhire/favicon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(VERSIONED))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;
  const url = new URL(e.request.url);

  // API calls — never intercept
  if (url.pathname.startsWith('/nexhire/api/')) return;

  // HTML (index.html / root) — ALWAYS network, never cache
  const isHtml = url.pathname === '/nexhire/' || url.pathname === '/nexhire/index.html'
    || url.pathname.endsWith('/') && !url.pathname.includes('.');
  if (isHtml) {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then(r => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // Versioned assets — cache-first (URL contains ?v=)
  if (url.search.includes('v=')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(r => {
          if (r && r.status === 200) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
          }
          return r;
        });
      })
    );
    return;
  }

  // Everything else — network-first, cache fallback
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.status === 200) {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
      }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || new Response('', { status: 503 })))
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
