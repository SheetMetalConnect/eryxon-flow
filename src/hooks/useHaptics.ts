import { useMemo } from "react";
import { Haptics } from "@/lib/native";

/**
 * Convenience hook returning stable references to the most common haptic
 * patterns. Memoized so passing them into callbacks doesn't bust effect
 * dependencies.
 */
export function useHaptics() {
  return useMemo(
    () => ({
      light: Haptics.tapLight,
      medium: Haptics.tapMedium,
      heavy: Haptics.tapHeavy,
      selection: Haptics.selection,
      success: () => Haptics.notify("success"),
      warning: () => Haptics.notify("warning"),
      error: () => Haptics.notify("error"),
    }),
    [],
  );
}
