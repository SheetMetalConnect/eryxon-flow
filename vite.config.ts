import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

// Strips dev-only origins (localhost / 127.0.0.1, http + ws) from the meta CSP
// in index.html for production builds, while leaving them in place for `vite
// dev` so HMR keeps working. Header-based CSPs in vercel.json / nginx.conf /
// public/_headers stay untouched and remain the source of truth in prod.
//
// Self-hosting safety: when `VITE_SUPABASE_URL` points at a localhost origin
// (the documented Docker self-host pattern in `docs/SELF_HOSTING.md`), we
// keep the localhost tokens in the meta CSP so the browser doesn't block
// Supabase REST / realtime requests after install.
function stripDevCspForProd(): Plugin {
  const DEV_ORIGIN =
    /\s+(?:https?|wss?):\/\/(?:127\.0\.0\.1|localhost)(?::\*)?(?=[\s;"])/g;
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
  const supabaseIsLocal = /\/\/(?:127\.0\.0\.1|localhost)(?::|\/|$)/.test(
    supabaseUrl,
  );
  return {
    name: "eryxon:strip-dev-csp-for-prod",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler: (html) => (supabaseIsLocal ? html : html.replace(DEV_ORIGIN, "")),
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
    stripDevCspForProd(),
    VitePWA({
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
