/*
 * PDFShell service worker.
 *
 * Two layers, tuned for metered connections (references/african-context.md §2–3):
 *
 * 1. HEAVY ASSETS (cache-first, forever): the large, immutable WebAssembly /
 *    OCR-language blobs. Downloaded once, then instant and offline. This cache
 *    name is intentionally unchanged across SW updates so users never
 *    re-download Tesseract.
 *
 * 2. APP SHELL (Phase 4 PWA):
 *    - /_next/static/* is content-hashed → cache-first, immutable.
 *    - Page navigations are network-first with a cache fallback, so the app
 *      can never serve stale code while online, but visited tools keep working
 *      offline. The on-device tools (merge, split, rotate, crop, …) are fully
 *      usable without a connection once visited.
 */
const ASSET_CACHE = 'pdfshell-assets-v1'; // KEEP this name — see note above.
const SHELL_CACHE = 'pdfshell-shell-v1';
const KEEP = [ASSET_CACHE, SHELL_CACHE];

// Heavy, content-addressed assets that are safe to cache forever.
const HEAVY_ASSET = [
  /tessdata/i, // Tesseract trained language data
  /\.traineddata(\.gz)?$/i,
  /tesseract[-.].*\.(wasm|js)$/i, // Tesseract core + worker
  /pdf\.?worker(\.min)?\.(mjs|js)$/i, // PDF.js worker
  /\.wasm$/i, // any other wasm engine
];

// Server-backed paths that must never be cached.
const NEVER_CACHE = [/^\/admin/, /^\/api\//, /^\/svc\//];

function isHeavyAsset(url) {
  return HEAVY_ASSET.some((re) => re.test(url));
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) {
    cache.put(request, res.clone()).catch(() => {});
  }
  return res;
}

async function networkFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    // Last resort for navigations: the cached landing page still lets the user
    // reach every previously-visited (cached) tool.
    if (request.mode === 'navigate') {
      const home = await cache.match('/');
      if (home) return home;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isHeavyAsset(request.url)) {
    event.respondWith(cacheFirst(ASSET_CACHE, request));
    return;
  }

  // Only same-origin app-shell handling below.
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((re) => re.test(url.pathname))) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(SHELL_CACHE, request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(SHELL_CACHE, request));
  }
});
