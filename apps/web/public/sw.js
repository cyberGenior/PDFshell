/*
 * PDFShell service worker — deliberately minimal.
 *
 * It caches ONLY the large, immutable WebAssembly / OCR-language blobs so a user
 * on metered data downloads them once and gets them instantly (and offline)
 * thereafter. It intentionally does NOT cache app HTML/JS, so it can never serve
 * stale application code — full offline app-shell caching is Phase 4 (PWA).
 *
 * See references/african-context.md §2–3.
 */
const CACHE = 'pdfshell-assets-v1';

// Heavy, content-addressed assets that are safe to cache forever.
const HEAVY_ASSET = [
  /tessdata/i, // Tesseract trained language data
  /\.traineddata(\.gz)?$/i,
  /tesseract[-.].*\.(wasm|js)$/i, // Tesseract core + worker
  /pdf\.?worker(\.min)?\.(mjs|js)$/i, // PDF.js worker
  /\.wasm$/i, // any other wasm engine
];

function isHeavyAsset(url) {
  return HEAVY_ASSET.some((re) => re.test(url));
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !isHeavyAsset(request.url)) return; // pass through

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const res = await fetch(request);
      // Cache successful (and opaque CDN) responses; ignore errors.
      if (res && (res.ok || res.type === 'opaque')) {
        cache.put(request, res.clone()).catch(() => {});
      }
      return res;
    }),
  );
});
