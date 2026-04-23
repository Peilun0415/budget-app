/* 貓貓記帳 PWA：離線殼＋關鍵靜態資源快取。變更 app 版本時請一併更新 CACHE 與 PRECACHE 路徑 */
const CACHE = 'nekomemo-pwa-v1';
const PRECACHE = [
  'index.html',
  'app.js?v=1.1',
  'style.css?v=1.1',
  'icons/cat.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE.map((p) => new URL(p, self.location).href))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      try {
        return await fetch(request);
      } catch {
        const hit = await caches.match(request);
        if (hit) return hit;
        if (request.mode === 'navigate') {
          const page = await caches.match(new URL('index.html', self.location).href);
          if (page) return page;
        }
        return new Response('離線中', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
        });
      }
    })()
  );
});
