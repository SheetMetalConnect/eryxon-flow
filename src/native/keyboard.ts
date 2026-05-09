/**
 * Keyboard helpers for the iOS shell. We only really need two things:
 * 1. Subscribe to keyboard show/hide so the bottom tab bar can slide out of
 *    the way without the WebView resizing under it.
 * 2. Force-dismiss the keyboard after a successful submit (because the
 *    WebView leaves it sticky after a programmatic blur).
 */

import { isNative } from "./platform";

export type KeyboardListener = (visible: boolean, height: number) => void;

let lastModule: typeof import("@capacitor/keyboard") | null = null;

async function load() {
  if (!isNative()) return null;
  if (lastModule) return lastModule;
  try {
    lastModule = await import("@capacitor/keyboard");
    return lastModule;
  } catch {
    return null;
  }
}

export async function dismissKeyboard(): Promise<void> {
  const mod = await load();
  if (!mod) {
    if (typeof document !== "undefined") {
      const active = document.activeElement as HTMLElement | null;
      active?.blur?.();
    }
    return;
  }
  try {
    await mod.Keyboard.hide();
  } catch {
    /* ignore */
  }
}

export async function subscribeKeyboard(
  listener: KeyboardListener,
): Promise<() => void> {
  const mod = await load();
  if (!mod) return () => {};
  const showHandle = await mod.Keyboard.addListener(
    "keyboardWillShow",
    (info) => listener(true, info.keyboardHeight),
  );
  const hideHandle = await mod.Keyboard.addListener(
    "keyboardWillHide",
    () => listener(false, 0),
  );
  return () => {
    showHandle.remove();
    hideHandle.remove();
  };
}
