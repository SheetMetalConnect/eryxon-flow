import { ArrowRight, CheckCircle2, Clock, Circle, Pause, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-8 w-16 bg-gray-200 rounded"></div>
          <ChevronRight className="h-4 w-4 text-gray-300" />
          <div className="h-8 w-16 bg-gray-200 rounded"></div>
          <ChevronRight className="h-4 w-4 text-gray-300" />
          <div className="h-8 w-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (routing.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
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
      return <CheckCircle2 className={`${iconClass} text-white`} />;
    }
    if (isInProgress) {
      return <Clock className={`${iconClass} text-white animate-pulse`} />;
    }
    return <Circle className={`${iconClass}`} />;
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Progress bar */}
        {showProgress && (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: progress === 100
                    ? 'linear-gradient(90deg, #10B981, #059669)'
                    : 'linear-gradient(90deg, #3B82F6, #2563EB)'
                }}
              />
            </div>
            <span className={`font-semibold min-w-[3.5rem] text-right ${
              progress === 100 ? 'text-green-600' : 'text-blue-600'
            } ${compact ? 'text-xs' : 'text-sm'}`}>
              {progress}%
            </span>
          </div>
        )}

        {/* Flow visualization */}
        <div className={`flex items-center ${compact ? 'gap-1 flex-wrap' : 'gap-2'}`}>
          {routing.map((step, index) => {
            const { isCompleted, isInProgress, isNotStarted } = getStepStatus(step);
            const cellColor = step.cell_color || '#6B7280';

            // Calculate background color with opacity based on status
            const bgColor = isCompleted
              ? cellColor
              : isInProgress
                ? cellColor
                : `${cellColor}20`;

            const textColor = isCompleted || isInProgress
              ? '#FFFFFF'
              : cellColor;

            const borderColor = cellColor;

            return (
              <div key={step.cell_id} className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`
                        flex items-center gap-1.5 rounded-lg border-2
                        transition-all duration-300 cursor-default
                        ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}
                        ${isInProgress ? 'shadow-md ring-2 ring-offset-1' : 'shadow-sm'}
                        ${isNotStarted ? 'opacity-75' : ''}
                      `}
                      style={{
                        backgroundColor: bgColor,
                        borderColor: borderColor,
                        color: textColor,
                        '--tw-ring-color': isInProgress ? `${cellColor}40` : undefined,
                      } as React.CSSProperties}
                    >
                      {/* Status icon */}
                      {getStatusIcon(step)}

                      {/* Cell name */}
                      {showLabels && (
                        <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
                          {step.cell_name}
                        </span>
                      )}

                      {/* Operation count badge */}
                      {!compact && (
                        <Badge
                          variant="secondary"
                          className={`
                            ml-1 text-xs font-semibold
                            ${isCompleted || isInProgress ? 'bg-white/20 text-inherit' : 'bg-white/60'}
                          `}
                        >
                          {step.completed_operations}/{step.operation_count}
                        </Badge>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-sm">
                    <div className="space-y-1">
                      <div className="font-semibold">{step.cell_name}</div>
                      <div className="text-xs text-gray-500">
                        {step.completed_operations} of {step.operation_count} operations completed
                      </div>
                      <div className="text-xs">
                        {isCompleted && <span className="text-green-600">Completed</span>}
                        {isInProgress && <span className="text-blue-600">In Progress</span>}
                        {isNotStarted && <span className="text-gray-500">Not Started</span>}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Arrow connector */}
                {index < routing.length - 1 && (
                  <ArrowRight
                    className={`flex-shrink-0 ${
                      compact ? 'h-3 w-3' : 'h-4 w-4'
                    } ${
                      isCompleted ? 'text-green-500' : 'text-gray-300'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Compact inline flow for table rows
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
      <div className="flex items-center gap-1">
        <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>
        <ChevronRight className="h-3 w-3 text-gray-300" />
        <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (routing.length === 0) {
    return <span className="text-xs text-gray-400">-</span>;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 flex-wrap">
        {routing.map((step, index) => {
          const isCompleted = step.completed_operations === step.operation_count;
          const isInProgress = step.completed_operations > 0 && step.completed_operations < step.operation_count;
          const cellColor = step.cell_color || '#6B7280';

          return (
            <div key={step.cell_id} className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`
                      px-1.5 py-0.5 rounded text-xs font-medium
                      transition-all duration-200 cursor-default
                      ${isInProgress ? 'ring-1 ring-offset-1' : ''}
                    `}
                    style={{
                      backgroundColor: isCompleted || isInProgress ? cellColor : `${cellColor}30`,
                      color: isCompleted || isInProgress ? '#FFFFFF' : cellColor,
                      '--tw-ring-color': isInProgress ? `${cellColor}50` : undefined,
                    } as React.CSSProperties}
                  >
                    {/* Shortened name - first 3 chars or icon */}
                    {step.cell_name.slice(0, 3).toUpperCase()}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div>
                    <span className="font-medium">{step.cell_name}</span>
                    <span className="text-gray-500 ml-1">
                      ({step.completed_operations}/{step.operation_count})
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>

              {index < routing.length - 1 && (
                <ChevronRight
                  className={`h-3 w-3 ${
                    isCompleted ? 'text-green-500' : 'text-gray-300'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
