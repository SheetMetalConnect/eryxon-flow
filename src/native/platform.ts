/**
 * Platform detection — single source of truth for "are we on Android/Capacitor?".
 *
 * We read window.Capacitor (injected by the native runtime before our bundle
 * boots) instead of importing @capacitor/core directly, so the web bundle pays
 * nothing for Capacitor on plain-browser sessions.
 *
 * `isNativeApp` / `isAndroidNative` are cached — the platform doesn't change
 * during a session. Viewport-shape queries are NOT cached: rotation,
 * window-resize, foldable unfold, and Samsung DeX docking all flip them.
 */

interface CapacitorWindow {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
  };
}

let cachedNative: boolean | null = null;
let cachedAndroid: boolean | null = null;

function getCap() {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as CapacitorWindow).Capacitor;
}

export function isNativeApp(): boolean {
  if (cachedNative !== null) return cachedNative;
  cachedNative = !!getCap()?.isNativePlatform?.();
  return cachedNative;
}

export function isAndroidNative(): boolean {
  if (cachedAndroid !== null) return cachedAndroid;
  if (!isNativeApp()) {
    cachedAndroid = false;
    return false;
  }
  cachedAndroid = getCap()?.getPlatform?.() === "android";
  return cachedAndroid;
}

/**
 * Approximate "is this a tablet-class screen?" — short side ≥ 600 CSS px
 * (Android sw600dp). NOT cached: callers may invoke this after rotation or a
 * foldable unfold and must see the fresh value. Use `useTabletLayout()` for
 * a reactive React subscription.
 */
export function isTabletViewport(): boolean {
  if (typeof window === "undefined") return false;
  return Math.min(window.innerWidth, window.innerHeight) >= 600;
}

/** Reset cached detections — for tests that swap window.Capacitor. */
export function __resetPlatformCache(): void {
  cachedNative = null;
  cachedAndroid = null;
}
