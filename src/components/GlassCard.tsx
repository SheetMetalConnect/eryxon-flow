import React from 'react';
import { cn } from '@/lib/utils';

/**
 * GlassCard Component
 *
 * Beautiful glass morphism card with backdrop blur and subtle transparency.
 * Perfect for modern dark mode interfaces.
 *
 * Features:
 * - Glass morphism effect (backdrop blur + transparency)
 * - Subtle border with transparency
 * - Smooth hover effects
 * - Fully customizable with className
 * - Accessible and semantic HTML
 *
 * Usage:
 * ```tsx
 * <GlassCard>
 *   <h3>Card Title</h3>
 *   <p>Card content...</p>
 * </GlassCard>
 * ```
 */

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  as?: 'div' | 'section' | 'article';
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, hover = true, onClick, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'glass-card',
          'p-6',
          hover && 'transition-smooth cursor-pointer',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;

/**
 * GlassCardHeader - Semantic header section for GlassCard
 */
export const GlassCardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
};

/**
 * GlassCardTitle - Title component for GlassCard
 */
export const GlassCardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <h3 className={cn('text-xl font-semibold text-foreground', className)}>
      {children}
    </h3>
  );
};

/**
 * GlassCardDescription - Description component for GlassCard
 */
export const GlassCardDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <p className={cn('text-sm text-muted-foreground mt-2', className)}>
      {children}
    </p>
  );
};

/**
 * GlassCardContent - Content section for GlassCard
 */
export const GlassCardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
};

/**
 * GlassCardFooter - Footer section for GlassCard
 */
export const GlassCardFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn('mt-4 flex items-center gap-2', className)}>
      {children}
    </div>
  );
};
