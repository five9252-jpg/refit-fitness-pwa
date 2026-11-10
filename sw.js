const CACHE_NAME = 'refit-shell-v50';
const SHELL_ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './manifest.webmanifest',
  './pwa-register.js',
  './backend-config.js?v=20261105-login-id-3',
  './account.js?v=20261106-status-bottom-1',
  './operator-dashboard.js?v=20261105-plans-1',
  './voice-journal.js',
  './diet-journal.js?v=20261106-food-icons-1',
  './diet-journal.css',
  './docs/diet-guidance.md',
  './assets/diet/grain.svg',
  './assets/diet/protein.svg',
  './assets/diet/vegetable.svg',
  './assets/diet/fruit.svg',
  './assets/diet/seafood.svg',
  './assets/diet/dairy.svg',
  './routine-by-part.js?v=20261105-plans-3',
  './workout-enhancements.js?v=20261106-journal-1',
  './calorie-estimate.js',
  './docs/운동-칼로리-추정-근거.md',
  './trainer.js?v=20261105-trainer-2',
  './trainer-plans.js?v=20261105-plans-2',
  './pose-check.js?v=18',
  './data/burnfit-library.js',
  './exercise-library-ui.js',
  './exercise-visuals.js',
  './assets/exercises/pacefit-area-chest.jpg',
  './assets/exercises/pacefit-area-back.jpg',
  './assets/exercises/pacefit-area-shoulders.jpg',
  './assets/exercises/pacefit-area-arms.jpg',
  './assets/exercises/pacefit-area-legs.jpg',
  './assets/exercises/pacefit-area-core.jpg',
  './assets/exercises/pacefit-area-whole-body.jpg',
  './supabase/schema.sql',
  './supabase/diet.sql',
  './supabase/README.md',
  './assets/pwa/icon.svg',
  './assets/pwa/icon-192.png',
  './assets/pwa/icon-512.png',
  './assets/pwa/apple-touch-icon.png',
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



