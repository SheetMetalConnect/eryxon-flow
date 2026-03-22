import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  } | ReactNode;
  children?: ReactNode;
}

/**
 * Standardized admin page header component.
 * Provides consistent styling across all admin pages:
 * - Responsive title (xl on mobile, 2xl on larger screens)
 * - text-sm muted description
 * - Optional CTA button (full-width on mobile, inline on larger screens)
 * - title-divider below
 */
export function AdminPageHeader({
  title,
  description,
  action,
  children,
}: AdminPageHeaderProps) {
  const { t } = useTranslation();
  const isActionObject = action && typeof action === 'object' && 'onClick' in action;
  const ActionIcon = isActionObject ? action.icon : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("common.workspace", "Workspace")}
          </div>
          <h1 className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
            {title}
          </h1>
          {description && (
            <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {children}
          {action && isActionObject && (
            <Button
              onClick={action.onClick}
              className="cta-button min-h-11 rounded-xl px-4"
            >
              {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {action && !isActionObject && (action as ReactNode)}
        </div>
      </div>
      <hr className="title-divider" />
    </div>
  );
}
