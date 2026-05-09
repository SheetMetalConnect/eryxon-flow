/**
 * Native app shell init: status bar, splash, hardware back button, deep links.
 *
 * Called once from main.tsx. No-op on the web. Wires the Android hardware back
 * button into React Router so the WebView doesn't consume it and exit the app.
 */

import type { NavigateFunction } from "react-router-dom";
import { isAndroidNative, isNativeApp } from "./platform";

let backUnsub: (() => void) | undefined;

export async function initNativeShell(): Promise<void> {
  if (!isNativeApp()) return;

  await Promise.allSettled([initStatusBar(), hideSplash(), keyboardSetup()]);
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
