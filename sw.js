const CACHE_NAME = 'refit-shell-v2';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './pwa-register.js',
  './assets/pwa/icon.svg',
  './assets/pwa/icon-192.png',
  './assets/pwa/icon-512.png',
  './assets/pwa/apple-touch-icon.png',
  './assets/exercises/biceps-curl.jpg',
  './assets/exercises/calf-raise.jpg',
  './assets/exercises/chest-press.jpg',
  './assets/exercises/dumbbell-hip-hinge.jpg',
  './assets/exercises/glute-press.jpg',
  './assets/exercises/high-back-row.jpg',
  './assets/exercises/incline-dumbbell-press.jpg',
  './assets/exercises/lat-pulldown.jpg',
  './assets/exercises/lateral-raise.jpg',
  './assets/exercises/leg-curl.jpg',
  './assets/exercises/leg-extension.jpg',
  './assets/exercises/leg-press.jpg',
  './assets/exercises/seated-row.jpg',
  './assets/exercises/shoulder-press.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('refit-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        return (await cache.match('./index.html')) || Response.error();
      }
      return Response.error();
    }
  })());
});
