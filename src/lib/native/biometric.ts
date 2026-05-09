/**
 * Biometric authentication wrapper. Used to unlock the operator switcher
 * with Face ID / Touch ID instead of typing a 6-digit PIN every time the
 * device wakes from sleep.
 *
 * The PIN flow stays as a fallback — biometric is a UX accelerant, not a
 * replacement, because shared shop-floor iPads can have multiple operator
 * faces enrolled.
 */

import { isNative } from "./platform";

export type BiometricKind = "face" | "touch" | "none";

export interface BiometricAvailability {
  available: boolean;
  kind: BiometricKind;
  reason?: string;
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  if (!isNative()) return { available: false, kind: "none", reason: "web" };
  try {
    const mod = await import("@capgo/capacitor-native-biometric");
    const result = await mod.NativeBiometric.isAvailable({
      useFallback: false,
    });
    if (!result.isAvailable) {
      return { available: false, kind: "none", reason: result.errorCode };
    }
    // BiometryType: 1 = TouchID, 2 = FaceID, 3 = Fingerprint, 4 = FaceAuth.
    const isFace = result.biometryType === 2 || result.biometryType === 4;
    return { available: true, kind: isFace ? "face" : "touch" };
  } catch {
    return { available: false, kind: "none", reason: "load_failed" };
  }
}

/**
 * Prompt the system biometric sheet. Returns `true` only if the user
 * successfully authenticated; cancellation and failure both return `false`
 * so the caller can re-prompt or fall back to PIN entry.
 */
export async function verifyIdentity(reason: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const mod = await import("@capgo/capacitor-native-biometric");
    await mod.NativeBiometric.verifyIdentity({
      reason,
      title: "Eryxon Flow",
      subtitle: "Confirm operator",
      description: reason,
    });
    return true;
  } catch {
    return false;
  }
}
