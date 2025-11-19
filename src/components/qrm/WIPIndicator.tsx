import { AlertTriangle, CheckCircle, Infinity, XCircle } from 'lucide-react';
import type { CellQRMMetrics } from '@/types/qrm';
import { formatWIPDisplay, getQRMStatusColor } from '@/types/qrm';

interface WIPIndicatorProps {
  metrics: CellQRMMetrics;
  compact?: boolean;
  showDetails?: boolean;
}

export function WIPIndicator({ metrics, compact = false, showDetails = false }: WIPIndicatorProps) {
  const { current_wip, wip_limit, status, utilization_percent } = metrics;

  const getStatusIcon = () => {
    switch (status) {
      case 'normal':
        return <CheckCircle className={compact ? 'h-3 w-3' : 'h-4 w-4'} />;
      case 'warning':
        return <AlertTriangle className={compact ? 'h-3 w-3' : 'h-4 w-4'} />;
      case 'at_capacity':
        return <XCircle className={compact ? 'h-3 w-3' : 'h-4 w-4'} />;
      case 'no_limit':
        return <Infinity className={compact ? 'h-3 w-3' : 'h-4 w-4'} />;
      default:
        return null;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'normal':
        return 'Normal';
      case 'warning':
        return 'Approaching Capacity';
      case 'at_capacity':
        return 'At Capacity';
      case 'no_limit':
        return 'No Limit';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-md border
        ${getQRMStatusColor(status)}
        ${compact ? 'text-xs' : 'text-sm'}
      `}
    >
      {/* Status icon */}
      {getStatusIcon()}

      {/* WIP count */}
      <span className="font-medium">{formatWIPDisplay(current_wip, wip_limit)}</span>

      {/* Utilization percentage */}
      {!compact && utilization_percent !== null && (
        <span className="text-xs opacity-75">({utilization_percent}%)</span>
      )}

      {/* Status label */}
      {showDetails && <span className="text-xs ml-1">{getStatusLabel()}</span>}
    </div>
  );
}

interface WIPBadgeProps {
  metrics: CellQRMMetrics;
}

/**
 * Small badge version for displaying in cards/lists
 */
export function WIPBadge({ metrics }: WIPBadgeProps) {
  const { current_wip, wip_limit, status } = metrics;

  if (status === 'no_limit') {
    return null; // Don't show badge if no limit is set
  }

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium
        ${getQRMStatusColor(status)}
      `}
    >
      {status === 'at_capacity' && <XCircle className="h-3 w-3" />}
      {status === 'warning' && <AlertTriangle className="h-3 w-3" />}
      <span>{formatWIPDisplay(current_wip, wip_limit)}</span>
    </div>
  );
}

interface WIPBarProps {
  current: number;
  limit: number | null;
  warningThreshold?: number | null;
  height?: 'sm' | 'md' | 'lg';
}

/**
 * Visual bar showing WIP utilization
 */
export function WIPBar({ current, limit, warningThreshold, height = 'md' }: WIPBarProps) {
  // Handle undefined/null current values
  const safeCurrentWip = current ?? 0;

  if (limit === null || limit === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Infinity className="h-4 w-4" />
        <span>{safeCurrentWip} items (no limit)</span>
      </div>
    );
  }

  const safeLimit = limit || 1; // Prevent division by zero
  const percentage = Math.min((safeCurrentWip / safeLimit) * 100, 100);
  const effectiveThreshold = warningThreshold ?? Math.floor(safeLimit * 0.8);
  const isAtWarning = safeCurrentWip >= effectiveThreshold && safeCurrentWip < safeLimit;
  const isAtCapacity = safeCurrentWip >= safeLimit;

  const heightClass = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }[height];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>WIP: {safeCurrentWip}</span>
        <span>Limit: {safeLimit}</span>
      </div>
      <div className={`bg-gray-200 rounded-full ${heightClass} overflow-hidden relative`}>
        {/* Warning threshold marker */}
        {safeLimit > 0 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-yellow-400 z-10"
            style={{ left: `${(effectiveThreshold / safeLimit) * 100}%` }}
          />
        )}

        {/* WIP bar */}
        <div
          className={`
            ${heightClass} transition-all duration-300
            ${
              isAtCapacity
                ? 'bg-red-600'
                : isAtWarning
                ? 'bg-yellow-500'
                : 'bg-green-600'
            }
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isAtCapacity && (
        <div className="text-xs text-red-600 font-medium flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          <span>Cell at capacity - limit work starting</span>
        </div>
      )}
      {isAtWarning && !isAtCapacity && (
        <div className="text-xs text-yellow-600 font-medium flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>Approaching capacity</span>
        </div>
      )}
    </div>
  );
}
