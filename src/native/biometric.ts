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
    isAvailable: () => Promise<{ isAvailable: boolean; biometryType?: number }>;
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
