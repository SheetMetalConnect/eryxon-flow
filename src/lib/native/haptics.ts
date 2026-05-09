/**
 * Haptic feedback wrapper. Calls into the Capacitor Haptics plugin when
 * available and degrades to a no-op on the web — so feature code can fire
 * `tapLight()` after every confirmed clock-in without guarding the call site.
 *
 * The plugin is dynamically imported on first use so the browser bundle never
 * pays the parse cost when the app is run as a PWA.
 */

import { isNative } from "./platform";

type HapticsModule = typeof import("@capacitor/haptics");

let cached: HapticsModule | null = null;
let loadPromise: Promise<HapticsModule | null> | null = null;

async function load(): Promise<HapticsModule | null> {
  if (!isNative()) return null;
  if (cached) return cached;
  if (!loadPromise) {
    loadPromise = import("@capacitor/haptics")
      .then((mod) => {
        cached = mod;
        return mod;
      })
      .catch(() => null);
  }
  return loadPromise;
}

/** Subtle confirmation — swipe, tab change, list selection. */
export async function tapLight(): Promise<void> {
  const mod = await load();
  if (!mod) return;
  try {
    await mod.Haptics.impact({ style: mod.ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}

/** Mid-weight confirm — start/stop timer, accept dialog. */
export async function tapMedium(): Promise<void> {
  const mod = await load();
  if (!mod) return;
  try {
    await mod.Haptics.impact({ style: mod.ImpactStyle.Medium });
  } catch {
    /* ignore */
  }
}

/** Heavy confirm — completing an operation, irreversible action. */
export async function tapHeavy(): Promise<void> {
  const mod = await load();
  if (!mod) return;
  try {
    await mod.Haptics.impact({ style: mod.ImpactStyle.Heavy });
  } catch {
    /* ignore */
  }
}

/** Selection click — used for picker scrubs, segmented controls. */
export async function selection(): Promise<void> {
  const mod = await load();
  if (!mod) return;
  try {
    await mod.Haptics.selectionStart();
    await mod.Haptics.selectionEnd();
  } catch {
    /* ignore */
  }
}

/** Notification feedback — success, warning, error. */
export async function notify(
  kind: "success" | "warning" | "error",
): Promise<void> {
  const mod = await load();
  if (!mod) return;
  try {
    const map = {
      success: mod.NotificationType.Success,
      warning: mod.NotificationType.Warning,
      error: mod.NotificationType.Error,
    };
    await mod.Haptics.notification({ type: map[kind] });
  } catch {
    /* ignore */
  }
}
