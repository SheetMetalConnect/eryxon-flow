import { CheckCircle2, Circle, Clock, MinusCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
      <div className="flex items-center text-sm text-gray-500">
        <div className="animate-pulse flex items-center">
          <div className="h-12 w-32 bg-gray-200 rounded-lg" style={{
            clipPath: 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%, 16px 50%)'
          }}></div>
          <div className="h-12 w-32 bg-gray-200 rounded-lg -ml-4" style={{
            clipPath: 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%, 16px 50%)'
          }}></div>
        </div>
      </div>
    );
  }

  if (routing.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <MinusCircle className="h-4 w-4" />
        <span>No routing defined</span>
      </div>
    );
  }

  const progress = getRoutingProgress(routing);

  return (
    <TooltipProvider>
      <div className="space-y-4">
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
            <span className={`font-semibold min-w-[3.5rem] text-right ${progress === 100 ? 'text-status-completed' : 'text-brand-primary'
              } ${compact ? 'text-xs' : 'text-sm'}`}>
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
            const cellColor = step.cell_color || '#6B7280';
            const isFirst = index === 0;
            const isLast = index === routing.length - 1;

            // Calculate colors based on status
            const bgColor = isCompleted
              ? cellColor
              : isInProgress
                ? cellColor
                : `${cellColor}20`;

            const textColor = isCompleted || isInProgress
              ? '#FFFFFF'
              : cellColor;

            // Arrow shape using clip-path
            // First element: flat left side, arrow right
            // Middle elements: arrow left, arrow right
            // Last element: arrow left, flat right
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
                    className={`
                      relative flex items-center gap-2 transition-all duration-300 cursor-default
                      ${compact ? 'px-6 py-2 min-w-[120px]' : 'px-8 py-3 min-w-[160px]'}
                      ${isInProgress ? 'shadow-lg ring-2 ring-offset-0 z-10' : 'shadow-md'}
                      ${isNotStarted ? 'opacity-80' : 'opacity-100'}
                      ${!isFirst ? '-ml-4' : ''}
                      ${compact ? 'text-xs' : 'text-sm'}
                    `}
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                      clipPath: clipPath,
                      border: `2px solid ${cellColor}`,
                      '--tw-ring-color': isInProgress ? `${cellColor}60` : undefined,
                    } as React.CSSProperties}
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className={`${compact ? 'h-3.5 w-3.5' : 'h-5 w-5'}`} />
                      ) : isInProgress ? (
                        <Clock className={`${compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} animate-pulse`} />
                      ) : (
                        <Circle className={`${compact ? 'h-3.5 w-3.5' : 'h-5 w-5'}`} />
                      )}
                    </div>

                    {/* Cell info */}
                    <div className="flex-1 min-w-0">
                      {/* Cell name */}
                      <div className="font-bold truncate">{step.cell_name}</div>

                      {/* Operation count */}
                      {!compact && (
                        <div className={`text-xs font-semibold mt-0.5 ${isCompleted || isInProgress ? 'opacity-90' : 'opacity-60'
                          }`}>
                          {step.completed_operations}/{step.operation_count} ops
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-sm">
                  <div className="space-y-1">
                    <div className="font-semibold">{step.cell_name}</div>
                    <div className="text-xs text-gray-500">
                      {step.completed_operations} of {step.operation_count} operations completed
                    </div>
                    {step.parts_in_cell !== undefined && step.parts_in_cell > 0 && (
                      <div className="text-xs text-gray-500">
                        {step.parts_in_cell} part{step.parts_in_cell !== 1 ? 's' : ''} in cell
                      </div>
                    )}
                    <div className="text-xs">
                      {isCompleted && <span className="text-status-completed font-medium">Completed</span>}
                      {isInProgress && <span className="text-brand-primary font-medium">In Progress</span>}
                      {isNotStarted && <span className="text-gray-500">Not Started</span>}
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
