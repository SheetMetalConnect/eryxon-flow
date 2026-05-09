import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

// Strips dev-only origins (localhost / 127.0.0.1, http + ws) from the meta CSP
// in index.html for production builds, while leaving them in place for `vite
// dev` so HMR keeps working. Header-based CSPs in vercel.json / nginx.conf /
// public/_headers stay untouched and remain the source of truth in prod.
function stripDevCspForProd(): Plugin {
  // Strip dev-only origin tokens (with their leading whitespace so no double
  // space remains) directly from the HTML. These tokens only exist inside the
  // CSP meta tag, so a global replace is safe.
  const DEV_ORIGIN =
    /\s+(?:https?|wss?):\/\/(?:127\.0\.0\.1|localhost)(?::\*)?(?=[\s;"])/g;
  return {
    name: "eryxon:strip-dev-csp-for-prod",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler: (html) => html.replace(DEV_ORIGIN, ""),
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
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "apple-touch-icon-180x180.png",
        "robots.txt",
      ],
      manifest: {
        id: "/",
        name: "Eryxon Flow",
        short_name: "Eryxon",
        description: "Manufacturing Execution System for job shops",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "any",
        theme_color: "#2563eb",
        background_color: "#0f172a",
        lang: "en",
        dir: "ltr",
        categories: ["business", "productivity"],
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
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
