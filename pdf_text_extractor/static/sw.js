const CACHE_NAME    = "nexhire-v28";
const STATIC_ASSETS = [
  "/",
  "/static/app.js",
  "/static/styles.css",
  "/static/connectors.js",
  "/static/icons/icon.svg",
  "/static/manifest.json",
];

// ── Install : mise en cache des assets statiques ──────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate : suppression des anciens caches ─────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch : stratégie selon le type de ressource ─────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls → network-first, pas de cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "Hors ligne — réessayez dans un instant." }),
          { status: 503, headers: { "Content-Type": "application/json" } })
      )
    );
    return;
  }

  // Assets statiques → cache-first, fallback network
  if (
    url.pathname.startsWith("/static/") ||
    url.pathname === "/" ||
    url.pathname === "/index.html"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return resp;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // Tout le reste → network avec fallback sur la page d'accueil (SPA)
  event.respondWith(
    fetch(request).catch(() => caches.match("/"))
  );
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: "NexHire", body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || "NexHire", {
      body:    data.body  || "",
      icon:    "/static/icons/icon-192.png",
      badge:   "/static/icons/icon-96.png",
      tag:     data.tag   || "nexhire",
      data:    { url: data.url || "/" },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
