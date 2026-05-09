/**
 * Eryxon Flow — Service Worker
 *
 * Strategy:
 *  - App shell (HTML, JS, CSS): network-first with cache fallback so users
 *    always pick up the latest deploy when online but stay functional offline.
 *  - Static assets (icons, fonts, svg): cache-first with stale-while-revalidate.
 *  - Supabase / API calls: bypass entirely (auth, realtime, RLS must hit network).
 *
 * Operator-tablet UX: when the network drops mid-shift the queue stays usable
 * from cache; writes (clock in/out, completions) still error and surface in the
 * UI so they can be retried.
 */

const VERSION = "v1";
const APP_CACHE = `eryxon-app-${VERSION}`;
const ASSET_CACHE = `eryxon-assets-${VERSION}`;

const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== APP_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

const isAssetRequest = (url) =>
  /\.(?:js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|ico|wasm)$/i.test(
    url.pathname
  );

const isNavigationRequest = (request) =>
  request.mode === "navigate" ||
  (request.method === "GET" &&
    request.headers.get("accept")?.includes("text/html"));

const isApiRequest = (url) =>
  url.hostname.includes("supabase.co") ||
  url.pathname.startsWith("/api/") ||
  url.pathname.startsWith("/functions/") ||
  url.pathname.startsWith("/auth/v1/") ||
  url.pathname.startsWith("/realtime/v1/");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isApiRequest(url)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  if (isAssetRequest(url) && url.origin === self.location.origin) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
