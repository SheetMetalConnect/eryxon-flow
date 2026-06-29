// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

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
  markdown: {
    remarkPlugins: [remarkMermaid],
  },
  redirects: {
    "/articles": "/blog",
    "/roadmap/": "/",
    "/nl/roadmap/": "/nl/",
    "/de/roadmap/": "/de/",
    "/guides/changelog/": "/release-notes/",
    "/de/guides/changelog/": "/release-notes/",
    "/nl/guides/changelog/": "/release-notes/",
    "/articles/why-eryxon-flow-moved-to-apache-2-0/": "/blog/why-eryxon-flow-is-now-apache-2-0/",
    "/articles/latest-development-and-road-to-v0-7/": "/blog/eryxon-flow-v0-7-what-we-are-building/",
    "/blog/why-eryxon-flow-moved-to-apache-2-0/": "/blog/why-eryxon-flow-is-now-apache-2-0/",
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
