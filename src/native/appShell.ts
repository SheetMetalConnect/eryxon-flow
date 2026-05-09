/**
 * Native app shell init: status bar, splash, hardware back button,
 * universal-link / URL-scheme callback handler.
 *
 * Called once from main.tsx. No-op on the web. Wires the Android hardware
 * back button into React Router so the WebView doesn't consume it and exit
 * the app.
 */

import type { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { isAndroidNative, isNativeApp } from "./platform";

let backUnsub: (() => void) | undefined;
let urlUnsub: (() => void) | undefined;

export async function initNativeShell(): Promise<void> {
  if (!isNativeApp()) return;

  await Promise.allSettled([
    initStatusBar(),
    hideSplash(),
    keyboardSetup(),
    initAuthCallback(),
  ]);
}

async function initStatusBar(): Promise<void> {
  if (!isAndroidNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0B1220" });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    /* status bar plugin may not be installed in some flavors */
  }
}

async function hideSplash(): Promise<void> {
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {
    /* splash plugin may not be installed */
  }
}

async function keyboardSetup(): Promise<void> {
  try {
    const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    await Keyboard.setAccessoryBarVisible({ isVisible: false });
  } catch {
    /* keyboard plugin optional */
  }
}

/**
 * Hand magic-link / OAuth callback URLs back to Supabase.
 *
 * When the operator taps a magic link in their email on a device with the
 * Eryxon app installed, iOS / Android open the app via Universal Link
 * (`https://app.eryxon.eu/auth/callback#access_token=…`) or URL scheme
 * (`eryxon://auth/callback?code=…`). Capacitor surfaces both as an
 * `appUrlOpen` event. Without this listener the WebView would either:
 *
 *   - sit on whatever route the user was on (URL is dropped on the floor), or
 *   - show a "no app to handle this URL" message if no scheme is registered.
 *
 * We:
 *   1. Pull the access_token / refresh_token out of the URL fragment for
 *      legacy Supabase magic links and call `setSession`.
 *   2. Pull the `code` query param out for the OAuth PKCE flow and call
 *      `exchangeCodeForSession`.
 *   3. Fall back to silently logging an unrecognised callback so the dev
 *      can see it in `adb logcat` / Xcode console without crashing the app.
 */
async function initAuthCallback(): Promise<void> {
  try {
    const { App } = await import("@capacitor/app");
    if (urlUnsub) {
      urlUnsub();
      urlUnsub = undefined;
    }
    const handle = await App.addListener("appUrlOpen", (event) => {
      void handleAuthCallback(event.url);
    });
    urlUnsub = () => void handle.remove();
  } catch {
    /* app plugin optional */
  }
}

async function handleAuthCallback(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    logger.warn("appShell", "appUrlOpen received an invalid URL", rawUrl);
    return;
  }

  // Only handle the auth callback path. Anything else (deep links into a
  // job, part, etc.) should be navigated to via React Router by the caller
  // and is not the shell's concern.
  if (!/\/auth\/callback\b/.test(url.pathname) && url.host !== "auth") {
    return;
  }

  // Magic-link + recovery flows put the tokens in the fragment.
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      logger.error("appShell", "setSession from magic link failed", error);
    } else {
      logger.debug("appShell", "Authenticated via magic link");
    }
    return;
  }

  // OAuth PKCE flows put `code` in the query string.
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logger.error("appShell", "exchangeCodeForSession failed", error);
    } else {
      logger.debug("appShell", "Authenticated via OAuth PKCE");
    }
    return;
  }

  logger.warn("appShell", "appUrlOpen on /auth/callback without tokens", rawUrl);
}

/**
 * Returns true when there is an open Radix dialog / sheet / popover /
 * dropdown / context menu currently mounted. We check via the
 * `data-state="open"` attribute that every Radix Primitive sets.
 *
 * The fallback for off-vendor overlays is the standard ARIA
 * `[role=dialog][aria-modal=true]` query, so non-Radix dialogs (e.g. shadcn
 * derived components that bypass the Primitive) are still honored.
 */
function hasOpenOverlay(): boolean {
  if (typeof document === "undefined") return false;
  const radix = document.querySelector(
    "[data-radix-popper-content-wrapper], [data-state='open'][role='dialog'], [data-state='open'][role='alertdialog'], [data-state='open'][role='menu']",
  );
  if (radix) return true;
  return Boolean(document.querySelector("[role='dialog'][aria-modal='true']"));
}

/**
 * Wire Android hardware back button to React Router.
 *
 * Behavior, in order:
 *   1. If a Radix dialog / sheet / popover / dropdown is open, dispatch
 *      an Escape keydown so the overlay closes first. Operators with an
 *      OperationDetailModal up shouldn't get yanked off the page on the
 *      first hardware back press.
 *   2. Otherwise pop one entry off the React Router history.
 *   3. If there's nothing left to pop, minimise the app instead of
 *      letting the WebView exit (which would forget operator state).
 */
export async function wireHardwareBack(navigate: NavigateFunction): Promise<void> {
  if (!isAndroidNative()) return;

  if (backUnsub) {
    backUnsub();
    backUnsub = undefined;
  }

  try {
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("backButton", ({ canGoBack }) => {
      if (hasOpenOverlay()) {
        // Synthesize Escape — Radix listens for this on every Primitive
        // and closes the topmost layer. This works for nested overlays too
        // because Radix only closes the most-recent Stack entry.
        const event = new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
        return;
      }
      if (canGoBack) {
        navigate(-1);
      } else {
        void App.minimizeApp();
      }
    });
    backUnsub = () => void handle.remove();
  } catch {
    /* app plugin optional */
  }
}
