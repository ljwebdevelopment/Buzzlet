/*
  Buzzlet Service Worker System
  - Caches core assets for offline-friendly loading.
*/

const CACHE_NAME = "buzzlet-v1";
const ASSETS = [
  "/",
  "/html/index.html",
  "/html/town.html",
  "/html/national.html",
  "/html/profile.html",
  "/html/groups.html",
  "/html/messages.html",
  "/html/admin.html",
  "/css/styles.css",
  "/js/firebase.js",
  "/js/auth.js",
  "/js/app.js",
  "/js/town.js",
  "/js/national.js",
  "/js/profile.js",
  "/js/groups.js",
  "/js/messages.js",
  "/js/admin.js",
  "/js/utils.js",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
