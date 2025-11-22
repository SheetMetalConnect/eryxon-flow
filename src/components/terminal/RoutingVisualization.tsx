import React from 'react';
import { useJobRouting } from '@/hooks/useQRMMetrics';
import { ArrowRight, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoutingStep } from '@/types/qrm';

interface RoutingVisualizationProps {
    jobId: string;
    currentCellId?: string;
    className?: string;
}

/**
 * Visualizes the routing flow for a job, showing:
 * - All cells in the routing sequence
 * - Progress through each cell
 * - Current cell indicator
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
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Job Routing
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {routing.map((step, index) => {
                    const isCompleted = step.completed_operations === step.operation_count && step.operation_count > 0;
                    const isCurrent = step.cell_id === currentCellId;
                    const isFuture = currentCellIndex !== -1 && index > currentCellIndex;
                    const progressPercent = step.operation_count > 0
                        ? Math.round((step.completed_operations / step.operation_count) * 100)
                        : 0;

                    return (
                        <React.Fragment key={step.cell_id}>
                            {/* Cell Step */}
                            <div
                                className={cn(
                                    "flex flex-col items-center min-w-[100px] p-2 rounded-lg border-2 transition-all",
                                    isCurrent && "border-primary bg-primary/10 ring-2 ring-primary/20",
                                    isCompleted && !isCurrent && "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20",
                                    !isCompleted && !isCurrent && !isFuture && "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20",
                                    isFuture && "border-border bg-muted/30"
                                )}
                            >
                                {/* Status Icon */}
                                <div className="mb-1">
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    ) : isCurrent ? (
                                        <div className="w-5 h-5 rounded-full bg-primary animate-pulse" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>

                                {/* Cell Name */}
                                <div
                                    className={cn(
                                        "text-xs font-bold text-center mb-1 whitespace-nowrap",
                                        isCurrent && "text-primary",
                                        isCompleted && !isCurrent && "text-emerald-700 dark:text-emerald-300",
                                        !isCompleted && !isCurrent && !isFuture && "text-amber-700 dark:text-amber-300",
                                        isFuture && "text-muted-foreground"
                                    )}
                                >
                                    {step.cell_name}
                                </div>

                                {/* Progress */}
                                <div className="text-[10px] text-muted-foreground font-mono">
                                    {step.completed_operations}/{step.operation_count} ops
                                </div>

                                {/* Progress Bar */}
                                {step.operation_count > 0 && (
                                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                                        <div
                                            className={cn(
                                                "h-full transition-all rounded-full",
                                                isCompleted && "bg-emerald-500",
                                                !isCompleted && isCurrent && "bg-primary",
                                                !isCompleted && !isCurrent && !isFuture && "bg-amber-500",
                                                isFuture && "bg-muted-foreground"
                                            )}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Arrow Separator */}
                            {index < routing.length - 1 && (
                                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Current Cell Indicator */}
            {currentCellIndex !== -1 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span>
                        Currently in: <span className="font-semibold text-foreground">{routing[currentCellIndex]?.cell_name}</span>
                    </span>
                    {currentCellIndex < routing.length - 1 && (
                        <span className="ml-2">
                            Next: <span className="font-semibold text-foreground">{routing[currentCellIndex + 1]?.cell_name}</span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
