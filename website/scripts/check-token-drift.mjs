#!/usr/bin/env node
/*
 * Token drift check (ERY v0.6).
 *
 * WHY THIS EXISTS
 *   The single source of truth for Eryxon design tokens is the design-system
 *   package `colors_and_type.css` (HSL values, separate `Eryxon Design System`
 *   folder / repo). The website cannot import that file at build time — it lives
 *   outside this repo and is not reliably present in CI. So instead of a live
 *   import, this check pins the canonical hex values (derived from the package's
 *   HSL definitions) and asserts that `src/styles/tokens.css` still matches them.
 *
 *   The CANONICAL map below is the contract. If the design package changes a
 *   value, update CANONICAL here AND tokens.css in the same commit. If someone
 *   edits tokens.css by accident, this check fails and points at the drift.
 *
 * RUN
 *   node scripts/check-token-drift.mjs   (or `npm run tokens:check`)
 *
 * SCOPE
 *   Covers the colour + key dimensional tokens that map 1:1 to the package.
 *   Tokens that are website-only compositions (clamp() padding, motion easings)
 *   are intentionally not pinned here — they have no canonical counterpart.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokensPath = resolve(__dirname, "../src/styles/tokens.css");

/**
 * Canonical contract: token name -> expected value.
 * Values mirror `colors_and_type.css` (package single source of truth).
 * Hex is lowercased; compare case-insensitively.
 */
const CANONICAL = {
  // Brand — light surface primary #0066cc, dark-section blue #1e90ff
  "--ery-brand": "#0066cc",
  "--ery-brand-hover": "#0052a3",
  "--ery-brand-contrast": "#ffffff",
  "--ery-brand-on-dark": "#1e90ff",

  // Neutral light ramp (pure gray, HSL hue 0 / sat 0%)
  "--ery-surface": "#ffffff",
  "--ery-surface-subtle": "#fafafa",
  "--ery-surface-inset": "#f5f5f5",
  "--ery-border": "#e5e5e5",
  "--ery-border-strong": "#cccccc",
  "--ery-text": "#1a1a1a",
  "--ery-text-muted": "#595959",
  "--ery-text-subtle": "#8c8c8c",

  // Dark section ramp
  "--ery-bg-dark": "#0a0a0a",
  "--ery-surface-dark": "#141414",
  "--ery-surface-dark-2": "#1f1f1f",
  "--ery-border-dark": "#383838",
  "--ery-text-on-dark": "#ebebeb",
  "--ery-text-on-dark-muted": "#a6a6a6",

  // Semantic feedback (never brand blue)
  "--ery-success": "#248f47",
  "--ery-warning": "#d18a0a",
  "--ery-error": "#d2362b",
  "--ery-info": "#147ab8",

  // Radius scale — 12px card default
  "--ery-radius-sm": "6px",
  "--ery-radius": "12px",
  "--ery-radius-lg": "16px",
  "--ery-radius-pill": "999px",

  // Touch targets
  "--ery-touch-min": "44px",
  "--ery-touch-operator": "56px",

  // Sticky header rhythm
  "--ery-header-height": "64px",
};

const css = readFileSync(tokensPath, "utf8");

/** Read the FIRST :root declaration of a custom property. */
function readToken(name) {
  // Match `--name: value;` ignoring comments after the value.
  const re = new RegExp(`${name.replace(/[-]/g, "\\-")}\\s*:\\s*([^;]+);`);
  const m = css.match(re);
  if (!m) return null;
  return m[1].trim().toLowerCase();
}

const failures = [];
for (const [name, expected] of Object.entries(CANONICAL)) {
  const actual = readToken(name);
  if (actual === null) {
    failures.push(`MISSING  ${name} — expected ${expected}, not found in tokens.css`);
    continue;
  }
  if (actual !== expected.toLowerCase()) {
    failures.push(`DRIFT    ${name} — expected ${expected}, got ${actual}`);
  }
}

if (failures.length > 0) {
  console.error("Token drift detected against the canonical design-system contract:\n");
  for (const f of failures) console.error("  " + f);
  console.error(
    `\n${failures.length} issue(s). Reconcile src/styles/tokens.css with colors_and_type.css,` +
      "\nor update the CANONICAL map in scripts/check-token-drift.mjs if the package changed."
  );
  process.exit(1);
}

console.log(`Token drift check passed: ${Object.keys(CANONICAL).length} tokens match the canonical contract.`);
