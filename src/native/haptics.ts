/**
 * Haptic feedback wrapper.
 *
 * On Android (Capacitor) we use the Haptics plugin for proper vibration motors.
 * On the web we fall back to the standard navigator.vibrate API where available.
 * Operators on the shop floor benefit from clear tactile confirmation when
 * starting/stopping work, so we keep the surface tiny: success / warning / error / select.
 */

import { isNativeApp } from "./platform";

type Style = "light" | "medium" | "heavy";

async function nativeImpact(style: Style): Promise<void> {
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  const map = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  };
  await Haptics.impact({ style: map[style] });
}

type NotifyKind = "Success" | "Warning" | "Error";

async function nativeNotification(kind: NotifyKind): Promise<void> {
  const { Haptics, NotificationType } = await import("@capacitor/haptics");
  await Haptics.notification({ type: NotificationType[kind] });
}

function webVibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  const n = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  n.vibrate?.(pattern);
}

export const haptics = {
  async select(): Promise<void> {
    if (isNativeApp()) {
      try {
        const { Haptics } = await import("@capacitor/haptics");
        await Haptics.selectionStart();
        await Haptics.selectionEnd();
        return;
      } catch {
        /* fall through */
      }
    }
    webVibrate(10);
  },

  async tap(style: Style = "light"): Promise<void> {
    if (isNativeApp()) {
      try {
        await nativeImpact(style);
        return;
      } catch {
        /* fall through */
      }
    }
    webVibrate(style === "heavy" ? 30 : style === "medium" ? 20 : 10);
  },

  async success(): Promise<void> {
    if (isNativeApp()) {
      try {
        await nativeNotification("Success");
        return;
      } catch {
        /* fall through */
      }
    }
    webVibrate([15, 50, 15]);
  },

  async warning(): Promise<void> {
    if (isNativeApp()) {
      try {
        await nativeNotification("Warning");
        return;
      } catch {
        /* fall through */
      }
    }
    webVibrate([30, 30, 30]);
  },

  async error(): Promise<void> {
    if (isNativeApp()) {
      try {
        await nativeNotification("Error");
        return;
      } catch {
        /* fall through */
      }
    }
    webVibrate([60, 40, 60]);
  },
};
