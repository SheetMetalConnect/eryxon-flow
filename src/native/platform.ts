/**
 * Platform detection — single source of truth for "are we on
 * iOS / iPadOS / Android / web?".
 *
 * Imports Capacitor lazily so the web bundle never pays for it at module
 * load. The cache is intentionally process-lifetime: the runtime platform
 * does not change at runtime.
 */

import type { Capacitor as CapacitorBridge } from "@capacitor/core";

declare global {
  interface Window {
    Capacitor?: typeof CapacitorBridge;
  }
}

export type PlatformId = "ios" | "ipados" | "android" | "web";

let cachedNative: boolean | null = null;
let cachedAndroid: boolean | null = null;
let cachedIOS: boolean | null = null;
let cachedPlatform: PlatformId | null = null;

/** Returns the injected Capacitor bridge, if any. */
function getCapacitor(): typeof CapacitorBridge | null {
  if (typeof window === "undefined") return null;
  return window.Capacitor ?? null;
}

/** True when running inside any Capacitor WebView (iOS or Android). */
export function isNativeApp(): boolean {
  if (cachedNative !== null) return cachedNative;
  cachedNative = getCapacitor()?.isNativePlatform?.() === true;
  return cachedNative;
}

/** Alias kept for files migrated from the iOS-only bridge. */
export const isNative = isNativeApp;

export function isAndroidNative(): boolean {
  if (cachedAndroid !== null) return cachedAndroid;
  if (!isNativeApp()) {
    cachedAndroid = false;
    return false;
  }
  cachedAndroid = getCapacitor()?.getPlatform?.() === "android";
  return cachedAndroid;
}

/** True only when running inside the native iOS / iPadOS app. */
export function isNativeIOS(): boolean {
  if (cachedIOS !== null) return cachedIOS;
  if (!isNativeApp()) {
    cachedIOS = false;
    return false;
  }
  cachedIOS = getCapacitor()?.getPlatform?.() === "ios";
  return cachedIOS;
}

/**
 * Detect iPad reliably across iPadOS 13+ where Safari masquerades as
 * Mac Safari. Combines the explicit `iPad` token (older devices) with the
 * touch-points heuristic that Apple recommends.
 */
export function isIPad(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad/.test(ua)) return true;
  return (
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}

/** True for any handheld iOS form factor. */
export function isIPhone(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPod/.test(navigator.userAgent) && !isIPad();
}

/**
 * Approximate "is this a tablet-class screen?" — short side ≥ 600 CSS px.
 *
 * NOT cached: viewport changes when the user rotates the device, when iPad
 * Slide Over splits the screen, or when Android freeform mode resizes the
 * window. A cached value would lie about all of those, so we re-evaluate
 * each call. Callers that need reactive updates should subscribe via
 * `useNative()` (which re-snapshots on resize / orientationchange).
 */
export function isTabletViewport(): boolean {
  if (typeof window === "undefined") return false;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  return shortSide >= 600;
}

/** Best-effort runtime platform fingerprint, cached per session. */
export function getPlatform(): PlatformId {
  if (cachedPlatform) return cachedPlatform;
  if (isNativeIOS()) {
    cachedPlatform = isIPad() ? "ipados" : "ios";
    return cachedPlatform;
  }
  if (isAndroidNative()) {
    cachedPlatform = "android";
    return cachedPlatform;
  }
  if (typeof navigator === "undefined") {
    cachedPlatform = "web";
    return cachedPlatform;
  }
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod/.test(ua)) cachedPlatform = "ios";
  else if (isIPad()) cachedPlatform = "ipados";
  else if (/Android/.test(ua)) cachedPlatform = "android";
  else cachedPlatform = "web";
  return cachedPlatform;
}

/** Whether the device should render the touch-first mobile shell. */
export function shouldUseMobileShell(): boolean {
  if (isNativeApp()) return true;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

/** Coarse pointer detection for hover-vs-tap branches. */
export function hasFinePointer(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(pointer: fine)").matches;
}

/** Reset cached detections (testing only). */
export function __resetPlatformCache(): void {
  cachedNative = null;
  cachedAndroid = null;
  cachedIOS = null;
  cachedPlatform = null;
}
