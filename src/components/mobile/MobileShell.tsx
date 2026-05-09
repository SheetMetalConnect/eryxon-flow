import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { OfflineBanner } from "./OfflineBanner";
import { ScanFab } from "./ScanFab";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { isAndroidNative } from "@/native";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: React.ReactNode;
  /** Show the floating scan FAB on this page. Default true on operator routes. */
  showScanFab?: boolean;
  /** Where the FAB should send the scanned code. */
  scanTargetPath?: string;
}

/**
 * Top-level mobile shell that wraps every authenticated page.
 *
 * - Hardware back wired into router (Android only)
 * - Offline banner pinned to the top
 * - Floating scan FAB on operator routes
 * - Adds the `app-mobile` class to the body so global CSS can apply
 *   safe-area / Material You overrides without leaking into the desktop SPA
 */
export function MobileShell({
  children,
  showScanFab,
  scanTargetPath,
}: MobileShellProps) {
  useHardwareBack();
  const location = useLocation();

  useEffect(() => {
    const cls = isAndroidNative() ? "app-android app-mobile" : "app-mobile";
    document.body.classList.add(...cls.split(" "));
    return () => document.body.classList.remove(...cls.split(" "));
  }, []);

  const onOperatorPath = location.pathname.startsWith("/operator/");
  const fab = showScanFab ?? onOperatorPath;

  return (
    <div className={cn("min-h-screen bg-background")}>
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
    </div>
  );
}
