/**
 * Service worker.
 *
 * Strategia doppia:
 *  - guscio dell'app (HTML/CSS/JS/icone): cache-first, cosi' l'app apre
 *    istantaneamente e funziona anche offline;
 *  - `data/offers.json`: network-first con ricaduta sulla cache, perche' le
 *    offerte del giorno devono essere fresche quando c'e' rete, ma restare
 *    consultabili quando non c'e'.
 */

const VERSION = 'v1';
const SHELL_CACHE = `toh-shell-${VERSION}`;
const DATA_CACHE = `toh-data-${VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './web/manifest.webmanifest',
  './web/assets/css/style.css',
  './web/assets/js/app.js',
  './web/assets/js/render.js',
  './web/assets/js/filters.js',
  './web/assets/js/format.js',
  './web/assets/icons/icon.svg',
  './web/assets/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // `addAll` fallisce in blocco se manca un file: qui preferiamo
      // installare comunque il service worker.
      .then((cache) => Promise.allSettled(SHELL_ASSETS.map((asset) => cache.add(asset))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('toh-') && key !== SHELL_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/offers.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}
