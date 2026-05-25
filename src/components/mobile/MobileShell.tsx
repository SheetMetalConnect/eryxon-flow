import { useEffect, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  Clock,
  Flag,
  Gauge,
  ListChecks,
  ScanLine,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeMode } from "@/theme/ThemeProvider";
import { useNative } from "@/hooks/useNative";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { usePendingIssuesCount } from "@/hooks/usePendingIssuesCount";
import { hideSplash, isAndroidNative, setStatusBarStyle } from "@/native";
import { BottomTabBar, type MobileTab } from "./BottomTabBar";
import { OfflineBanner } from "./OfflineBanner";

interface MobileShellProps {
  children?: ReactNode;
}

/**
 * Top-level shell for the touch-first iOS / iPadOS / Android experience.
 *
 * - iPhone / Android phone: full-bleed page + sticky bottom tab bar.
 * - iPad / Android tablet: same shell, but pages opt-in to a split-view
 *   layout via `<IPadSplit>` so admins on iPad get two-pane comfort while
 *   operators on smaller tablets stay focused on one view.
 * - Hardware back (Android) is routed through React Router via
 *   `useHardwareBack` so the WebView doesn't drop the user out of the app.
 * - Offline banner is pinned just under the status bar so operators on
 *   shop-floor WiFi notice connectivity hiccups immediately.
 */
export function MobileShell({ children }: MobileShellProps) {
  const { t } = useTranslation();
  const native = useNative();
  const { resolvedTheme } = useThemeMode();
  const location = useLocation();
  const { count: pendingIssues } = usePendingIssuesCount();

  // Wires the Android hardware back button into router history so the
  // WebView doesn't consume it and exit the app.
  useHardwareBack();

  // Tag the body so global CSS (`mobile.css`, `mobile-ios.css`) can apply
  // safe-area / touch-target overrides without leaking into the desktop SPA.
  useEffect(() => {
    const classes = isAndroidNative()
      ? ["app-mobile", "app-android"]
      : ["app-mobile"];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, []);

  // Keep the native status bar in lockstep with the React theme. Light/dark
  // mode toggling without this is jarring because the OS bar lags by a frame.
  useEffect(() => {
    void setStatusBarStyle(resolvedTheme);
  }, [resolvedTheme]);

  // The native splash screen stays up until React paints — hide it now that
  // the shell is mounted. Safe to call on the web (no-ops).
  useEffect(() => {
    void hideSplash();
  }, []);

  const tabs: MobileTab[] = [
    {
      to: "/m/queue",
      label: t("navigation.workQueue", "Queue"),
      icon: <ListChecks className="h-5 w-5" />,
    },
    {
      to: "/m/scan",
      label: t("mobile.scan", "Scan"),
      icon: <ScanLine className="h-5 w-5" />,
    },
    {
      to: "/m/activity",
      label: t("navigation.myActivity", "Activity"),
      icon: <Clock className="h-5 w-5" />,
    },
    {
      to: "/m/issues",
      label: t("navigation.myIssues", "Issues"),
      icon: <Flag className="h-5 w-5" />,
      badge: pendingIssues > 0 ? pendingIssues : null,
    },
    {
      to: "/m/terminal",
      label: t("navigation.terminalView", "Terminal"),
      icon: <Gauge className="h-5 w-5" />,
    },
  ];

  // Hide the tab bar on full-screen flows (scanner, login) so the camera
  // viewport and PIN keypad get the entire screen.
  const hideTabBar = /^\/m\/(scan|login)/.test(location.pathname);

  return (
    <div
      className="flex flex-col bg-background text-foreground"
      data-platform={native.platform}
      data-native={native.isNative ? "true" : "false"}
      // Reserve space for the home-indicator / system-nav gutter when the
      // tab bar is visible. The `<main>` below carries `min-h-0 flex-1`
      // which already gives the page its full height — adding `min-h-screen`
      // here was duplicating chrome height with the operator pages and
      // pushing scroll content under the safe-area inset.
      style={
        hideTabBar
          ? undefined
          : { paddingBottom: "calc(56px + env(safe-area-inset-bottom))" }
      }
    >
      <OfflineBanner />
      <main className="flex min-h-0 flex-1 flex-col">
        {children ?? <Outlet />}
      </main>
      {hideTabBar ? null : <BottomTabBar tabs={tabs} />}
    </div>
  );
}
