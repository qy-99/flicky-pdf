const CACHE_NAME = 'flicky-cache-v2';

// Derive the base path where sw.js is served (e.g., '/' or '/flicky-pdf/')
const basePath = self.location.pathname.substring(0, self.location.pathname.lastIndexOf('/') + 1);

const LOCAL_ASSETS = [
  basePath,
  basePath + 'index.html',
  basePath + 'manifest.json',
  basePath + 'icon.svg',
  basePath + 'icon-192.png',
  basePath + 'icon-512.png',
  basePath + 'screenshot-desktop.png',
  basePath + 'screenshot-mobile.png'
];

const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.5/tesseract.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[Service Worker] Pre-caching static assets for base path:', basePath);
      const allAssets = [...LOCAL_ASSETS, ...CDN_ASSETS];
      await Promise.allSettled(
        allAssets.map(async (url) => {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn('[Service Worker] Optional pre-cache skipped:', url, err);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Skip dev server hot reload
  if (url.pathname.includes('@vite') || url.pathname.includes('hmr') || (url.hostname === 'localhost' && url.port !== '3000')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Stale-while-revalidate for local assets
        if (!event.request.url.includes('cdnjs') && !event.request.url.includes('unpkg')) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {/* Ignore offline sync errors */});
        }
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && !event.request.url.includes('cdnjs') && !event.request.url.includes('unpkg'))) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // If offline and request is for navigation, return cached index.html or basePath
          if (event.request.mode === 'navigate') {
            return caches.match(basePath + 'index.html').then((res) => res || caches.match(basePath));
          }
        });
    })
  );
});
