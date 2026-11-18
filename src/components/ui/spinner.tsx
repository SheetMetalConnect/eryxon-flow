import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg" | "xl";
  variant?: "default" | "primary" | "secondary" | "muted";
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  default: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
  xl: "h-12 w-12 border-4",
};

const variantClasses = {
  default: "border-foreground/20 border-t-foreground",
  primary: "border-primary/20 border-t-primary",
  secondary: "border-secondary/20 border-t-secondary-foreground",
  muted: "border-muted-foreground/20 border-t-muted-foreground",
};

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "default", variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);
Spinner.displayName = "Spinner";

// Spinner with optional label
export interface SpinnerWithLabelProps extends SpinnerProps {
  label?: string;
  labelPosition?: "right" | "bottom";
}

const SpinnerWithLabel = React.forwardRef<HTMLDivElement, SpinnerWithLabelProps>(
  ({ label, labelPosition = "right", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2",
          labelPosition === "bottom" && "flex-col",
          className
        )}
      >
        <Spinner {...props} />
        {label && (
          <span className="text-sm text-muted-foreground">{label}</span>
        )}
      </div>
    );
  }
);
SpinnerWithLabel.displayName = "SpinnerWithLabel";

// Full page spinner overlay
export interface SpinnerOverlayProps extends SpinnerProps {
  label?: string;
}

const SpinnerOverlay = React.forwardRef<HTMLDivElement, SpinnerOverlayProps>(
  ({ label, size = "lg", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
      >
        <Spinner size={size} {...props} />
        {label && (
          <span className="mt-4 text-sm text-muted-foreground">{label}</span>
        )}
      </div>
    );
  }
);
SpinnerOverlay.displayName = "SpinnerOverlay";

// Inline loading state (for buttons, etc.)
export interface LoadingDotsProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg";
}

const dotSizeClasses = {
  sm: "h-1 w-1",
  default: "h-1.5 w-1.5",
  lg: "h-2 w-2",
};

const LoadingDots = React.forwardRef<HTMLDivElement, LoadingDotsProps>(
  ({ className, size = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-1", className)}
        role="status"
        aria-label="Loading"
        {...props}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-full bg-current animate-pulse",
              dotSizeClasses[size]
            )}
            style={{
              animationDelay: `${i * 150}ms`,
              animationDuration: "600ms",
            }}
          />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);
LoadingDots.displayName = "LoadingDots";

export { Spinner, SpinnerWithLabel, SpinnerOverlay, LoadingDots };
