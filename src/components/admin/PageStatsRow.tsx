import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: "primary" | "success" | "warning" | "error" | "info" | "muted";
  onClick?: () => void;
}

interface PageStatsRowProps {
  stats: StatItem[];
  className?: string;
}

const colorClasses = {
  primary: {
    bg: "bg-[hsl(var(--brand-primary))]/10",
    text: "text-[hsl(var(--brand-primary))]",
    value: "text-[hsl(var(--brand-primary))]",
  },
  success: {
    bg: "bg-[hsl(var(--color-success))]/10",
    text: "text-[hsl(var(--color-success))]",
    value: "text-[hsl(var(--color-success))]",
  },
  warning: {
    bg: "bg-[hsl(var(--color-warning))]/10",
    text: "text-[hsl(var(--color-warning))]",
    value: "text-[hsl(var(--color-warning))]",
  },
  error: {
    bg: "bg-[hsl(var(--color-error))]/10",
    text: "text-[hsl(var(--color-error))]",
    value: "text-[hsl(var(--color-error))]",
  },
  info: {
    bg: "bg-[hsl(var(--color-info))]/10",
    text: "text-[hsl(var(--color-info))]",
    value: "text-[hsl(var(--color-info))]",
  },
  muted: {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    value: "text-foreground",
  },
};

/**
 * Compact stats row for admin pages.
 * Displays 3-4 key metrics in a responsive grid.
 * Mobile: 2 columns, Tablet+: up to 4 columns
 */
export function PageStatsRow({ stats, className }: PageStatsRowProps) {
  return (
    <div className={cn(
      "grid gap-3",
      "grid-cols-2 md:grid-cols-4",
      className
    )}>
      {stats.map((stat, index) => {
        const colors = colorClasses[stat.color || "muted"];
        const Icon = stat.icon;

        const content = (
          <>
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                colors.bg,
              )}
            >
              <Icon className={cn("h-4 w-4", colors.text)} />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "text-xl font-semibold leading-none tracking-tight",
                  colors.value,
                )}
              >
                {stat.value}
              </div>
              <div className="mt-1 truncate text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {stat.label}
              </div>
            </div>
          </>
        );

        if (stat.onClick) {
          return (
            <button
              key={index}
              type="button"
              className="glass-card flex min-h-[96px] w-full items-center gap-3 rounded-2xl border border-border/80 p-4 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/20"
              onClick={stat.onClick}
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={index}
            className="glass-card flex min-h-[96px] w-full items-center gap-3 rounded-2xl border border-border/80 p-4 text-left shadow-sm"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
