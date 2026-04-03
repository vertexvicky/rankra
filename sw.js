/* ── Master toggle — set false to disable SW during local dev/testing ── */
const SW_ENABLED = true;

const CACHE_NAME = 'tnea-cutoff-v1';
const DATA_FILES = [
  './assets/2020.json',
  './assets/2021.json',
  './assets/2022.json',
  './assets/2023.json',
  './assets/2024.json',
  './assets/2025.json',
];
const STATIC_FILES = [
  './',
  './index.html',
  './style.css',
  './script.js',
];

self.addEventListener('install', (event) => {
  if (!SW_ENABLED) { self.skipWaiting(); return; }
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache static files first (must succeed)
      await cache.addAll(STATIC_FILES);
      // Cache data files one by one, send progress to clients
      for (let i = 0; i < DATA_FILES.length; i++) {
        await cache.add(DATA_FILES[i]);
        self.clients.matchAll().then(clients => {
          clients.forEach(c => c.postMessage({
            type: 'CACHE_PROGRESS',
            loaded: i + 1,
            total: DATA_FILES.length
          }));
        });
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  if (!SW_ENABLED) { self.clients.claim(); return; }
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (!SW_ENABLED) return; // bypass all caching in dev mode

  // Never cache update.json — it must always come from the network
  if (event.request.url.includes('/api/update.json')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cache successful responses
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      });
    })
  );
});
