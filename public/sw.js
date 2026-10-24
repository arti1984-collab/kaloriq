/* Kaloriq Service Worker – App-Shell offline verfuegbar. */
const VERSION = 'kaloriq-v29';
const SHELL = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/js/store.js',
  '/js/version.js',
  '/js/i18n.js',
  '/js/calc.js',
  '/js/foods.js',
  '/js/ai.js',
  '/js/ui.js',
  '/js/steps.js',
  '/js/recipes.js',
  '/js/pause.js',
  '/js/checkin.js',
  '/js/wins.js',
  '/js/views/onboarding.js',
  '/js/views/diary.js',
  '/js/views/add.js',
  '/js/views/progress.js',
  '/js/views/fasting.js',
  '/js/views/profile.js',
  '/js/views/recipes.js',
  '/vendor/zxing.min.js',
  '/manifest.webmanifest',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Externe APIs (Gemini, Open Food Facts) nie cachen.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith(serve(request));
});

/**
 * Netz zuerst (Updates kommen sofort an), Cache als Fallback.
 *
 * Wichtig: Auch eine Fehlerantwort (z. B. 502/503, wenn der Server oder ein
 * Tunnel gerade nicht läuft) zählt als "nicht erreichbar" – sonst würde die
 * installierte App eine Fehlerseite anzeigen, obwohl alles offline gecacht ist.
 */
async function serve(request) {
  const cache = await caches.open(VERSION);
  const isNavigation = request.mode === 'navigate';

  const fromCache = async () => {
    const hit = await cache.match(request, { ignoreSearch: isNavigation });
    if (hit) return hit;
    if (isNavigation) {
      const shell = await cache.match('/index.html');
      if (shell) return shell;
    }
    return null;
  };

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
      return response;
    }
    const cached = await fromCache();
    return cached || response;
  } catch {
    const cached = await fromCache();
    return cached || Response.error();
  }
}
