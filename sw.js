const CACHE_NAME = 'refit-shell-v12';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './pwa-register.js',
  './backend-config.js',
  './account.js',
  './supabase/schema.sql',
  './supabase/README.md',
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
  './assets/exercises/bent-over-lateral-raise.jpg',
  './assets/exercises/dumbbell-fly.jpg',
  './assets/exercises/face-pull.jpg',
  './assets/exercises/heel-elevated-goblet-squat.jpg',
  './assets/exercises/hip-abduction-machine.jpg',
  './assets/exercises/triceps-pushdown.jpg',
  './assets/exercises/shoulder-press.jpg',
  './assets/exercises/chest-press-v2.png',
  './assets/exercises/lat-pulldown-v2.png',
  './assets/exercises/seated-row-v2.png',
  './assets/exercises/leg-press-v2.png',
  './assets/exercises/leg-curl-v2.png',
  './assets/exercises/leg-extension-v2.png',
  './assets/exercises/shoulder-press-v2.png',
  './assets/exercises/biceps-curl-v2.png',
  './assets/exercises/glute-press-v2.png',
  './assets/exercises/lateral-raise-v2.png',
  './assets/exercises/calf-raise-v2.png',
  './assets/exercises/high-back-row-v2.png',
  './assets/exercises/incline-dumbbell-press-v2.png',
  './assets/exercises/dumbbell-hip-hinge-v2.png',
  './assets/exercises/bent-over-lateral-raise-v2.png',
  './assets/exercises/face-pull-v2.png',
  './assets/exercises/dumbbell-fly-v2.png',
  './assets/exercises/hip-abduction-machine-v2.png',
  './assets/exercises/heel-elevated-goblet-squat-v2.png',
  './assets/exercises/triceps-pushdown-v2.png',
  './assets/exercises/dumbbell-chest-press.jpg',
  './assets/exercises/one-arm-dumbbell-row.jpg',
  './assets/exercises/dumbbell-step-up.jpg',
  './assets/exercises/dumbbell-front-raise.jpg',
  './assets/exercises/hammer-curl.jpg',
  './assets/exercises/dumbbell-triceps-kickback.jpg',
  './assets/exercises/dumbbell-side-lunge.jpg',
  './assets/exercises/farmers-carry.jpg'
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
