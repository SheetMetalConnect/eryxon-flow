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
      "grid gap-2 sm:gap-3",
      // Responsive grid: 2 cols on mobile, up to 4 on larger screens
      "grid-cols-2 md:grid-cols-4",
      className
    )}>
      {stats.map((stat, index) => {
        const colors = colorClasses[stat.color || "muted"];
        const Icon = stat.icon;

        return (
          <div
            key={index}
            className={cn(
              "glass-card p-2 sm:p-3 flex items-center gap-2 sm:gap-3 transition-all",
              stat.onClick && "cursor-pointer hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
            )}
            onClick={stat.onClick}
          >
            <div className={cn("p-1.5 sm:p-2 rounded-lg shrink-0", colors.bg)}>
              <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", colors.text)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn("text-base sm:text-lg font-bold leading-none", colors.value)}>
                {stat.value}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">
                {stat.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
