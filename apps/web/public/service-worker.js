const CACHE_NAME = 'steplight-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const indexUrl = new URL('index.html', self.registration.scope);
    const response = await fetch(indexUrl, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`App shell request failed with status ${response.status}.`);

    const html = await response.clone().text();
    const assetPaths = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)]
      .map((match) => new URL(match[1], indexUrl).toString());
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([indexUrl.toString(), ...assetPaths]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith('steplight-shell-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
      } catch {
        // Fall back to the cached shell for offline or static-host SPA routes.
      }
      const cachedShell = await caches.match(
        new URL('index.html', self.registration.scope),
        { ignoreVary: true }
      );
      if (!cachedShell) throw new Error('Offline app shell is not available yet.');
      return cachedShell;
    })());
    return;
  }

  if (requestUrl.pathname.includes('/assets/')) {
    event.respondWith((async () => {
      const cachedAsset = await caches.match(request, { ignoreVary: true });
      return cachedAsset || fetch(request);
    })());
  }
});
