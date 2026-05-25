import { type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";

interface MobileTopBarProps {
  title: ReactNode;
  /** Optional kicker text rendered above the title (e.g. station name). */
  kicker?: ReactNode;
  /** Show a back chevron + navigate(-1). */
  showBack?: boolean;
  /** Trailing slot for custom actions (search, filter, scan). */
  trailing?: ReactNode;
  /** Leading slot to override the default back / menu. */
  leading?: ReactNode;
  className?: string;
  /** When true, render with extra status-bar padding (status bar overlay). */
  withStatusBar?: boolean;
}

/**
 * iOS-style large title bar. Sticky, blurred, and aware of the safe-area
 * inset reported by the WebView so it doesn't slip under the dynamic island
 * on iPhone 15 / 16 Pro.
 */
export function MobileTopBar({
  title,
  kicker,
  showBack,
  trailing,
  leading,
  className,
  withStatusBar = true,
}: MobileTopBarProps) {
  const navigate = useNavigate();
  const haptics = useHaptics();

  return (
    <header
      className={cn(
        "sticky top-0 z-30",
        "border-b border-border/40",
        "bg-background/85 backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-background/70",
        className,
      )}
      style={withStatusBar ? { paddingTop: "env(safe-area-inset-top)" } : undefined}
    >
      <div className="flex min-h-[44px] items-center gap-2 px-3">
        <div className="flex min-w-[44px] items-center">
          {leading ? (
            leading
          ) : showBack ? (
            <button
              type="button"
              onClick={() => {
                void haptics.light();
                navigate(-1);
              }}
              className={cn(
                "-ml-1 flex h-10 items-center gap-0.5 rounded-md px-1 text-primary",
                "active:bg-primary/10",
              )}
              aria-label="Back"
            >
              <ChevronLeft className="h-6 w-6" />
              <span className="text-[15px] font-medium">Back</span>
            </button>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          {kicker ? (
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {kicker}
            </span>
          ) : null}
          <span className="truncate text-[15px] font-semibold text-foreground">
            {title}
          </span>
        </div>

        <div className="flex min-w-[44px] items-center justify-end gap-1">
          {trailing}
        </div>
      </div>
    </header>
  );
}
