/* ============================================
   QUIZ MASTER — service-worker.js
   Offline support with Cache-First strategy
   ============================================ */

const CACHE_NAME = 'quiz-master-v1.0.3';  // version বাড়িয়েছি যাতে নতুন ক্যাশ হয়

const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data.js',
  './utils.js',
  './pwa/manifest.json',  // manifest path ঠিক রাখো (pwa ফোল্ডারে থাকলে)
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
];

/* ---- Install: Pre-cache static assets ---- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(
          STATIC_ASSETS.filter(url => 
            !url.startsWith('http') || url.includes('cdnjs') || url.includes('unpkg')
          )
        );
      })
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Install cache failed:', err))
  );
});

/* ---- Activate: Clean old caches ---- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- Fetch: Cache-First with Network Fallback ---- */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser extension requests
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Network-only for Google Sheets CSV (always fresh data)
  if (url.hostname.includes('docs.google.com')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response('[]', { headers: { 'Content-Type': 'text/csv' } })
      )
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, toCache));
        return response;
      });
    }).catch(() => {
      // Offline fallback for HTML navigation
      if (request.headers.get('accept')?.includes('text/html')) {
        return caches.match('./index.html');
      }
    })
  );
});

/* ---- Background sync (optional future use) ---- */
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
