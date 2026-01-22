import React from 'react';
import { useJobRouting } from '@/hooks/useQRMMetrics';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoutingVisualizationProps {
    jobId: string;
    currentCellId?: string;
    className?: string;
}

/**
 * Visualizes the routing flow for a job with design system compliant arrow boxes:
 * - All cells in the routing sequence as connected arrow boxes
 * - Progress through each cell
 * - Current cell indicator with enhanced styling
 * - Uses design tokens for colors (no hex literals)
 */
export function RoutingVisualization({ jobId, currentCellId, className }: RoutingVisualizationProps) {
    const { routing, loading, error } = useJobRouting(jobId);

    if (loading) {
        return (
            <div className={cn("flex items-center justify-center p-4", className)}>
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading routing...</span>
            </div>
        );
    }

    if (error || !routing || routing.length === 0) {
        return (
            <div className={cn("text-center p-4 text-sm text-muted-foreground", className)}>
                {error ? 'Error loading routing' : 'No routing information available'}
            </div>
        );
    }

    const currentCellIndex = routing.findIndex(step => step.cell_id === currentCellId);

    return (
        <div className={cn("space-y-3", className)}>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Job Routing Flow
            </div>

            {/* Arrow Box Flow */}
            <div className="flex items-center overflow-x-auto pb-2">
                {routing.map((step, index) => {
                    const isCompleted = step.completed_operations === step.operation_count && step.operation_count > 0;
                    const isCurrent = step.cell_id === currentCellId;
                    const isInProgress = !isCompleted && !isCurrent && step.completed_operations > 0;
                    const isFuture = currentCellIndex !== -1 && index > currentCellIndex && step.completed_operations === 0;
                    const isFirst = index === 0;
                    const isLast = index === routing.length - 1;
                    const progressPercent = step.operation_count > 0
                        ? Math.round((step.completed_operations / step.operation_count) * 100)
                        : 0;

                    // Arrow shape using clip-path
                    const clipPath = isFirst && isLast
                        ? 'none' // Single element - no arrows
                        : isFirst
                            ? 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%)'
                            : isLast
                                ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 16px 50%)'
                                : 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%, 16px 50%)';

                    return (
                        <div
                            key={step.cell_id}
                            className={cn(
                                "relative flex flex-col justify-center min-w-[130px] p-2.5 transition-all duration-300 border",
                                !isFirst && "-ml-4",
                                // Status-based styling - design system compliant
                                isCurrent && "bg-brand-primary/15 border-brand-primary/40 text-brand-primary shadow-lg ring-2 ring-brand-primary/30 z-10 scale-105",
                                isCompleted && !isCurrent && "bg-status-completed/10 border-status-completed/30 text-status-completed",
                                isInProgress && !isCurrent && "bg-status-active/10 border-status-active/30 text-status-active",
                                isFuture && "bg-surface-elevated/40 border-border/40 text-muted-foreground/60 opacity-75"
                            )}
                            style={{ clipPath }}
                        >
                            {/* Status Icon & Cell Name */}
                            <div className="flex items-center gap-2 mb-1">
                                <div className="flex-shrink-0">
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                    ) : isCurrent ? (
                                        <div className="w-4 h-4 rounded-full bg-current/30 border-2 border-current animate-pulse" />
                                    ) : (
                                        <Circle className="w-4 h-4" />
                                    )}
                                </div>
                                <div className="text-sm font-semibold truncate">
                                    {step.cell_name}
                                </div>
                            </div>

                            {/* Progress Info */}
                            <div className="text-xs opacity-80 font-medium">
                                {step.completed_operations}/{step.operation_count} ops
                            </div>

                            {/* Progress Bar */}
                            {step.operation_count > 0 && (
                                <div className="w-full h-1.5 bg-surface-base/60 border border-border/30 rounded-full overflow-hidden mt-1.5">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all",
                                            isCurrent && "bg-brand-primary",
                                            isCompleted && "bg-status-completed",
                                            isInProgress && "bg-status-active",
                                            isFuture && "bg-muted-foreground/40"
                                        )}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Current Cell Indicator */}
            {currentCellIndex !== -1 && (
                <div className="flex items-center gap-3 p-2.5 bg-surface-elevated/80 border border-border/50 rounded-lg backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                    <div className="text-sm flex items-center gap-2 flex-wrap">
                        <span className="text-muted-foreground">Currently:</span>
                        <span className="font-semibold text-foreground">{routing[currentCellIndex]?.cell_name}</span>
                        {currentCellIndex < routing.length - 1 && (
                            <>
                                <span className="text-border">•</span>
                                <span className="text-muted-foreground">Next:</span>
                                <span className="font-semibold text-foreground">{routing[currentCellIndex + 1]?.cell_name}</span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
