import { CheckCircle2, Circle, Clock, MinusCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RoutingStep } from '@/types/qrm';
import { getRoutingProgress } from '@/types/qrm';

interface RoutingVisualizationProps {
  routing: RoutingStep[];
  loading?: boolean;
  compact?: boolean;
  showProgress?: boolean;
}

export function RoutingVisualization({
  routing,
  loading = false,
  compact = false,
  showProgress = true,
}: RoutingVisualizationProps) {
  if (loading) {
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        <div className="animate-pulse flex items-center">
          <div className={cn(
            "bg-surface-elevated border border-border",
            compact ? "h-8 w-24" : "h-12 w-32"
          )} style={{
            clipPath: 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%, 16px 50%)'
          }}></div>
          <div className={cn(
            "bg-surface-elevated border border-border -ml-4",
            compact ? "h-8 w-24" : "h-12 w-32"
          )} style={{
            clipPath: 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%, 16px 50%)'
          }}></div>
        </div>
      </div>
    );
  }

  if (routing.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MinusCircle className="h-4 w-4" />
        <span>No routing defined</span>
      </div>
    );
  }

  const progress = getRoutingProgress(routing);

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", compact && "space-y-2")}>
        {/* Progress bar */}
        {showProgress && (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-surface-elevated rounded-full h-2 overflow-hidden border border-border/50">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  progress === 100 ? "bg-status-completed" : "bg-brand-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={cn(
              "font-semibold min-w-[3.5rem] text-right",
              progress === 100 ? 'text-status-completed' : 'text-brand-primary',
              compact ? 'text-xs' : 'text-sm'
            )}>
              {progress}%
            </span>
          </div>
        )}

        {/* Routing steps - Arrow Boxes */}
        <div className="flex items-center overflow-x-auto pb-2">
          {routing.map((step, index) => {
            const isCompleted = step.completed_operations === step.operation_count;
            const isInProgress =
              step.completed_operations > 0 && step.completed_operations < step.operation_count;
            const isNotStarted = step.completed_operations === 0;
            const isFirst = index === 0;
            const isLast = index === routing.length - 1;

            // Arrow shape using clip-path
            const clipPath = isFirst && isLast
              ? 'none' // Single element - no arrows
              : isFirst
                ? 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%)'
                : isLast
                  ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 16px 50%)'
                  : 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%, 16px 50%)';

            return (
              <Tooltip key={step.cell_id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "relative flex items-center gap-2 transition-all duration-300 cursor-default border",
                      compact ? 'px-4 py-1.5 min-w-[100px] text-xs' : 'px-6 py-2.5 min-w-[140px] text-sm',
                      !isFirst && '-ml-4',
                      // Status-based styling - design system compliant
                      isCompleted && "bg-status-completed/10 border-status-completed/30 text-status-completed",
                      isInProgress && "bg-status-active/10 border-status-active/30 text-status-active shadow-lg ring-2 ring-status-active/20 z-10",
                      isNotStarted && "bg-surface-elevated/50 border-border/50 text-muted-foreground opacity-70"
                    )}
                    style={{ clipPath }}
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                      ) : isInProgress ? (
                        <Clock className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4', 'animate-pulse')} />
                      ) : (
                        <Circle className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                      )}
                    </div>

                    {/* Cell info */}
                    <div className="flex-1 min-w-0">
                      {/* Cell name */}
                      <div className="font-semibold truncate">{step.cell_name}</div>

                      {/* Operation count */}
                      {!compact && (
                        <div className="text-xs font-medium mt-0.5 opacity-80">
                          {step.completed_operations}/{step.operation_count} ops
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-sm glass-card">
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground">{step.cell_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {step.completed_operations} of {step.operation_count} operations completed
                    </div>
                    {step.parts_in_cell !== undefined && step.parts_in_cell > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {step.parts_in_cell} part{step.parts_in_cell !== 1 ? 's' : ''} in cell
                      </div>
                    )}
                    <div className="text-xs mt-2">
                      {isCompleted && <span className="text-status-completed font-medium">✓ Completed</span>}
                      {isInProgress && <span className="text-status-active font-medium">◉ In Progress</span>}
                      {isNotStarted && <span className="text-muted-foreground font-medium">○ Not Started</span>}
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
