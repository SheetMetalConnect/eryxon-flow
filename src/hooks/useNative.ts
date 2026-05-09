import { useEffect, useState } from "react";
import {
  getPlatform,
  hasFinePointer,
  isAndroidNative,
  isIPad,
  isIPhone,
  isNativeApp,
  isNativeIOS,
  shouldUseMobileShell,
  type PlatformId,
} from "@/native";

export interface NativeContext {
  platform: PlatformId;
  isNative: boolean;
  isNativeIOS: boolean;
  isAndroidNative: boolean;
  isIPad: boolean;
  isIPhone: boolean;
  isMobileShell: boolean;
  hasFinePointer: boolean;
}

/**
 * Reactive platform context. Re-evaluates when the viewport changes — iPad
 * Slide Over and Android freeform both trigger us to swap shell variants.
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
    isNative: isNativeApp(),
    isNativeIOS: isNativeIOS(),
    isAndroidNative: isAndroidNative(),
    isIPad: isIPad(),
    isIPhone: isIPhone(),
    isMobileShell: shouldUseMobileShell(),
    hasFinePointer: hasFinePointer(),
  };
}
