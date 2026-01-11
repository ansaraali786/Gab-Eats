// GAB-EATS NOVA V12 - BYPASS CACHE
const CACHE_NAME = 'gab-eats-v1200';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map(key => caches.delete(key)));
    })
  );
});

self.addEventListener('fetch', (event) => {
  // NOVA V12 strategy: Network First for index.html, everything else fallback
  const url = new URL(event.request.url);
  
  if (url.pathname === '/' || url.pathname.includes('index.html')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
