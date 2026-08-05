/* sw.js — offline cache-then-network service worker.
   v2: precaching is now fault-tolerant — cache.addAll() is atomic (one bad
   request fails the WHOLE cache silently), which is very likely why offline
   wasn't working. Each file is now cached individually with allSettled, and
   navigation requests fall back explicitly to index.html when offline. */
const CACHE_NAME = 'sltc-shell-v2';
const SHELL_FILES = [
  './index.html',
  './styles.css',
  './utils.js',
  './storage.js',
  './holiday.js',
  './scenario.js',
  './season.js',
  './export.js',
  './ai.js',
  './app.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        SHELL_FILES.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => { if(res.ok) return cache.put(url, res); })
            .catch(() => {}) // one file failing must never block the rest
        )
      )
    )
  );
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', (e) => {
  if(e.request.method !== 'GET') return;

  // Full-page navigations (opening the app / Add-to-Home-Screen launch):
  // try the network, but fall back to the precached index.html when offline,
  // regardless of the exact URL requested (avoids '/' vs 'index.html' mismatches).
  if(e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else: network-first, cache as a copy, fall back to cache offline.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if(res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy)).catch(()=>{});
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
