const CACHE_NAME = 'refit-shell-v102-lesson-voice-20261121-premium-20261120';
const SHELL_ASSETS = [
  './pacefit-services-core.js?v=20261117-services-1',
  './pacefit-services.js?v=20261117-services-1',
  './pacefit-services.css?v=20261117-services-1',
  './pacefit-depth.css?v=20261120-1',
  './navigation.css?v=20261120-nav-template-1',
  './pacefit-premium.css?v=20261120-premium-4',
  './profile-onboarding.js?v=20261120-1',
  './pacefit-ui-details.js?v=20261117-services-1',
  './prototype-planners.js?v=20261117-services-1',
  './assets/ui-3d-web/body-area.png',
  './assets/ui-3d-web/exercise-search.png',
  './assets/ui-3d-web/journal.png',
  './assets/ui-3d-web/nutrition.png',
  './assets/ui-3d-web/pose-check.png',
  './assets/ui-3d-web/profile.png',
  './assets/ui-3d-web/workout-log.png',
  './assets/ui-3d-web/workout-start.png',
  './',
  './index.html',
  './lesson-journal.css?v=20261116-lesson-1',
  './lesson-journal-core.js?v=20261116-lesson-1',
  './lesson-journal-store.js?v=20261116-lesson-1',
  './lesson-journal-ui.js?v=20261116-lesson-1',
  './pacefit-prototype.css?v=20261116-prototype-1',
  './record-period.js?v=20261118-trainer-records-all-1',
  './assets/fonts/suit/SUIT-Regular.ttf',
  './assets/fonts/suit/SUIT-Bold.ttf',
  './privacy.html',
  './manifest.webmanifest',
  './pwa-register.js',
  './backend-config.js?v=20261114-food-search-1',
  './member-insights.css?v=20261120-monthly-1',
  './member-insights.js?v=20261120-monthly-1',
  './body-records.js?v=20261116-prototype-1',
  './account.js?v=20261120-signup-mail-1',
  './operator-dashboard.js?v=20261113-raw-sync-1',
  './voice-journal.js?v=20261121-lesson-voice-1',
  './diet-journal.js?v=20261120-records-1',
  './diet-journal.css',
  './docs/diet-guidance.md',
  './assets/diet/grain.svg',
  './assets/diet/protein.svg',
  './assets/diet/vegetable.svg',
  './assets/diet/fruit.svg',
  './assets/diet/seafood.svg',
  './assets/diet/dairy.svg',
  './routine-by-part.js?v=20261120-ui-1',
  './workout-enhancements.js?v=20261120-records-3',
  './calorie-estimate.js',
  './docs/운동-칼로리-추정-근거.md',
  './trainer-workspace.css?v=20261116-prototype-1',
  './trainer-workspace.js?v=20261119-trainer-workspace-2',
  './trainer.js?v=20261120-nav-template-1',
  './trainer-plans.js?v=20261105-plans-2',
  './pose-check.js?v=18',
  './data/burnfit-library.js',
  './exercise-library-ui.js?v=20261118-area-art-audit-1',
  './exercise-art-data.js',
  './exercise-art-lower-1.js',
  './exercise-art-lower-2.js',
  './exercise-art-lower-3.js',
  './exercise-visuals.js?v=20261119-consistent-art-1',
  './assets/exercises/pacefit-area-chest-v2.jpg',
  './assets/exercises/pacefit-area-back-v2.jpg',
  './assets/exercises/pacefit-area-shoulders-v2.jpg',
  './assets/exercises/pacefit-area-arms-v2.jpg',
  './assets/exercises/pacefit-area-legs-v2.jpg',
  './assets/exercises/pacefit-area-core-v2.jpg',
  './assets/exercises/pacefit-area-whole-body-v2.jpg',
  './supabase/schema.sql',
  './supabase/diet.sql',
  './supabase/README.md',
  './assets/brand/facefit-logo-web.png',
  './assets/brand/facefit-logo-social.png',
  './assets/pwa/icon-192.png',
  './assets/pwa/icon-512.png',
  './assets/pwa/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS.map(asset => new Request(new URL(asset, self.location.href), { cache: 'reload' }))))
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
      const freshUI = request.mode === 'navigate' || /\.(css|js|html)$/.test(new URL(request.url).pathname);
      const response = await fetch(request, freshUI ? { cache: 'no-cache' } : undefined);
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







