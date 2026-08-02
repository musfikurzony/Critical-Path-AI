/* sw.js — minimal offline cache-then-network service worker */
const CACHE_NAME = 'sltc-shell-v1';
const SHELL_FILES = [
  './',
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
  './manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES).catch(()=>{})));
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy)).catch(()=>{});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
