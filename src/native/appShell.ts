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
 * Wire Android hardware back button to React Router. Pops history when there
 * is somewhere to go, otherwise minimises the app. Re-callable safely.
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
