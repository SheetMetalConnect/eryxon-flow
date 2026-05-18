import { useMemo } from "react";
import { haptics } from "@/native";

/**
 * Stable references to the most common haptic patterns. Memoized once so
 * passing them into `useEffect` / `useCallback` deps doesn't bust
 * dependency arrays.
 *
 * Each helper degrades to `navigator.vibrate` on the web (where supported)
 * and to a no-op everywhere else, so feature code can fire `light()` after
 * every confirmed clock-in without guarding the call site.
 */
export function useHaptics() {
  return useMemo(
    () => ({
      light: () => haptics.tap("light"),
      medium: () => haptics.tap("medium"),
      heavy: () => haptics.tap("heavy"),
      selection: () => haptics.select(),
      success: () => haptics.success(),
      warning: () => haptics.warning(),
      error: () => haptics.error(),
    }),
    [],
  );
}
