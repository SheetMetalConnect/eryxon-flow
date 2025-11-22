import { AlertTriangle, XCircle, Info } from 'lucide-react';
import type { NextCellCapacity } from '@/types/qrm';

interface CapacityWarningProps {
  capacity: NextCellCapacity;
  onProceed?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
}

export function CapacityWarning({
  capacity,
  onProceed,
  onCancel,
  showActions = false,
}: CapacityWarningProps) {
  if (capacity.has_capacity && !capacity.warning) {
    return null; // No warning needed
  }

  const isBlocking = !capacity.has_capacity && capacity.enforce_limit;
  const isWarning = capacity.warning || (!capacity.has_capacity && !capacity.enforce_limit);

  return (
    <div
      className={`
        rounded-lg border p-4
        ${isBlocking
          ? 'bg-alert-error-bg border-alert-error-border text-red-800'
          : isWarning
            ? 'bg-alert-warning-bg border-alert-warning-border text-yellow-800'
            : 'bg-alert-info-bg border-alert-info-border text-blue-800'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {isBlocking ? (
            <XCircle className="h-5 w-5" />
          ) : isWarning ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <Info className="h-5 w-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          <h4 className="font-semibold">
            {isBlocking
              ? 'Cannot Start Work - Next Cell at Capacity'
              : isWarning
                ? 'Capacity Warning - Next Cell Approaching Limit'
                : 'Next Cell Capacity Information'}
          </h4>

          <div className="text-sm space-y-1">
            {capacity.next_cell_name && (
              <p>
                <span className="font-medium">Next Cell:</span> {capacity.next_cell_name}
              </p>
            )}

            {capacity.current_wip !== undefined && capacity.wip_limit !== undefined && (
              <p>
                <span className="font-medium">Current WIP:</span> {capacity.current_wip} /{' '}
                {capacity.wip_limit ?? '∞'}
              </p>
            )}

            <p className="mt-2">{capacity.message}</p>

            {isBlocking && (
              <p className="mt-2 font-medium">
                Work cannot be started until capacity becomes available in the next cell.
              </p>
            )}

            {isWarning && !isBlocking && (
              <p className="mt-2">
                You can proceed, but be aware that the next cell is approaching its capacity limit.
              </p>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 mt-3">
              {!isBlocking && onProceed && (
                <button
                  onClick={onProceed}
                  className="px-4 py-2 bg-card border border-border rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Proceed Anyway
                </button>
              )}
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-card border border-border rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  {isBlocking ? 'Close' : 'Cancel'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CapacityBadgeProps {
  capacity: NextCellCapacity;
  compact?: boolean;
}

/**
 * Small badge version for displaying in cards/lists
 */
export function CapacityBadge({ capacity, compact = false }: CapacityBadgeProps) {
  if (capacity.has_capacity && !capacity.warning) {
    return null; // No badge needed
  }

  const isBlocking = !capacity.has_capacity && capacity.enforce_limit;
  const isWarning = capacity.warning || (!capacity.has_capacity && !capacity.enforce_limit);

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium
        ${compact ? 'text-xs' : 'text-sm'}
        ${isBlocking
          ? 'bg-alert-error-bg border-alert-error-border text-red-700'
          : 'bg-alert-warning-bg border-alert-warning-border text-yellow-700'
        }
      `}
    >
      {isBlocking ? (
        <XCircle className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      <span>
        {isBlocking
          ? 'Next cell full'
          : isWarning
            ? 'Next cell near capacity'
            : 'Check capacity'}
      </span>
    </div>
  );
}
