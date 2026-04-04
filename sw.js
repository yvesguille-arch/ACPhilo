const CACHE_NAME = "ac-wisdom-v1";

self.addEventListener("install", (e) => {
  // Cache assets relative to service worker scope
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => {
      const base = self.registration.scope;
      return c.addAll([
        base,
        base + "index.html",
        base + "css/style.css",
        base + "js/game.js",
        base + "manifest.json"
      ]);
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});
