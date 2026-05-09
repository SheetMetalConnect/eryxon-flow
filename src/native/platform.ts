/**
 * Platform detection — single source of truth for "are we on Android/Capacitor?".
 *
 * Imports Capacitor lazily so the web bundle never pays for it at module load.
 */

let cachedNative: boolean | null = null;
let cachedAndroid: boolean | null = null;
let cachedTablet: boolean | null = null;

export function isNativeApp(): boolean {
  if (cachedNative !== null) return cachedNative;
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  cachedNative = !!cap?.isNativePlatform?.();
  return cachedNative;
}

export function isAndroidNative(): boolean {
  if (cachedAndroid !== null) return cachedAndroid;
  if (!isNativeApp()) {
    cachedAndroid = false;
    return false;
  }
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } })
    .Capacitor;
  cachedAndroid = cap?.getPlatform?.() === "android";
  return cachedAndroid;
}

/** Approximate "is this a tablet-class screen?" — short side ≥ 600 CSS px (Android sw600dp). */
export function isTabletViewport(): boolean {
  if (cachedTablet !== null) return cachedTablet;
  if (typeof window === "undefined") return false;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  cachedTablet = shortSide >= 600;
  return cachedTablet;
}

/** Reset cached detections (testing only). */
export function __resetPlatformCache(): void {
  cachedNative = null;
  cachedAndroid = null;
  cachedTablet = null;
}
