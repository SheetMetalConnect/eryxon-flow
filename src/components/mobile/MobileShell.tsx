import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { OfflineBanner } from "./OfflineBanner";
import { ScanFab } from "./ScanFab";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { isAndroidNative, isNativeApp } from "@/native";

interface MobileShellProps {
  children: React.ReactNode;
  /** Show the floating scan FAB on this page. Default true on operator routes. */
  showScanFab?: boolean;
  /** Where the FAB should send the scanned code. */
  scanTargetPath?: string;
}

/** Touch-class viewport: phones, tablets, small windows, kiosks. */
const TOUCH_QUERY = "(pointer: coarse), (max-width: 1023px)";

function evaluateMobile(): boolean {
  if (isNativeApp()) return true;
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(TOUCH_QUERY).matches;
}

/**
 * Top-level mobile shell that wraps every authenticated page.
 *
 * - Hardware back wired into router (Android only)
 * - Offline banner pinned to the top
 * - Floating scan FAB on operator routes
 * - Adds the `app-mobile` class to the body when we're actually on a mobile /
 *   touch viewport — desktop browser sessions stay on the dense admin layout.
 *   Reacts to viewport changes (devtools toggling, foldable unfolds).
 */
export function MobileShell({
  children,
  showScanFab,
  scanTargetPath,
}: MobileShellProps) {
  useHardwareBack();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState<boolean>(evaluateMobile);

  useEffect(() => {
    // Native always evaluates true via evaluateMobile() in the lazy initializer
    // — no listener needed since the platform doesn't change at runtime.
    if (isNativeApp()) return;
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(TOUCH_QUERY);
    const update = () => setIsMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const classes = isAndroidNative()
      ? ["app-mobile", "app-android"]
      : ["app-mobile"];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, [isMobile]);

  const onOperatorPath = location.pathname.startsWith("/operator/");
  const fab = (showScanFab ?? onOperatorPath) && isMobile;

  return (
    <>
      <div className="safe-area-top">
        <OfflineBanner />
      </div>
      {children}
      {fab && (
        <ScanFab
          targetPath={scanTargetPath ?? "/operator/work-queue"}
          paramName="q"
        />
      )}
    </>
  );
}
