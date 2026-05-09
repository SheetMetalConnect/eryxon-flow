/**
 * Push-notification subscription helper.
 *
 * Capacitor PushNotifications wraps APNs (iOS) and FCM (Android). The flow
 * is the same on both platforms:
 *   1. Ask the OS for permission (silently no-op on second call).
 *   2. Call register() — the plugin emits a `registration` event with the
 *      device token.
 *   3. Forward the token to the Eryxon backend so the existing webhook
 *      dispatcher can fan out lifecycle events (issue.created, etc.) to
 *      that operator's device.
 *
 * The web path is a no-op: PWAs use Notification + Push API instead, which
 * Eryxon doesn't run server-side yet (no VAPID key wired in
 * supabase/functions/webhook-dispatch). This wrapper exposes a clean
 * `registerPushNotifications()` so an admin / operator-context hook can
 * call it on sign-in without re-importing Capacitor itself.
 */

import { isNativeApp } from "./platform";

export interface PushRegistration {
  /** Apple device token (iOS) or FCM registration token (Android). */
  token: string;
  platform: "ios" | "android";
}

interface ListenerHandle {
  remove: () => Promise<void>;
}

interface PushPlugin {
  checkPermissions: () => Promise<{
    receive: "granted" | "denied" | "prompt" | "prompt-with-rationale";
  }>;
  requestPermissions: () => Promise<{
    receive: "granted" | "denied" | "prompt" | "prompt-with-rationale";
  }>;
  register: () => Promise<void>;
  addListener: (
    event: "registration" | "registrationError" | "pushNotificationReceived" | "pushNotificationActionPerformed",
    cb: (payload: unknown) => void,
  ) => Promise<ListenerHandle>;
  removeAllListeners: () => Promise<void>;
}

interface PushModule {
  PushNotifications: PushPlugin;
}

/**
 * Request permission and resolve with the device token. Resolves null on:
 *   - the web (no Capacitor bridge),
 *   - permission denied (we don't re-prompt; the caller can show an
 *     in-app explainer),
 *   - registration timeout (15s).
 */
export async function registerPushNotifications(): Promise<PushRegistration | null> {
  if (!isNativeApp()) return null;
  let mod: PushModule;
  try {
    mod = (await import(
      "@capacitor/push-notifications"
    )) as unknown as PushModule;
  } catch {
    return null;
  }

  const { PushNotifications } = mod;
  // Don't re-prompt if the user has already declined.
  const current = await PushNotifications.checkPermissions();
  if (current.receive === "denied") return null;
  if (current.receive !== "granted") {
    const granted = await PushNotifications.requestPermissions();
    if (granted.receive !== "granted") return null;
  }

  const platform = await detectPlatform();

  return new Promise<PushRegistration | null>((resolve) => {
    let settled = false;
    const settle = (value: PushRegistration | null) => {
      if (settled) return;
      settled = true;
      void PushNotifications.removeAllListeners();
      resolve(value);
    };

    PushNotifications.addListener("registration", (payload) => {
      const token = (payload as { value?: string }).value;
      if (!token) return;
      settle({ token, platform });
    }).catch(() => settle(null));

    PushNotifications.addListener("registrationError", () => {
      settle(null);
    }).catch(() => settle(null));

    void PushNotifications.register().catch(() => settle(null));

    // 15-second hard timeout — the OS will keep retrying its own handshake
    // in the background, but we don't want to block the operator's sign-in
    // flow waiting on the network.
    setTimeout(() => settle(null), 15_000);
  });
}

async function detectPlatform(): Promise<"ios" | "android"> {
  // Avoid an extra dynamic import — fall back to a UA sniff if the
  // Capacitor global isn't available.
  const cap = (window as unknown as {
    Capacitor?: { getPlatform?: () => string };
  }).Capacitor;
  const native = cap?.getPlatform?.();
  if (native === "ios" || native === "android") return native;
  return /Android/.test(navigator.userAgent) ? "android" : "ios";
}
