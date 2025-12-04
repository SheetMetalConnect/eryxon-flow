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
 * - text-2xl gradient title
 * - text-sm muted description
 * - Optional CTA button on right
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
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            {title}
          </h1>
          <div className="flex items-center gap-2">
            {children}
            {action && (
              <Button onClick={action.onClick} className="cta-button">
                {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                {action.label}
              </Button>
            )}
          </div>
        </div>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <hr className="title-divider" />
    </div>
  );
}
