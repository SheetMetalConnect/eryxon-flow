// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { unified } from "@astrojs/markdown-remark";

import tailwindcss from "@tailwindcss/vite";
import config from "./src/config/config.json";
import social from "./src/config/social.json";
import locals from "./src/config/locals.json";
import sidebar from "./src/config/sidebar.json";
import { remarkMermaid } from "./src/lib/remark-mermaid.mjs";

import { fileURLToPath } from "url";

const { site } = config;
const { title, logo, logo_darkmode } = site;

export const locales = locals


// https://astro.build/config
export default defineConfig({
  site: site.url,
  compressHTML: true,
  markdown: {
    processor: unified({ remarkPlugins: [remarkMermaid] }),
  },
  redirects: {
    "/guides/": "/guides/quick-start/",
    "/nl/guides/": "/nl/guides/quick-start/",
    "/de/guides/": "/de/guides/quick-start/",
    "/architecture/connectivity-mqtt/": "/architecture/connectivity-webhooks/",
    "/nl/architecture/connectivity-mqtt/": "/architecture/connectivity-webhooks/",
    "/de/architecture/connectivity-mqtt/": "/architecture/connectivity-webhooks/",
    "/nl/release-notes/": "/release-notes/",
    "/de/release-notes/": "/release-notes/",
    "/guides/deployment/": "/guides/self-hosting/",
    "/nl/guides/deployment/": "/nl/guides/self-hosting/",
    "/de/guides/deployment/": "/de/guides/self-hosting/",
    "/architecture/connectivity-rest-api/": "/api/rest-api-reference/",
    "/nl/architecture/connectivity-rest-api/": "/api/rest-api-reference/",
    "/articles": "/blog",
    "/roadmap/": "/",
    "/nl/roadmap/": "/nl/",
    "/de/roadmap/": "/de/",
    "/guides/changelog/": "/release-notes/",
    "/de/guides/changelog/": "/release-notes/",
    "/nl/guides/changelog/": "/release-notes/",
    "/articles/latest-development-and-road-to-v0-7/": "/blog/eryxon-flow-v0-7-what-we-are-building/",
  },
  // Use Astro's default Sharp image service. The previous `noop` service had no
  // dev endpoint, so every <img> (docs screenshots + logos) returned HTTP 500
  // under `astro dev` — images looked "lost" locally while building fine in prod.
  integrations: [
    starlight({
      title,
      logo: {
        light: logo,
        dark: logo_darkmode,
        alt: "Eryxon Flow Logo",
      },
      // @ts-ignore
      social: social.main || [],
      locales,
      sidebar: sidebar.main || [],
      customCss: ["./src/styles/global.css"],
      // One dark code surface on both page themes; the light syntax theme on the
      // dark panel was unreadable. Starlight's theme switch stays off for code.
      expressiveCode: {
        themes: ["github-dark"],
        useStarlightDarkModeSwitch: false,
        useStarlightUiThemeColors: false,
        defaultProps: { wrap: true },
        styleOverrides: {
          borderRadius: "var(--ery-radius-lg)",
          borderColor: "var(--ery-code-border)",
          codeFontFamily: "var(--ery-font-mono)",
          codeFontSize: "0.9rem",
          codeLineHeight: "1.65",
          codeBackground: "var(--ery-code-bg)",
          frames: { shadowColor: "transparent", editorBackground: "var(--ery-code-bg)", terminalBackground: "var(--ery-code-bg)" },
        },
      },
      components: {
        Head: "./src/components/override-components/Head.astro",
        Header: "./src/components/override-components/Header.astro",
        Hero: "./src/components/override-components/Hero.astro",
        PageFrame: "./src/components/override-components/PageFrame.astro",
        PageSidebar: "./src/components/override-components/PageSidebar.astro",
        TwoColumnContent: "./src/components/override-components/TwoColumnContent.astro",
        ContentPanel: "./src/components/override-components/ContentPanel.astro",
        Pagination: "./src/components/override-components/Pagination.astro",
        Sidebar: "./src/components/override-components/Sidebar.astro",
        Footer: "./src/components/override-components/Footer.astro",
      },
    }),
  ],
  vite: {
    plugins: /** @type {any} */ ([tailwindcss()]),
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "~": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
