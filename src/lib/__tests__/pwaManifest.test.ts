import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Install-metadata integrity for the PWA. The manifest is hand-curated
 * (vite-plugin-pwa runs with `manifest: false`), so nothing rebuilds or
 * validates it at build time — a renamed icon or a typoed shortcut route
 * would only surface as a broken install on an operator tablet.
 */

const publicDir = join(__dirname, "..", "..", "..", "public");

interface ManifestIcon {
  src: string;
  sizes: string;
  type?: string;
  purpose?: string;
}

interface ManifestShortcut {
  name: string;
  url: string;
  icons?: ManifestIcon[];
}

const manifest = JSON.parse(
  readFileSync(join(publicDir, "manifest.webmanifest"), "utf-8"),
) as {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: ManifestIcon[];
  shortcuts?: ManifestShortcut[];
};

const iconFileFor = (src: string) => join(publicDir, src.replace(/^\//, ""));

describe("manifest.webmanifest", () => {
  it("has the required install fields", () => {
    expect(manifest.name).toBe("Eryxon Flow");
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toMatch(/^#/);
    expect(manifest.background_color).toMatch(/^#/);
  });

  it("declares 192 and 512 icons in both any and maskable purposes", () => {
    const byPurpose = (purpose: string) =>
      manifest.icons
        .filter((icon) => (icon.purpose ?? "any").includes(purpose))
        .map((icon) => icon.sizes);

    expect(byPurpose("any")).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );
    expect(byPurpose("maskable")).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );
  });

  it("references only icon files that exist in public/", () => {
    for (const icon of manifest.icons) {
      expect(existsSync(iconFileFor(icon.src)), `missing ${icon.src}`).toBe(
        true,
      );
    }
  });

  it("keeps operator shortcuts inside the mobile shell scope", () => {
    const shortcuts = manifest.shortcuts ?? [];
    expect(shortcuts.length).toBeGreaterThan(0);
    for (const shortcut of shortcuts) {
      expect(shortcut.url, shortcut.name).toMatch(/^\/m\//);
      for (const icon of shortcut.icons ?? []) {
        expect(existsSync(iconFileFor(icon.src)), `missing ${icon.src}`).toBe(
          true,
        );
      }
    }
  });
});

describe("index.html PWA wiring", () => {
  const indexHtml = readFileSync(
    join(publicDir, "..", "index.html"),
    "utf-8",
  );

  it("links the static manifest", () => {
    expect(indexHtml).toContain('rel="manifest" href="/manifest.webmanifest"');
  });

  it("ships the apple-touch-icon referenced by the head", () => {
    const match = indexHtml.match(/rel="apple-touch-icon" href="([^"]+)"/);
    expect(match).not.toBeNull();
    expect(existsSync(iconFileFor(match![1]))).toBe(true);
  });
});
