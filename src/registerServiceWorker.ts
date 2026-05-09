/**
 * Service worker registration.
 *
 * Bundled into the main module so it ships under script-src 'self' — the
 * CSP in index.html does not allow 'unsafe-inline'/nonce/hash, so registering
 * via an inline <script> is silently refused in production browsers.
 */

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol === "file:") return;

  // The Capacitor WebView serves the bundle from https://localhost; SW works
  // there, but customers running the dev tooling (vite preview etc.) over
  // plain http on a non-localhost LAN host can't register one. Skip cleanly.
  const { protocol, hostname } = window.location;
  const isSecureContext =
    protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1";
  if (!isSecureContext) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* SW registration failures must not block the app */
    });
  });
}
