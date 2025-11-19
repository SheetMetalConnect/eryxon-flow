import { ArrowRight, CheckCircle2, Circle, Clock, MinusCircle } from 'lucide-react';
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
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-7 w-20 bg-gray-200 rounded-lg"></div>
          <ArrowRight className="h-4 w-4 text-gray-300" />
          <div className="h-7 w-20 bg-gray-200 rounded-lg"></div>
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

        {/* Routing steps */}
        <div className={compact ? 'flex items-center gap-2 flex-wrap' : 'flex items-center gap-2 flex-wrap'}>
          {routing.map((step, index) => {
            const isCompleted = step.completed_operations === step.operation_count;
            const isInProgress =
              step.completed_operations > 0 && step.completed_operations < step.operation_count;
            const isNotStarted = step.completed_operations === 0;
            const cellColor = step.cell_color || '#6B7280';

            // Calculate colors based on status
            const bgColor = isCompleted
              ? cellColor
              : isInProgress
                ? cellColor
                : `${cellColor}20`;

            const textColor = isCompleted || isInProgress
              ? '#FFFFFF'
              : cellColor;

            return (
              <div key={step.cell_id} className="flex items-center gap-2">
                {/* Cell step */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-lg border-2
                        transition-all duration-300 cursor-default shadow-sm
                        ${isInProgress ? 'shadow-md ring-2 ring-offset-1' : ''}
                        ${isNotStarted ? 'opacity-80' : ''}
                        ${compact ? 'text-xs px-2 py-1' : 'text-sm'}
                      `}
                      style={{
                        backgroundColor: bgColor,
                        borderColor: cellColor,
                        color: textColor,
                        ringColor: isInProgress ? `${cellColor}40` : undefined,
                      }}
                    >
                      {/* Status icon */}
                      {isCompleted ? (
                        <CheckCircle2 className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      ) : isInProgress ? (
                        <Clock className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} animate-pulse`} />
                      ) : (
                        <Circle className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      )}

                      {/* Cell name */}
                      <span className="font-medium">{step.cell_name}</span>

                      {/* Operation count */}
                      {!compact && (
                        <span className={`text-xs font-semibold ${
                          isCompleted || isInProgress ? 'bg-white/20 px-1.5 py-0.5 rounded' : 'opacity-75'
                        }`}>
                          {step.completed_operations}/{step.operation_count}
                        </span>
                      )}
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
                        {isCompleted && <span className="text-green-600 font-medium">Completed</span>}
                        {isInProgress && <span className="text-blue-600 font-medium">In Progress</span>}
                        {isNotStarted && <span className="text-gray-500">Not Started</span>}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Arrow separator */}
                {index < routing.length - 1 && (
                  <ArrowRight
                    className={`${
                      compact ? 'h-3 w-3' : 'h-4 w-4'
                    } ${
                      isCompleted ? 'text-green-500' : 'text-gray-300'
                    } flex-shrink-0 transition-colors duration-300`}
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
