import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CellQRMMetrics } from '@/types/qrm';

interface NextCellInfoProps {
    nextCellName: string;
    metrics: CellQRMMetrics | null;
    loading?: boolean;
    className?: string;
}

/**
 * Displays information about the next cell in the routing sequence
 * including capacity status according to QRM methodology
 */
export function NextCellInfo({ nextCellName, metrics, loading = false, className }: NextCellInfoProps) {
    // Don't render if there's no next cell
    if (!loading && !metrics) {
        return null;
    }

    const getStatusConfig = (): {
        icon: React.ReactNode;
        bgColor: string;
        textColor: string;
        borderColor: string;
        label: string;
    } => {
        if (!metrics || loading) {
            return {
                icon: <Loader2 className="w-4 h-4 animate-spin" />,
                bgColor: 'bg-muted/30',
                textColor: 'text-muted-foreground',
                borderColor: 'border-border/50',
                label: 'Loading...',
            };
        }

        // Determine status based on QRM metrics
        const hasLimit = metrics.wip_limit !== null && metrics.wip_limit !== undefined;
        const currentWip = metrics.current_wip || 0;
        const wipLimit = metrics.wip_limit || 0;

        if (!hasLimit) {
            // No limit set - always normal
            return {
                icon: <CheckCircle2 className="w-4 h-4" />,
                bgColor: 'bg-info/20',
                textColor: 'text-info',
                borderColor: 'border-info/50',
                label: 'No Limit',
            };
        }

        const utilizationPercent = wipLimit > 0 ? (currentWip / wipLimit) * 100 : 0;

        if (currentWip >= wipLimit) {
            // At capacity
            return {
                icon: <XCircle className="w-4 h-4" />,
                bgColor: 'bg-destructive/20',
                textColor: 'text-destructive',
                borderColor: 'border-destructive/50',
                label: 'At Capacity',
            };
        } else if (utilizationPercent >= 80) {
            // Warning threshold
            return {
                icon: <AlertTriangle className="w-4 h-4" />,
                bgColor: 'bg-warning/20',
                textColor: 'text-warning',
                borderColor: 'border-warning/50',
                label: 'High Capacity',
            };
        } else {
            // Normal
            return {
                icon: <CheckCircle2 className="w-4 h-4" />,
                bgColor: 'bg-success/20',
                textColor: 'text-success',
                borderColor: 'border-success/50',
                label: 'Available',
            };
        }
    };

    const statusConfig = getStatusConfig();

    return (
        <div className={cn("rounded-lg border p-4 backdrop-blur-sm shadow-sm", statusConfig.borderColor, statusConfig.bgColor, className)}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Next Cell
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className={cn("flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm", statusConfig.textColor, statusConfig.bgColor)}>
                    {statusConfig.icon}
                    <span>{statusConfig.label}</span>
                </div>
            </div>

            {loading ? (
                <div className="text-sm font-medium text-muted-foreground">
                    Loading next cell...
                </div>
            ) : metrics ? (
                <>
                    <div className="flex items-center justify-between">
                        <div className="text-base font-bold text-foreground">
                            {nextCellName || metrics.cell_name || 'Unknown Cell'}
                        </div>
                        {metrics.wip_limit !== null && metrics.wip_limit !== undefined && (
                            <div className="font-mono text-sm font-bold">
                                <span className={statusConfig.textColor}>
                                    {metrics.current_wip || 0}
                                </span>
                                <span className="text-muted-foreground mx-1">/</span>
                                <span className="text-foreground">
                                    {metrics.wip_limit}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1.5">jobs</span>
                            </div>
                        )}
                    </div>

                    {/* Blocking indicator */}
                    {metrics.enforce_limit && metrics.wip_limit !== null && metrics.current_wip >= metrics.wip_limit && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 backdrop-blur-sm px-3 py-2 rounded-md border border-destructive/30">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cannot proceed - next cell at capacity</span>
                        </div>
                    )}

                    {/* Warning indicator */}
                    {metrics.show_warning && metrics.wip_limit !== null && metrics.current_wip < metrics.wip_limit && (
                        <div className="mt-3 text-xs font-semibold text-warning bg-warning/10 backdrop-blur-sm px-3 py-2 rounded-md border border-warning/30">
                            Approaching capacity limit
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}
