import { ArrowRight, CheckCircle, Circle, MinusCircle } from 'lucide-react';
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
        <div className="animate-pulse">Loading routing...</div>
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
    <div className="space-y-2">
      {/* Progress bar */}
      {showProgress && (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700 min-w-[3rem] text-right">
            {progress}%
          </span>
        </div>
      )}

      {/* Routing steps */}
      <div className={compact ? 'flex items-center gap-2 flex-wrap' : 'space-y-2'}>
        {routing.map((step, index) => {
          const isCompleted = step.completed_operations === step.operation_count;
          const isInProgress =
            step.completed_operations > 0 && step.completed_operations < step.operation_count;
          const isNotStarted = step.completed_operations === 0;

          return (
            <div key={step.cell_id} className="flex items-center gap-2">
              {/* Cell step */}
              <div
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-md border
                  transition-all duration-200
                  ${
                    isCompleted
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : isInProgress
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-300 text-gray-600'
                  }
                  ${compact ? 'text-xs' : 'text-sm'}
                `}
                style={
                  step.cell_color && !isCompleted && !isInProgress
                    ? { borderColor: step.cell_color }
                    : undefined
                }
              >
                {/* Status icon */}
                {isCompleted ? (
                  <CheckCircle className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
                ) : (
                  <Circle
                    className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${
                      isInProgress ? 'fill-current' : ''
                    }`}
                  />
                )}

                {/* Cell name */}
                <span className="font-medium">{step.cell_name}</span>

                {/* Operation count */}
                {!compact && (
                  <span className="text-xs opacity-75">
                    ({step.completed_operations}/{step.operation_count})
                  </span>
                )}

                {/* Parts in cell (for job routing) */}
                {!compact && step.parts_in_cell !== undefined && step.parts_in_cell > 1 && (
                  <span className="text-xs opacity-75 ml-1">
                    [{step.parts_in_cell} parts]
                  </span>
                )}
              </div>

              {/* Arrow separator */}
              {index < routing.length - 1 && (
                <ArrowRight
                  className={`${
                    compact ? 'h-3 w-3' : 'h-4 w-4'
                  } text-gray-400 flex-shrink-0`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
