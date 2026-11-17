/*
 * Offline support. Caches the app on first visit, then serves it from the cache
 * and refreshes the cache in the background. Bump CACHE when you publish changes
 * so installed copies pick up the new files right away.
 */
const CACHE = 'uniplanner-v5'; // internal name; kept from before the rename
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/logic.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('uniplanner-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Any navigation to the app's start page is answered with the cached shell.
  const scope = new URL(self.registration.scope);
  const isShell = request.mode === 'navigate' &&
    (url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html');
  const key = isShell ? new Request(new URL('./index.html', scope)) : request;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(key, { ignoreSearch: true });
    const network = fetch(request, { cache: 'no-cache' })
      .then((response) => {
        if (response.ok && response.type === 'basic') cache.put(key, response.clone());
        return response;
      })
      .catch(() => null);

    if (cached) {
      event.waitUntil(network);
      return cached;
    }
    const response = await network;
    return response || Response.error();
  })());
});
