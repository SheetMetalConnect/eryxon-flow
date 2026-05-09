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
 * Returns true if there's an open overlay (dialog, sheet, popover, dropdown,
 * combobox) that should consume the back button before it pops the route.
 * Operators routinely have an OperationDetailModal open over the queue —
 * back must close it, not navigate them off the page.
 */
function hasOpenOverlay(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.querySelector(
    [
      '[role="dialog"][data-state="open"]',
      '[role="alertdialog"][data-state="open"]',
      '[role="menu"][data-state="open"]',
      '[role="listbox"][data-state="open"]',
      '[data-radix-popper-content-wrapper]',
      '[data-state="open"][data-radix-dialog-content]',
      '[data-vaul-drawer][data-state="open"]',
    ].join(",")
  );
}

/**
 * Wire Android hardware back button to React Router.
 *
 * Order of precedence:
 *   1. Open dialog / sheet / popover → dispatch Escape so Radix closes it.
 *   2. Browser history exists → navigate(-1).
 *   3. Otherwise → minimise the app (Android convention; never exit hard).
 *
 * Re-callable safely; we drop any prior listener before adding a new one.
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
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
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
