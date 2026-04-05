const CACHE_NAME = "ac-wisdom-v3";

self.addEventListener("install", (e) => {
  // Force immediate activation (don't wait for old SW to die)
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  // Take control immediately + delete ALL old caches
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Network-first: always get fresh files, cache as backup
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
