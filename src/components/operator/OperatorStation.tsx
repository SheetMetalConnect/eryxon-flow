import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "active" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "border-border bg-card text-foreground",
  active: "border-primary/30 bg-primary/5 text-primary",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

interface OperatorPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function OperatorPageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: OperatorPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {meta ? <div className="flex flex-wrap gap-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

interface OperatorPanelProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function OperatorPanel({
  className,
  padded = true,
  ...props
}: OperatorPanelProps) {
  return (
    <Card
      className={cn(
        "border-border/80 bg-card/95 shadow-sm backdrop-blur-sm",
        padded && "p-4 sm:p-5",
        className,
      )}
      {...props}
    />
  );
}

interface OperatorStatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  caption?: string;
  className?: string;
}

export function OperatorStatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  caption,
  className,
}: OperatorStatCardProps) {
  return (
    <OperatorPanel className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </div>
          {caption ? (
            <div className="text-sm text-muted-foreground">{caption}</div>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border",
              toneClasses[tone],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </OperatorPanel>
  );
}

interface OperatorStatusChipProps {
  icon?: LucideIcon;
  label: string;
  tone?: Tone;
  className?: string;
}

export function OperatorStatusChip({
  icon: Icon,
  label,
  tone = "neutral",
  className,
}: OperatorStatusChipProps) {
  return (
    <div
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      <span>{label}</span>
    </div>
  );
}

interface OperatorEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function OperatorEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: OperatorEmptyStateProps) {
  return (
    <OperatorPanel
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center gap-4 text-center",
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/30">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </OperatorPanel>
  );
}
