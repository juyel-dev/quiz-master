const CACHE_NAME = 'quiz-master-v1.0.6';

const STATIC_ASSETS = [
  '/quiz-master/',
  '/quiz-master/index.html',
  '/quiz-master/styles.css',
  '/quiz-master/app.js',
  '/quiz-master/data.js',
  '/quiz-master/utils.js',
  '/quiz-master/pwa/manifest.json',
  '/quiz-master/assets/icons/icon-192.png',
  '/quiz-master/assets/icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http'))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response.status === 200) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      }).catch(() => {
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/quiz-master/index.html');
        }
      });
    })
  );
});
