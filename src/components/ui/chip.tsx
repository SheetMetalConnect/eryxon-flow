import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary border border-primary/20",
        secondary: "bg-secondary text-secondary-foreground border border-secondary",
        success: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
        warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20",
        error: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
        info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
        outline: "border border-input bg-transparent",
        // Manufacturing-specific status chips
        active: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30",
        completed: "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30",
        pending: "bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30",
        blocked: "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30",
        "on-hold": "bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30",
      },
      size: {
        sm: "h-5 px-2 text-[10px]",
        default: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chipVariants> {
  onRemove?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  (
    {
      className,
      variant,
      size,
      onRemove,
      icon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          chipVariants({ variant, size }),
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate">{children}</span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={disabled}
            className={cn(
              "ml-0.5 -mr-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-ring",
              "transition-colors"
            )}
            aria-label="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }
);
Chip.displayName = "Chip";

// ChipGroup for managing multiple chips
export interface ChipGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const ChipGroup = React.forwardRef<HTMLDivElement, ChipGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-wrap gap-1.5", className)}
        role="group"
        {...props}
      >
        {children}
      </div>
    );
  }
);
ChipGroup.displayName = "ChipGroup";

// Clickable chip variant
export interface ClickableChipProps extends ChipProps {
  selected?: boolean;
  onClick?: () => void;
}

const ClickableChip = React.forwardRef<HTMLDivElement, ClickableChipProps>(
  ({ className, selected, onClick, disabled, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : onClick}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={cn(
          "cursor-pointer",
          selected && "ring-2 ring-ring ring-offset-1",
          disabled && "cursor-not-allowed"
        )}
      >
        <Chip
          className={className}
          disabled={disabled}
          {...props}
        />
      </div>
    );
  }
);
ClickableChip.displayName = "ClickableChip";

export { Chip, ChipGroup, ClickableChip, chipVariants };
