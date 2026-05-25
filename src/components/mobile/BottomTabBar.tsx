import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";

export interface MobileTab {
  to: string;
  label: string;
  icon: ReactNode;
  /** Optional small badge (issue count, active timers, etc). */
  badge?: number | null;
}

interface BottomTabBarProps {
  tabs: MobileTab[];
}

/**
 * Native-feel bottom tab bar. Lives behind a `safe-area-inset-bottom` cushion
 * so it stays clear of the home indicator on Face ID iPhones, and uses
 * `backdrop-blur` to hint at the live content behind it (matches the
 * Music / Reminders chrome).
 */
export function BottomTabBar({ tabs }: BottomTabBarProps) {
  const haptics = useHaptics();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40",
        "border-t border-border/60",
        "bg-background/85 backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-background/70",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-14 max-w-3xl items-stretch justify-around px-2">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              onClick={() => void haptics.selection()}
              className={({ isActive }) =>
                cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 rounded-lg",
                  "min-h-[48px] min-w-[48px] px-1 text-[10px] font-medium",
                  "transition-colors duration-150",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground",
                )
              }
            >
              <span className="relative grid h-6 w-6 place-items-center">
                {tab.icon}
                {typeof tab.badge === "number" && tab.badge > 0 ? (
                  <span
                    className={cn(
                      "absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center",
                      "rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white",
                    )}
                    aria-label={`${tab.badge} unread`}
                  >
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                ) : null}
              </span>
              <span className="leading-none">{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
