/* ============================================
   QUIZ MASTER — service-worker.js
   Offline support with Cache-First strategy
   ============================================ */

const CACHE_NAME = 'quiz-master-v1.0.4';  // নতুন ভার্সন

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

/* Install */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http') || url.includes('cdnjs') || url.includes('unpkg'))))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Install failed:', err))
  );
});

/* Activate */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Fetch */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  if (url.hostname.includes('docs.google.com')) {
    event.respondWith(
      fetch(request).catch(() => new Response('[]', { headers: { 'Content-Type': 'text/csv' } }))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, toCache));
        return response;
      });
    }).catch(() => {
      if (request.headers.get('accept')?.includes('text/html')) {
        return caches.match('/quiz-master/index.html');
      }
    })
  );
});
