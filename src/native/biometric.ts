/**
 * Biometric authentication wrapper.
 *
 * Wraps Capgo's NativeBiometric plugin. Used by the operator terminal so a
 * worker can re-confirm identity via fingerprint/face on Pixel/Samsung tablets
 * without re-typing a PIN. Returns false on the web (no equivalent without WebAuthn).
 */

import { isNativeApp } from "./platform";

interface NativeBiometricModule {
  NativeBiometric: {
    isAvailable: (opts?: {
      useFallback?: boolean;
    }) => Promise<{
      isAvailable: boolean;
      biometryType?: number;
      errorCode?: string;
    }>;
    verifyIdentity: (opts: {
      reason?: string;
      title?: string;
      subtitle?: string;
      description?: string;
      negativeButtonText?: string;
      maxAttempts?: number;
    }) => Promise<void>;
  };
}

export type BiometricKind = "face" | "touch" | "none";

export interface BiometricAvailability {
  available: boolean;
  kind: BiometricKind;
  reason?: string;
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const mod = (await import(
      "@capgo/capacitor-native-biometric"
    )) as unknown as NativeBiometricModule;
    const { isAvailable } = await mod.NativeBiometric.isAvailable();
    return isAvailable;
  } catch {
    return false;
  }
}

/**
 * Richer availability probe that also reports which sensor is enrolled, so
 * the iOS login screen can label the unlock button "Face ID" vs "Touch ID".
 *
 * `BiometryType` (per the Capgo plugin):
 *   1 = TouchID, 2 = FaceID, 3 = Fingerprint (Android), 4 = FaceAuth.
 */
export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  if (!isNativeApp()) return { available: false, kind: "none", reason: "web" };
  try {
    const mod = (await import(
      "@capgo/capacitor-native-biometric"
    )) as unknown as NativeBiometricModule;
    const result = await mod.NativeBiometric.isAvailable({ useFallback: false });
    if (!result.isAvailable) {
      return { available: false, kind: "none", reason: result.errorCode };
    }
    const isFace = result.biometryType === 2 || result.biometryType === 4;
    return { available: true, kind: isFace ? "face" : "touch" };
  } catch {
    return { available: false, kind: "none", reason: "load_failed" };
  }
}

export async function verifyBiometric(opts: {
  reason: string;
  title?: string;
  subtitle?: string;
}): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const mod = (await import(
      "@capgo/capacitor-native-biometric"
    )) as unknown as NativeBiometricModule;
    await mod.NativeBiometric.verifyIdentity({
      reason: opts.reason,
      title: opts.title ?? "Verify identity",
      subtitle: opts.subtitle,
      negativeButtonText: "Cancel",
      maxAttempts: 3,
    });
    return true;
  } catch {
    return false;
  }
}

/** Compat alias for the iOS-shell call site. */
export async function verifyIdentity(reason: string): Promise<boolean> {
  return verifyBiometric({ reason, title: "Eryxon Flow", subtitle: "Confirm operator" });
}
