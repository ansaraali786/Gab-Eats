
const CACHE_NAME = 'gab-eats-v35-supernova';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url.toLowerCase();
  
  // SUPERNOVA BYPASS - STRICTLY NETWORK FOR MESH SIGNATURES
  const BYPASS_DOMAINS = [
    'gun', 'esm.sh', 'google', 'marda.io', 'dletta', 'peer.ooo', 'railway.app', '4321.it', 'herokuapp'
  ];

  if (BYPASS_DOMAINS.some(d => url.includes(d))) {
    return; // Mesh traffic must never be intercepted
  }

  if (url.includes('.js') || url.includes('manifest.json') || url === location.origin + '/') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
