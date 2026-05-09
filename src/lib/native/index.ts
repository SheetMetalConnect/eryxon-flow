/**
 * Native iOS bridge — public surface.
 *
 * Every helper here works on the web too: it either no-ops or falls back to a
 * sensible web equivalent. That means feature code can use these
 * unconditionally without splattering `if (isNative())` branches around.
 */

export {
  getCapacitor,
  getPlatform,
  hasFinePointer,
  isIPad,
  isIPhone,
  isNative,
  isNativeIOS,
  shouldUseMobileShell,
} from "./platform";
export type { PlatformId } from "./platform";

export * as Haptics from "./haptics";
export * as Scanner from "./scanner";
export * as Biometric from "./biometric";
export * as StatusBar from "./status-bar";
export * as Keyboard from "./keyboard";

export {
  ScannerPermissionError,
  ScannerUnavailableError,
} from "./scanner";
export type { ScanResult } from "./scanner";
