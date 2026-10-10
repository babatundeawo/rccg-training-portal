/* Offline support. Pages and data are fetched from the network first, so
   visitors always get the latest version after an update; if the network is
   down, the last copy they opened is served instead. Fonts and images are
   served from cache for speed. Firebase and other sites are never touched. */
const CACHE = 'rccg-learning-path-v1';
const CORE = [
  './', 'index.html', 'assets/css/tokens.css', 'assets/css/base.css', 'assets/css/components.css',
  'assets/js/app.js', 'assets/js/pages/home.js', 'assets/data/modules.json',
  'assets/fonts/inter-latin-wght-normal.woff2', 'assets/fonts/fraunces-latin-wght-normal.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStatic = (url) => /\/assets\/(fonts|img)\//.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.endsWith('/sw.js')) return;

  if (isStatic(url)) {
    event.respondWith(caches.match(request).then((hit) => hit || fetchAndCache(request)));
    return;
  }
  event.respondWith(
    fetchAndCache(request).catch(() => caches.match(request, { ignoreSearch: request.mode === 'navigate' })
      .then((hit) => hit || (request.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});

function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  });
}
