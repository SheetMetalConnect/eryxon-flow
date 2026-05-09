import { useEffect, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  ListChecks,
  Clock,
  Flag,
  ScanLine,
  Gauge,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeMode } from "@/theme/ThemeProvider";
import { useNative } from "@/hooks/useNative";
import { usePendingIssuesCount } from "@/hooks/usePendingIssuesCount";
import { setStatusBarStyle, hideSplash } from "@/lib/native/status-bar";
import { BottomTabBar, type MobileTab } from "./BottomTabBar";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children?: ReactNode;
}

/**
 * Top-level shell for the touch-first iOS / iPad experience.
 *
 * - iPhone: full-bleed page + sticky bottom tab bar.
 * - iPad: same shell, but pages opt-in to the split-view layout via
 *   `<IPadSplit>` so admins reading at a desk see two-pane comfort while
 *   operators on iPad mini stay focused on one view.
 */
export function MobileShell({ children }: MobileShellProps) {
  const { t } = useTranslation();
  const native = useNative();
  const { resolvedTheme } = useThemeMode();
  const location = useLocation();
  const { count: pendingIssues } = usePendingIssuesCount();

  // Keep the iOS status bar in lockstep with the React theme. Light/dark mode
  // toggling without this is jarring because the OS bar lags by a frame.
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

  // Hide tab bar on full-screen flows (scanner, login) so the camera viewport
  // and PIN keypad get the entire screen.
  const hideTabBar = /^\/m\/(scan|login)/.test(location.pathname);

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-background text-foreground",
        // Reserve space for the home-indicator gutter when the tab bar is
        // visible, so scrolling content never lands underneath it.
        !hideTabBar && "pb-[calc(56px+env(safe-area-inset-bottom))]",
      )}
      data-platform={native.platform}
      data-native={native.isNative ? "true" : "false"}
    >
      <main className="flex flex-1 flex-col">
        {children ?? <Outlet />}
      </main>
      {hideTabBar ? null : <BottomTabBar tabs={tabs} />}
    </div>
  );
}
