/**
 * Native bridge layer — barrel export.
 *
 * All Capacitor surface area lives behind this module. Components import
 * from "@/native" only; nothing else should import @capacitor/* directly.
 *
 * Same React 18 bundle, three runtimes:
 *   - mobile Safari / Android Chrome (PWA)        → web fallbacks
 *   - native iOS / iPadOS Capacitor WebView      → full bridge
 *   - native Android Capacitor WebView            → full bridge
 */

export {
  // Platform fingerprints
  getPlatform,
  hasFinePointer,
  isAndroidNative,
  isIPad,
  isIPhone,
  isNative,
  isNativeApp,
  isNativeIOS,
  isTabletViewport,
  shouldUseMobileShell,
  __resetPlatformCache,
  type PlatformId,
} from "./platform";

export { initNativeShell, wireHardwareBack } from "./appShell";

export { haptics } from "./haptics";

export {
  scanOnce,
  isScannerAvailable,
  DEFAULT_FORMATS,
  ScannerPermissionError,
  ScannerUnavailableError,
  type ScanFormat,
  type ScanOptions,
  type ScanResult,
} from "./scanner";

export {
  isBiometricAvailable,
  getBiometricAvailability,
  verifyBiometric,
  verifyIdentity,
  type BiometricAvailability,
  type BiometricKind,
} from "./biometric";

export {
  useNetworkStatus,
  getNetworkStatus,
  type NetworkStatus,
  type ConnectionType,
} from "./network";

export { capturePhoto, type PhotoResult } from "./camera";

export {
  registerPushNotifications,
  type PushRegistration,
} from "./push";

// iOS-specific helpers (no-op on Android / web)
export {
  setStatusBarStyle,
  setStatusBarOverlay,
  hideSplash,
} from "./status-bar";
export {
  dismissKeyboard,
  subscribeKeyboard,
  type KeyboardListener,
} from "./keyboard";
