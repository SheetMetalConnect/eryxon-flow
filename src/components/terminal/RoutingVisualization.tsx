import React from 'react';
import { useJobRouting } from '@/hooks/useQRMMetrics';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoutingStep } from '@/types/qrm';

interface RoutingVisualizationProps {
    jobId: string;
    currentCellId?: string;
    className?: string;
}

/**
 * Visualizes the routing flow for a job with stylish arrow boxes, showing:
 * - All cells in the routing sequence as connected arrow boxes
 * - Progress through each cell
 * - Current cell indicator with enhanced styling
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
        <div className={cn("space-y-4", className)}>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Job Routing Flow
            </div>

            {/* Arrow Box Flow */}
            <div className="flex items-center overflow-x-auto pb-2">
                {routing.map((step, index) => {
                    const isCompleted = step.completed_operations === step.operation_count && step.operation_count > 0;
                    const isCurrent = step.cell_id === currentCellId;
                    const isFuture = currentCellIndex !== -1 && index > currentCellIndex;
                    const isFirst = index === 0;
                    const isLast = index === routing.length - 1;
                    const progressPercent = step.operation_count > 0
                        ? Math.round((step.completed_operations / step.operation_count) * 100)
                        : 0;

                    // Color scheme based on status
                    let bgColor: string;
                    let borderColor: string;
                    let textColor: string;

                    if (isCurrent) {
                        bgColor = 'hsl(var(--primary))';
                        borderColor = 'hsl(var(--primary))';
                        textColor = 'hsl(var(--primary-foreground))';
                    } else if (isCompleted) {
                        bgColor = '#10B981'; // Emerald green
                        borderColor = '#059669';
                        textColor = '#FFFFFF';
                    } else if (isFuture) {
                        bgColor = 'hsl(var(--muted))';
                        borderColor = 'hsl(var(--border))';
                        textColor = 'hsl(var(--muted-foreground))';
                    } else {
                        // In progress but not current
                        bgColor = '#F59E0B'; // Amber
                        borderColor = '#D97706';
                        textColor = '#FFFFFF';
                    }

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
                                "relative flex flex-col justify-center min-w-[140px] p-3 transition-all duration-300",
                                isCurrent && "shadow-lg ring-2 ring-primary/40 ring-offset-0 z-10 scale-105",
                                !isCurrent && "shadow-md",
                                !isFirst && "-ml-4"
                            )}
                            style={{
                                backgroundColor: bgColor,
                                borderWidth: '2px',
                                borderStyle: 'solid',
                                borderColor: borderColor,
                                color: textColor,
                                clipPath: clipPath,
                            }}
                        >
                            {/* Status Icon & Cell Name */}
                            <div className="flex items-center gap-2 mb-1">
                                <div className="flex-shrink-0">
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                    ) : isCurrent ? (
                                        <div className="w-4 h-4 rounded-full bg-white/30 animate-pulse" />
                                    ) : (
                                        <Circle className="w-4 h-4" />
                                    )}
                                </div>
                                <div className="text-sm font-bold truncate">
                                    {step.cell_name}
                                </div>
                            </div>

                            {/* Progress Info */}
                            <div className="text-xs opacity-90 font-mono">
                                {step.completed_operations}/{step.operation_count} ops
                            </div>

                            {/* Progress Bar */}
                            {step.operation_count > 0 && (
                                <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden mt-1.5">
                                    <div
                                        className="h-full rounded-full transition-all bg-white/80"
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
                <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <div className="text-sm">
                        <span className="text-muted-foreground">Currently in:</span>
                        {' '}
                        <span className="font-bold text-foreground">{routing[currentCellIndex]?.cell_name}</span>
                    </div>
                    {currentCellIndex < routing.length - 1 && (
                        <>
                            <div className="w-px h-4 bg-border" />
                            <div className="text-sm">
                                <span className="text-muted-foreground">Next:</span>
                                {' '}
                                <span className="font-bold text-foreground">{routing[currentCellIndex + 1]?.cell_name}</span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
