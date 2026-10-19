const CACHE_NAME = "genesis-app-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/logo.jpeg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shellResponse = await fetch("/");
    if (!shellResponse.ok) throw new Error("No se pudo precargar la aplicación.");
    const shellHtml = await shellResponse.clone().text();
    await cache.put("/", shellResponse);
    await cache.addAll(APP_SHELL.slice(1));

    const assetPattern = /["'`]((?:\/|\.{1,2}\/)[^"'`?#]+\.(?:js|css)(?:\?[^"'`]*)?)["'`]/g;
    const pending = new Set();
    for (const match of shellHtml.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)) {
      pending.add(new URL(match[1], self.location.origin).href);
    }

    const cached = new Set();
    while (pending.size > 0) {
      const assetUrl = pending.values().next().value;
      pending.delete(assetUrl);
      if (cached.has(assetUrl)) continue;
      const url = new URL(assetUrl);
      if (url.origin !== self.location.origin) continue;

      const response = await fetch(url.href);
      if (!response.ok) throw new Error(`No se pudo precargar el recurso ${url.pathname}.`);
      const content = await response.clone().text();
      await cache.put(url.href, response);
      cached.add(url.href);

      if (url.pathname.endsWith(".js")) {
        for (const match of content.matchAll(assetPattern)) {
          const dependency = new URL(match[1], url.href);
          if (dependency.origin === self.location.origin && !cached.has(dependency.href)) {
            pending.add(dependency.href);
          }
        }
      }
    }
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("genesis-app-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match("/");
          return cached ?? Response.error();
        })
    );
    return;
  }

  if (!["script", "style", "image", "font"].includes(request.destination)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkRequest = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? networkRequest;
    })
  );
});
