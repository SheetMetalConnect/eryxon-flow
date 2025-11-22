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
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
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
                                    "flex flex-col items-center min-w-[100px] p-3 rounded-lg border-2 transition-all duration-300 backdrop-blur-sm shadow-sm",
                                    isCurrent && "border-primary/70 bg-primary/20 ring-2 ring-primary/30 shadow-md shadow-primary/20",
                                    isCompleted && !isCurrent && "border-success/50 bg-success/10",
                                    !isCompleted && !isCurrent && !isFuture && "border-warning/50 bg-warning/10",
                                    isFuture && "border-border/50 bg-muted/20"
                                )}
                            >
                                {/* Status Icon */}
                                <div className="mb-2">
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-6 h-6 text-success" />
                                    ) : isCurrent ? (
                                        <div className="w-6 h-6 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />
                                    ) : (
                                        <Circle className="w-6 h-6 text-muted-foreground" />
                                    )}
                                </div>

                                {/* Cell Name */}
                                <div
                                    className={cn(
                                        "text-xs font-bold text-center mb-1.5 whitespace-nowrap",
                                        isCurrent && "text-primary",
                                        isCompleted && !isCurrent && "text-success",
                                        !isCompleted && !isCurrent && !isFuture && "text-warning",
                                        isFuture && "text-muted-foreground"
                                    )}
                                >
                                    {step.cell_name}
                                </div>

                                {/* Progress */}
                                <div className="text-[10px] text-muted-foreground font-mono font-semibold">
                                    {step.completed_operations}/{step.operation_count} ops
                                </div>

                                {/* Progress Bar */}
                                {step.operation_count > 0 && (
                                    <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden mt-2 shadow-inner">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-500 rounded-full shadow-sm",
                                                isCompleted && "bg-success",
                                                !isCompleted && isCurrent && "bg-primary",
                                                !isCompleted && !isCurrent && !isFuture && "bg-warning",
                                                isFuture && "bg-muted-foreground/50"
                                            )}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Arrow Separator */}
                            {index < routing.length - 1 && (
                                <ArrowRight className="w-5 h-5 text-primary/50 flex-shrink-0" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Current Cell Indicator */}
            {currentCellIndex !== -1 && (
                <div className="text-xs text-muted-foreground flex items-center gap-2 bg-card/30 backdrop-blur-sm px-3 py-2 rounded-md border border-border/50">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />
                    <span className="font-medium">
                        Currently in: <span className="font-bold text-primary">{routing[currentCellIndex]?.cell_name}</span>
                    </span>
                    {currentCellIndex < routing.length - 1 && (
                        <span className="ml-2 font-medium">
                            Next: <span className="font-bold text-foreground">{routing[currentCellIndex + 1]?.cell_name}</span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
