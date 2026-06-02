const VERSION = '2026-06-02.1';
const SHELL_CACHE = `six3-shell-${VERSION}`;
const STATIC_CACHE = `six3-static-${VERSION}`;
const RUNTIME_CACHE = `six3-runtime-${VERSION}`;
const API_CACHE = `six3-api-${VERSION}`;
const CACHE_PREFIX = 'six3-';

const SHELL_ASSETS = [
  '/',
  '/site.webmanifest',
  '/app-icon.png',
  '/logo.svg',
  '/brand/six3-logo.png',
];

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

function isSameOriginAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/brand/')
    || /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || (
    url.hostname === 'tres6zero.onrender.com' && url.pathname.startsWith('/api/')
  );
}

function isCacheableApiRequest(request, url) {
  if (request.method !== 'GET' || !isApiRequest(url)) return false;
  return ![
    '/api/auth/',
    '/api/billing/',
    '/api/support/',
    '/api/upload/',
    '/api/video/process',
    '/api/events/admin/',
  ].some((blockedPath) => url.pathname.includes(blockedPath));
}

function isMediaAsset(request, url) {
  if (!['image', 'audio', 'font'].includes(request.destination)) return false;
  return url.hostname.includes('supabase.co')
    || url.hostname.includes('firebasestorage.googleapis.com')
    || url.hostname.includes('storage.googleapis.com')
    || url.hostname.includes('gstatic.com')
    || url.origin === self.location.origin;
}

async function digest(value) {
  if (!self.crypto?.subtle) return String(value.length);

  const data = new TextEncoder().encode(value);
  const hash = await self.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function scopedApiCacheRequest(request) {
  const url = new URL(request.url);
  const scope = [
    request.headers.get('Authorization') || 'public',
    request.headers.get('X-SIX3-Device-ID') || 'device',
    url.pathname,
    url.search,
  ].join('|');

  url.searchParams.set('__six3_cache_scope', await digest(scope));
  return new Request(url.toString(), { method: 'GET' });
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;

  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

async function cacheFirst(request, cacheName, maxEntries = 140) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    cache.put(request, response.clone()).catch(() => {});
    trimCache(cacheName, maxEntries).catch(() => {});
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName, maxEntries = 140) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok || response.type === 'opaque') {
      cache.put(request, response.clone()).catch(() => {});
      trimCache(cacheName, maxEntries).catch(() => {});
    }
    return response;
  }).catch(() => cached);

  return cached || network;
}

async function networkFirst(request, cacheName, fallbackRequest = request, maxEntries = 80) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      cache.put(fallbackRequest, response.clone()).catch(() => {});
      trimCache(cacheName, maxEntries).catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache.match(fallbackRequest);
    if (cached) return cached;
    throw new Error('OFFLINE');
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && ![SHELL_CACHE, STATIC_CACHE, RUNTIME_CACHE, API_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    if (isApiRequest(url)) {
      event.respondWith(
        fetch(request).catch(() => new Response(
          JSON.stringify({ error: 'OFFLINE_UNAVAILABLE', code: 'OFFLINE_UNAVAILABLE' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        ))
      );
    }
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(
      networkFirst(request, SHELL_CACHE, new Request('/'), 12)
        .catch(() => caches.match('/'))
    );
    return;
  }

  if (isSameOriginAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isCacheableApiRequest(request, url)) {
    event.respondWith(
      scopedApiCacheRequest(request)
        .then((cacheRequest) => networkFirst(request, API_CACHE, cacheRequest, 120))
        .catch(() => new Response(
          JSON.stringify({ error: 'OFFLINE_UNAVAILABLE', code: 'OFFLINE_UNAVAILABLE' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        ))
    );
    return;
  }

  if (isMediaAsset(request, url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, 220));
  }
});
