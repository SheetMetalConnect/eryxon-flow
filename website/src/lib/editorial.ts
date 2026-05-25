/*
 * Editorial helpers for the blog + release-note templates (ERY-72, Slice 3).
 * Framework-free so they can run in `.astro` frontmatter.
 */

/** Estimate reading time in whole minutes from raw markdown body (~200 wpm, min 1). */
export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Up-to-two-letter initials for an avatar chip, derived from an author name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
