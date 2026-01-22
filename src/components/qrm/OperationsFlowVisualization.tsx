import { CheckCircle2, Clock, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RoutingStep } from '@/types/qrm';
import { getRoutingProgress } from '@/types/qrm';

interface OperationsFlowVisualizationProps {
  routing: RoutingStep[];
  loading?: boolean;
  compact?: boolean;
  showProgress?: boolean;
  showLabels?: boolean;
}

export function OperationsFlowVisualization({
  routing,
  loading = false,
  compact = false,
  showProgress = true,
  showLabels = true,
}: OperationsFlowVisualizationProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="animate-pulse flex items-center">
          <div className="h-8 w-20 bg-muted rounded-l-lg"></div>
          <div className="h-8 w-20 bg-muted -ml-2"></div>
          <div className="h-8 w-20 bg-muted rounded-r-lg -ml-2"></div>
        </div>
      </div>
    );
  }

  if (routing.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Circle className="h-4 w-4" />
        <span>No operations defined</span>
      </div>
    );
  }

  const progress = getRoutingProgress(routing);

  // Get status styling for a step
  const getStepStatus = (step: RoutingStep) => {
    const isCompleted = step.completed_operations === step.operation_count;
    const isInProgress = step.completed_operations > 0 && step.completed_operations < step.operation_count;
    return { isCompleted, isInProgress, isNotStarted: !isCompleted && !isInProgress };
  };

  // Get status icon
  const getStatusIcon = (step: RoutingStep) => {
    const { isCompleted, isInProgress } = getStepStatus(step);
    const iconClass = compact ? 'h-3 w-3' : 'h-4 w-4';

    if (isCompleted) {
      return <CheckCircle2 className={cn(iconClass, 'text-white')} />;
    }
    if (isInProgress) {
      return <Clock className={cn(iconClass, 'text-white animate-pulse')} />;
    }
    return <Circle className={cn(iconClass, 'text-current')} />;
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Progress bar */}
        {showProgress && (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted/50 rounded-full h-2.5 overflow-hidden border border-border/30">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  progress === 100 ? "bg-status-completed" : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={cn(
              "font-semibold min-w-[3.5rem] text-right",
              progress === 100 ? "text-status-completed" : "text-primary",
              compact ? "text-xs" : "text-sm"
            )}>
              {progress}%
            </span>
          </div>
        )}

        {/* Arrow-shaped flow visualization */}
        <div className="flex items-center overflow-x-auto pb-1">
          {routing.map((step, index) => {
            const { isCompleted, isInProgress, isNotStarted } = getStepStatus(step);
            const cellColor = step.cell_color || 'hsl(var(--muted-foreground))';
            const isFirst = index === 0;
            const isLast = index === routing.length - 1;

            // Arrow shape using clip-path for connected flow
            const clipPath = isFirst && isLast
              ? 'none'
              : isFirst
                ? 'polygon(0% 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 0% 100%)'
                : isLast
                  ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 12px 50%)'
                  : 'polygon(0% 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 0% 100%, 12px 50%)';

            return (
              <Tooltip key={step.cell_id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "relative flex items-center gap-1.5 transition-all duration-300 cursor-default border",
                      compact ? "min-w-[80px] px-3 py-1.5" : "min-w-[110px] px-4 py-2",
                      !isFirst && "-ml-3",
                      // Status-based styling
                      isInProgress && "shadow-lg ring-2 ring-primary/30 z-10",
                      isNotStarted && "opacity-60"
                    )}
                    style={{
                      clipPath,
                      backgroundColor: isCompleted || isInProgress ? cellColor : `${cellColor}20`,
                      borderColor: cellColor,
                      color: isCompleted || isInProgress ? '#FFFFFF' : cellColor,
                    }}
                  >
                    {/* Status icon */}
                    {getStatusIcon(step)}

                    {/* Cell name */}
                    {showLabels && (
                      <span className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>
                        {step.cell_name}
                      </span>
                    )}

                    {/* Operation count badge */}
                    {!compact && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "ml-auto text-xs font-semibold shrink-0",
                          isCompleted || isInProgress ? "bg-white/20 text-inherit border-0" : "bg-background/60"
                        )}
                      >
                        {step.completed_operations}/{step.operation_count}
                      </Badge>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-sm">
                  <div className="space-y-1">
                    <div className="font-semibold">{step.cell_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {step.completed_operations} of {step.operation_count} operations completed
                    </div>
                    <div className="text-xs">
                      {isCompleted && <span className="text-status-completed">Completed</span>}
                      {isInProgress && <span className="text-primary">In Progress</span>}
                      {isNotStarted && <span className="text-muted-foreground">Not Started</span>}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Compact inline flow for table rows - uses connected pill shapes
 */
export function CompactOperationsFlow({
  routing,
  loading = false,
}: {
  routing: RoutingStep[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center">
        <div className="h-5 w-10 bg-muted rounded-l animate-pulse"></div>
        <div className="h-5 w-10 bg-muted animate-pulse -ml-1"></div>
        <div className="h-5 w-10 bg-muted rounded-r animate-pulse -ml-1"></div>
      </div>
    );
  }

  if (routing.length === 0) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center">
        {routing.map((step, index) => {
          const isCompleted = step.completed_operations === step.operation_count;
          const isInProgress = step.completed_operations > 0 && step.completed_operations < step.operation_count;
          const cellColor = step.cell_color || 'hsl(var(--muted-foreground))';
          const isFirst = index === 0;
          const isLast = index === routing.length - 1;

          // Simpler pill clip-path for compact view
          const clipPath = isFirst && isLast
            ? 'none'
            : isFirst
              ? 'polygon(0% 0%, calc(100% - 6px) 0%, 100% 50%, calc(100% - 6px) 100%, 0% 100%)'
              : isLast
                ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 6px 50%)'
                : 'polygon(0% 0%, calc(100% - 6px) 0%, 100% 50%, calc(100% - 6px) 100%, 0% 100%, 6px 50%)';

          return (
            <Tooltip key={step.cell_id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium transition-all duration-200 cursor-default",
                    !isFirst && "-ml-1.5",
                    isInProgress && "ring-1 ring-primary/50 z-10"
                  )}
                  style={{
                    clipPath,
                    backgroundColor: isCompleted || isInProgress ? cellColor : `${cellColor}30`,
                    color: isCompleted || isInProgress ? '#FFFFFF' : cellColor,
                  }}
                >
                  {step.cell_name.slice(0, 3).toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div>
                  <span className="font-medium">{step.cell_name}</span>
                  <span className="text-muted-foreground ml-1">
                    ({step.completed_operations}/{step.operation_count})
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
