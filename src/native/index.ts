/**
 * Native bridge layer — barrel export.
 *
 * All Capacitor surface area lives behind this module. Components import from
 * "@/native" only; nothing else should import @capacitor/* directly.
 */

export {
  isNativeApp,
  isAndroidNative,
  isTabletViewport,
} from "./platform";
export { initNativeShell, wireHardwareBack } from "./appShell";
export { haptics } from "./haptics";
export {
  scanOnce,
  isScannerAvailable,
  DEFAULT_FORMATS,
  type ScanFormat,
  type ScanOptions,
  type ScanResult,
} from "./scanner";
export { isBiometricAvailable, verifyBiometric } from "./biometric";
export {
  useNetworkStatus,
  getNetworkStatus,
  type NetworkStatus,
  type ConnectionType,
} from "./network";
export { capturePhoto, type PhotoResult } from "./camera";
