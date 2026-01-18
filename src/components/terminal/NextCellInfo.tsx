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
                bgColor: 'bg-slate-50 dark:bg-slate-900/30',
                textColor: 'text-slate-600 dark:text-slate-400',
                borderColor: 'border-slate-200 dark:border-slate-800',
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
                bgColor: 'bg-blue-50 dark:bg-blue-900/30',
                textColor: 'text-blue-700 dark:text-blue-300',
                borderColor: 'border-blue-200 dark:border-blue-800',
                label: 'No Limit',
            };
        }

        const utilizationPercent = wipLimit > 0 ? (currentWip / wipLimit) * 100 : 0;

        if (currentWip >= wipLimit) {
            // At capacity
            return {
                icon: <XCircle className="w-4 h-4" />,
                bgColor: 'bg-red-50 dark:bg-red-900/30',
                textColor: 'text-red-700 dark:text-red-300',
                borderColor: 'border-red-300 dark:border-red-800',
                label: 'At Capacity',
            };
        } else if (utilizationPercent >= 80) {
            // Warning threshold
            return {
                icon: <AlertTriangle className="w-4 h-4" />,
                bgColor: 'bg-amber-50 dark:bg-amber-900/30',
                textColor: 'text-amber-700 dark:text-amber-300',
                borderColor: 'border-amber-300 dark:border-amber-800',
                label: 'High Capacity',
            };
        } else {
            // Normal
            return {
                icon: <CheckCircle2 className="w-4 h-4" />,
                bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
                textColor: 'text-emerald-700 dark:text-emerald-300',
                borderColor: 'border-emerald-200 dark:border-emerald-800',
                label: 'Available',
            };
        }
    };

    const statusConfig = getStatusConfig();

    return (
        <div className={cn("rounded-lg border p-3", statusConfig.borderColor, statusConfig.bgColor, className)}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Next Cell
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className={cn("flex items-center gap-1.5 text-xs font-semibold", statusConfig.textColor)}>
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
                            <div className="font-mono text-sm font-semibold">
                                <span className={statusConfig.textColor}>
                                    {metrics.current_wip || 0}
                                </span>
                                <span className="text-muted-foreground mx-0.5">/</span>
                                <span className="text-muted-foreground">
                                    {metrics.wip_limit}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">jobs</span>
                            </div>
                        )}
                    </div>

                    {/* Blocking indicator */}
                    {metrics.enforce_limit && metrics.wip_limit !== null && metrics.current_wip >= metrics.wip_limit && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-300">
                            <XCircle className="w-3 h-3" />
                            <span>Cannot proceed - next cell at capacity</span>
                        </div>
                    )}

                    {/* Warning indicator - only show when utilization is at or above warning threshold (80% or custom) */}
                    {metrics.show_warning && metrics.wip_limit !== null && metrics.current_wip < metrics.wip_limit && (() => {
                        const threshold = metrics.wip_warning_threshold ?? Math.floor(metrics.wip_limit * 0.8);
                        return metrics.current_wip >= threshold;
                    })() && (
                        <div className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                            Approaching capacity limit
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}
