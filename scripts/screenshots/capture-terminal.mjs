// Captures docs screenshots of the operator terminal detail panel.
//
// Usage:
//   1. cp .env.example .env   (any non-empty Supabase values work — the panel
//      renders from bundled demo data, network calls just fail silently)
//   2. npm run dev            (serves the DEV-only /__screenshot/terminal route)
//   3. node scripts/screenshots/capture-terminal.mjs
//
// Override the target with BASE_URL, e.g. BASE_URL=http://127.0.0.1:8080.
// Output PNGs land in website/src/assets/ and are referenced by the docs.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Resolve Playwright whether it's a project dep or installed globally.
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require(
    "/opt/node22/lib/node_modules/playwright/index.js",
  ));
}

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8080";
const TARGET = `${BASE_URL}/__screenshot/terminal`;
const OUT = new URL("../../website/src/assets/", import.meta.url).pathname;

// Some sandboxes ship Chromium at a fixed path; fall back to it if Playwright's
// own resolution fails.
async function launch() {
  try {
    return await chromium.launch();
  } catch {
    return await chromium.launch({
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM ||
        "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    });
  }
}

const D = { w: 1440, h: 1000 }; // desktop viewport
const M = { w: 414, h: 896 }; //  phone viewport

const shots = [
  { name: "operator-terminal-detail-desktop", ...D }, //          Steps tab
  { name: "operator-terminal-batch-desktop", ...D, tab: "Batch" },
  { name: "operator-terminal-location-desktop", ...D, tab: "Location" },
  { name: "operator-terminal-info-desktop", ...D, tab: "Info" },
  { name: "operator-terminal-detail-mobile", ...M }, //           phone
  { name: "operator-terminal-detail-desktop-dark", ...D, theme: "dark" },
];

const browser = await launch();
for (const { name, w, h, tab, theme = "light" } of shots) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  // Pin the app theme before first paint so dark shots are reliable.
  await ctx.addInitScript((t) => {
    localStorage.setItem("eryxon-theme-mode", t);
  }, theme);
  const page = await ctx.newPage();
  await page.goto(TARGET, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="screenshot-panel"]', { timeout: 15000 });
  await page.waitForTimeout(1200);
  if (tab) {
    await page.getByRole("tab", { name: tab }).click();
    await page.waitForTimeout(800);
  }
  await page
    .locator('[data-testid="screenshot-panel"]')
    .screenshot({ path: `${OUT}${name}.png` });
  console.log("wrote", name);
  await ctx.close();
}
await browser.close();
console.log("done");
