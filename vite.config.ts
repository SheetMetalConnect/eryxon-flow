import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

// Build-time CSP rewrite for the `<meta http-equiv="Content-Security-Policy">`
// in index.html. Two transforms run in order:
//
//   1. Inject the configured `VITE_SUPABASE_URL` host into `connect-src` so
//      LAN deployments (`http://shop-floor.local:54321`,
//      `http://192.168.1.50:8080`, etc.) work without the browser blocking
//      every REST / realtime call. Also adds the matching ws / wss origin
//      for Supabase Realtime. Vite's normal dev server keeps localhost in
//      the CSP for HMR; we strip those tokens at build time *only* if the
//      configured Supabase URL isn't itself local.
//
//   2. Strip the dev-only `127.0.0.1` / `localhost` origins from the
//      production meta CSP, unless the configured Supabase URL is local
//      (the `supabase start` / Docker self-host case).
//
// Header-based CSPs in vercel.json / nginx-security-headers.conf /
// public/_headers stay the source of truth in prod when there's a reverse
// proxy in front; the meta tag is a defence in depth for direct file
// hosting (Caddy LAN, static build server).
function applyCspBuildRewrites(): Plugin {
  const DEV_ORIGIN =
    /\s+(?:https?|wss?):\/\/(?:127\.0\.0\.1|localhost)(?::\*)?(?=[\s;"])/g;
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
  const supabaseIsLocal = /\/\/(?:127\.0\.0\.1|localhost)(?::|\/|$)/.test(
    supabaseUrl,
  );

  // Pull the host:port out of the configured Supabase URL so we can mint
  // both an http(s):// and a ws(s):// origin token to add to connect-src.
  // Empty string when no URL is configured at build time.
  let supabaseOrigins = "";
  if (supabaseUrl) {
    try {
      const u = new URL(supabaseUrl);
      const httpOrigin = `${u.protocol}//${u.host}`;
      const wsScheme = u.protocol === "https:" ? "wss:" : "ws:";
      const wsOrigin = `${wsScheme}//${u.host}`;
      supabaseOrigins = ` ${httpOrigin} ${wsOrigin}`;
    } catch {
      // Malformed URL — fall through; the developer will see the connect
      // failure in the WebView console and can fix the env var.
    }
  }

  return {
    name: "eryxon:csp-rewrite",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler: (html) => {
        let out = html;
        // 1. Add the configured Supabase host to connect-src. The CSP
        //    value is wrapped in double quotes inside the meta tag, and
        //    contains single-quoted tokens like 'self' / 'unsafe-eval' —
        //    so the lazy match stops at the next `;` or `"`, NOT at the
        //    next `'` (which would land us inside `'self'`).
        if (supabaseOrigins) {
          out = out.replace(
            /(connect-src[^";]*?)(\s*;)/,
            (_, head: string, tail: string) => `${head}${supabaseOrigins}${tail}`,
          );
        }
        // 2. Strip dev-only origins unless the Supabase URL is itself local.
        if (!supabaseIsLocal) out = out.replace(DEV_ORIGIN, "");
        return out;
      },
    },
  };
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    applyCspBuildRewrites(),
    VitePWA({
      // The ONLY service worker is the Workbox `generateSW` output written to
      // dist/sw.js at build time (it precaches the app shell and handles the
      // SKIP_WAITING message itself). Do not add a hand-written public/sw.js:
      // generateSW overwrites it in dist/, so it would silently never ship.
      //
      // Prompt the operator before activating a new SW: a Sonner toast in
      // src/components/PwaUpdatePrompt.tsx calls updateServiceWorker(true)
      // when the user clicks Reload. This prevents mid-shift forced reloads
      // on shop-floor terminals while still surfacing updates promptly.
      registerType: "prompt",
      injectRegister: false,
      // The hand-curated `public/manifest.webmanifest` is the single source
      // of truth for the install metadata (operator-route shortcuts, icon
      // paths, edge-side panel, window-controls-overlay). We disable the
      // plugin's generator so the static file ships unmodified to dist/.
      manifest: false,
      // index.html still owns the `<link rel="manifest">`. Don't let the
      // plugin inject a competing tag that points at its generated file.
      injectManifest: undefined,
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "apple-touch-icon-180x180.png",
        "manifest.webmanifest",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-192.png",
        "icons/icon-maskable-512.png",
        "robots.txt",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        globIgnores: ["**/env.js"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/openapi\.json$/],
        cleanupOutdatedCaches: true,
        // No clientsClaim / skipWaiting: in prompt mode the new SW installs
        // and waits. PwaUpdatePrompt posts SKIP_WAITING when the operator
        // clicks Reload, which avoids forced mid-shift reloads on shop-floor
        // terminals while still surfacing updates promptly.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === "/env.js",
            handler: "NetworkFirst",
            options: {
              cacheName: "eryxon-env",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "font",
            handler: "CacheFirst",
            options: {
              cacheName: "eryxon-fonts",
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: "module",
        navigateFallback: "index.html",
      },
    }),
    mode === "analyze" &&
      visualizer({
        open: true,
        filename: "dist/bundle-stats.html",
        gzipSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query", "@tanstack/react-table"],
          "vendor-charts": ["recharts"],
          "vendor-three": ["three"],
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-popover", "@radix-ui/react-select", "@radix-ui/react-tabs"],
        },
      },
    },
  },
}));
