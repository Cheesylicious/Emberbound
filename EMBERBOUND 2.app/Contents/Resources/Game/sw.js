const CACHE = "emberbound-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./manifest.webmanifest",
  "./assets/app-icon.png",
  "./assets/title-world.png",
  "./assets/battle-observatory.png",
  "./assets/maps/dawnrest.png",
  "./assets/maps/verdant.png",
  "./assets/maps/ember-cave.png",
  "./assets/maps/skyreach.png",
  "./assets/sprites/soren-sheet.png",
  "./assets/sprites/nyra-sheet.png",
  "./assets/sprites/torren-sheet.png",
  "./assets/sprites/kite-sheet.png",
  "./assets/sprites/common-enemies.png",
  "./assets/sprites/mid-enemies.png",
  "./assets/sprites/bosses.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});
