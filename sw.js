const CACHE_NAME = 'refit-shell-v41';
const SHELL_ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './manifest.webmanifest',
  './pwa-register.js',
  './backend-config.js?v=20261105-login-id-3',
  './account.js?v=20261105-login-id-4',
  './operator-dashboard.js?v=20261105-plans-1',
  './voice-journal.js',
  './diet-journal.js?v=2',
  './diet-journal.css',
  './routine-by-part.js?v=20261105-plans-2',
  './workout-enhancements.js',
  './calorie-estimate.js',
  './docs/운동-칼로리-추정-근거.md',
  './trainer.js?v=20261105-trainer-2',
  './trainer-plans.js?v=20261105-plans-1',
  './pose-check.js?v=17',
  './data/burnfit-library.js',
  './exercise-library-ui.js',
  './exercise-visuals.js',
  './assets/exercises/pacefit-area-chest.jpg',
  './assets/exercises/pacefit-area-back.jpg',
  './assets/exercises/pacefit-area-shoulders.jpg',
  './assets/exercises/pacefit-area-arms.jpg',
  './assets/exercises/pacefit-area-legs.jpg',
  './assets/exercises/pacefit-area-core.jpg',
  './assets/exercises/pacefit-barbell-bench-press.jpg',
  './assets/exercises/pacefit-conventional-deadlift.jpg',
  './assets/exercises/pacefit-overhead-press.jpg',
  './assets/exercises/pacefit-barbell-back-squat.jpg',
  './assets/exercises/pacefit-pull-up.jpg',
  './assets/exercises/pacefit-lunge.jpg',
  './assets/exercises/pacefit-barbell-curl.jpg',
  './assets/exercises/pacefit-area-whole-body.jpg',
  './assets/exercises/pacefit-barbell-row.jpg',
  './assets/exercises/bodyweight-squat.jpg',
  './supabase/schema.sql',
  './supabase/diet.sql',
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

