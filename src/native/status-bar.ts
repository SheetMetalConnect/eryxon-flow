/**
 * Status bar styling. iOS reads the system bar color from whatever the React
 * theme is currently rendering, so this keeps the OS chrome in lockstep with
 * the app's light/dark mode.
 */

import { isNative } from "./platform";

type StatusBarModule = typeof import("@capacitor/status-bar");

let cached: StatusBarModule | null = null;

async function load(): Promise<StatusBarModule | null> {
  if (!isNative()) return null;
  if (cached) return cached;
  try {
    cached = await import("@capacitor/status-bar");
    return cached;
  } catch {
    return null;
  }
}

export async function setStatusBarStyle(theme: "dark" | "light"): Promise<void> {
  const mod = await load();
  if (!mod) return;
  try {
    await mod.StatusBar.setStyle({
      // On iOS, "Dark" content = dark glyphs over a light bg, so we invert
      // relative to the theme name to keep it intuitive at the call site.
      style: theme === "dark" ? mod.Style.Light : mod.Style.Dark,
    });
  } catch {
    /* ignore */
  }
}

export async function setStatusBarOverlay(overlays: boolean): Promise<void> {
  const mod = await load();
  if (!mod) return;
  try {
    await mod.StatusBar.setOverlaysWebView({ overlay: overlays });
  } catch {
    /* ignore */
  }
}

export async function hideSplash(): Promise<void> {
  if (!isNative()) return;
  try {
    const splash = await import("@capacitor/splash-screen");
    await splash.SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
    /* ignore */
  }
}
