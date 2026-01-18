import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
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
  const ActionIcon = action?.icon;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        {/* Header row - stacks on mobile, inline on larger screens */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 mb-1">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            {title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {children}
            {action && (
              <Button
                onClick={action.onClick}
                className="cta-button w-full sm:w-auto justify-center"
              >
                {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                {action.label}
              </Button>
            )}
          </div>
        </div>
        {description && (
          <p className="text-muted-foreground text-xs sm:text-sm">{description}</p>
        )}
      </div>
      <hr className="title-divider" />
    </div>
  );
}
