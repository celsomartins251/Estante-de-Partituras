/* Estante de Partituras — cache offline e atualização controlada.
   Incrementar CACHE_NAME a cada publicação para disponibilizar a nova versão.
*/
'use strict';

const CACHE_NAME = 'estante-partituras-v1.1.2';
const CACHE_PREFIX = 'estante-partituras-';
const APP_FILES = ['./', './index.html'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const requests = APP_FILES.map(path => new Request(path, { cache: 'reload' }));
    await cache.addAll(requests);
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      if (request.mode === 'navigate') {
        const fallback = await cache.match(new URL('./index.html', self.registration.scope).toString());
        if (fallback) return fallback;
      }
      return new Response('Conteúdo indisponível offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
