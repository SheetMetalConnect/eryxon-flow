/**
 * Platform detection for the iOS / iPadOS native shell.
 *
 * The same React bundle runs in three places: desktop browser, mobile Safari
 * PWA, and a native Capacitor WebView. These helpers normalize that
 * difference so feature code can ask "are we on iPad?" without caring how the
 * page got there.
 *
 * `isNativeIOS()` is what gates Capacitor plugin calls — when false we always
 * fall back to a web-friendly behavior (or no-op) so the app still works
 * without the bridge.
 */

import type { Capacitor as CapacitorType } from "@capacitor/core";

declare global {
  interface Window {
    Capacitor?: CapacitorType;
  }
}

export type PlatformId = "ios" | "ipados" | "android" | "web";

let cachedPlatform: PlatformId | null = null;

/** Lazily resolves the Capacitor bridge if it was injected at boot time. */
export function getCapacitor(): CapacitorType | null {
  if (typeof window === "undefined") return null;
  return window.Capacitor ?? null;
}

/** True when running inside any Capacitor WebView (iOS or Android). */
export function isNative(): boolean {
  return getCapacitor()?.isNativePlatform?.() === true;
}

/** True only when running inside the native iOS / iPadOS app. */
export function isNativeIOS(): boolean {
  return isNative() && getCapacitor()?.getPlatform?.() === "ios";
}

/**
 * Best-effort platform fingerprint. Caches once because user-agent doesn't
 * change at runtime and we hit this on every layout decision.
 */
export function getPlatform(): PlatformId {
  if (cachedPlatform) return cachedPlatform;
  if (isNativeIOS()) {
    cachedPlatform = isIPad() ? "ipados" : "ios";
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

/**
 * Detect iPad reliably across iPadOS 13+ where Safari masquerades as
 * Mac Safari. We combine the explicit `iPad` token (older devices) with the
 * touch-points heuristic that Apple recommends.
 */
export function isIPad(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad/.test(ua)) return true;
  // iPadOS 13+ desktop-class Safari fingerprint
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
 * Whether the current device should render the touch-first mobile shell.
 * We treat anything ≤ 1024px wide as "phone-class" and prefer the split-view
 * iPad shell from there up. Desktop (≥ 1280px) keeps the full admin chrome.
 */
export function shouldUseMobileShell(): boolean {
  if (isNative()) return true;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

/** Kicks off coarse pointer detection for hover-vs-tap branches. */
export function hasFinePointer(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(pointer: fine)").matches;
}
