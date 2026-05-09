import { useEffect, useState } from "react";
import {
  getPlatform,
  hasFinePointer,
  isIPad,
  isIPhone,
  isNative,
  isNativeIOS,
  shouldUseMobileShell,
  type PlatformId,
} from "@/lib/native";

export interface NativeContext {
  platform: PlatformId;
  isNative: boolean;
  isNativeIOS: boolean;
  isIPad: boolean;
  isIPhone: boolean;
  isMobileShell: boolean;
  hasFinePointer: boolean;
}

/**
 * Reactive platform context. Re-evaluates when the viewport changes (so
 * iPad split-view + Slide Over kick the layout into the right shell).
 */
export function useNative(): NativeContext {
  const [snapshot, setSnapshot] = useState<NativeContext>(() => snapshotNow());

  useEffect(() => {
    const onResize = () => setSnapshot(snapshotNow());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return snapshot;
}

function snapshotNow(): NativeContext {
  return {
    platform: getPlatform(),
    isNative: isNative(),
    isNativeIOS: isNativeIOS(),
    isIPad: isIPad(),
    isIPhone: isIPhone(),
    isMobileShell: shouldUseMobileShell(),
    hasFinePointer: hasFinePointer(),
  };
}
