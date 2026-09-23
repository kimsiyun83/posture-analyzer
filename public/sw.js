const CACHE = 'lulu-offline-v1';
const OFFLINE = '/offline.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(OFFLINE)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('lulu-offline-') && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
// Never cache customer pages, photographs, API responses, or mutations.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(async () =>
    (await caches.match(OFFLINE)) || new Response('인터넷 연결을 확인해 주세요.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  ));
});
