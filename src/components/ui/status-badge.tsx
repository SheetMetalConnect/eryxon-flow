import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'pending'
  | 'active'
  | 'completed'
  | 'on-hold'
  | 'cancelled'
  | 'high'
  | 'medium'
  | 'low'
  | 'critical';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold capitalize',
  {
    variants: {
      status: {
        success: 'bg-green-500/10 text-green-600 dark:text-green-400',
        completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
        error: 'bg-red-500/10 text-red-600 dark:text-red-400',
        critical: 'bg-red-500/15 text-red-600 dark:text-red-400',
        warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        high: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        pending: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
        active: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        'on-hold': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        cancelled: 'bg-gray-500/10 text-gray-500 dark:text-gray-500',
        low: 'bg-gray-500/10 text-gray-500 dark:text-gray-400',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0.5',
        default: 'text-xs px-2 py-1',
        lg: 'text-sm px-2.5 py-1',
      },
    },
    defaultVariants: {
      status: 'info',
      size: 'default',
    },
  }
);

const statusIcons: Record<StatusType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  completed: CheckCircle,
  error: XCircle,
  critical: XCircle,
  warning: AlertTriangle,
  high: AlertTriangle,
  info: Info,
  medium: Info,
  pending: Clock,
  active: Clock,
  'on-hold': Ban,
  cancelled: Ban,
  low: Info,
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: StatusType;
  showIcon?: boolean;
  label?: string;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, size, showIcon = true, label, ...props }, ref) => {
    const Icon = statusIcons[status];
    const displayLabel = label || status.replace('-', ' ');

    return (
      <span
        ref={ref}
        className={cn(statusBadgeVariants({ status, size }), className)}
        {...props}
      >
        {showIcon && <Icon className="h-3 w-3" />}
        {displayLabel}
      </span>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';

// Priority Badge
export interface PriorityBadgeProps
  extends Omit<StatusBadgeProps, 'status'> {
  priority: 'critical' | 'high' | 'medium' | 'low';
}

const PriorityBadge = React.forwardRef<HTMLSpanElement, PriorityBadgeProps>(
  ({ priority, ...props }, ref) => {
    return (
      <StatusBadge
        ref={ref}
        status={priority}
        label={priority}
        showIcon
        {...props}
      />
    );
  }
);
PriorityBadge.displayName = 'PriorityBadge';

// Severity Badge
export interface SeverityBadgeProps
  extends Omit<StatusBadgeProps, 'status'> {
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const SeverityBadge = React.forwardRef<HTMLSpanElement, SeverityBadgeProps>(
  ({ severity, ...props }, ref) => {
    return (
      <StatusBadge
        ref={ref}
        status={severity}
        label={severity}
        showIcon
        {...props}
      />
    );
  }
);
SeverityBadge.displayName = 'SeverityBadge';

export { StatusBadge, PriorityBadge, SeverityBadge, statusBadgeVariants };
