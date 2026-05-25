/*
 * Shared locale plumbing for the redesign shell (ERY-56, Slice 1).
 *
 * Today the same locale logic is copy-pasted in at least three places:
 *   - `components/Analytics.astro`        (localeFromPath)
 *   - `components/RolloutInquiry.astro`   (localeFromPath)
 *   - `components/override-components/Head.astro` (stripLocalePrefix + auto-detect)
 *
 * This module is the single source of truth for locale detection and path math so the new
 * marketing layouts and the preserved analytics/inquiry hooks all agree. It is framework-free
 * (no Astro imports) so it can be used from `.astro` frontmatter AND from bundled client
 * `<script>` blocks. Existing presentation components should adopt these helpers as they are
 * migrated in later slices; this slice wires them into the new shell only.
 *
 * Locale model mirrors `config/locals.json`: `en` is the root locale (no path prefix);
 * `nl` and `de` are prefixed (`/nl/...`, `/de/...`).
 */

export const SUPPORTED_LOCALES = ["en", "nl", "de"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Detect the locale from a URL pathname. `en` (root) has no prefix. */
export function localeFromPath(pathname: string): Locale {
  const match = pathname.match(/^\/(nl|de)(\/|$)/);
  return match && isLocale(match[1]) ? (match[1] as Locale) : DEFAULT_LOCALE;
}

/** Strip the locale prefix from a path, returning the locale-agnostic base path. */
export function stripLocalePrefix(pathname: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return pathname;
  const prefix = `/${locale}`;
  if (pathname === prefix || pathname === `${prefix}/`) return "/";
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  return pathname;
}

/** Build a localized path from a locale-agnostic base path. Inverse of stripLocalePrefix. */
export function localizePath(basePath: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return basePath;
  return `/${locale}${basePath === "/" ? "/" : basePath}`;
}

/** The `lang` attribute value for `<html>`. */
export function htmlLang(locale: Locale): string {
  return locale;
}
