import React from 'react';
import { CheckCircle2, Circle, ArrowRight, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJobRouting } from '@/hooks/useQRMMetrics';
import { useAuth } from '@/contexts/AuthContext';
import type { CellQRMMetrics } from '@/types/qrm';
import { useTranslation } from 'react-i18next';

interface JobFlowProgressProps {
    jobId: string;
    currentCellId?: string;
    nextCellName?: string;
    nextCellMetrics: CellQRMMetrics | null;
    className?: string;
}

/**
 * Compact job flow progress indicator that replaces the verbose
 * NextCellInfo + RoutingVisualization combo with a cleaner UX.
 *
 * Shows: [progress dots] Current Cell → Next Cell [capacity status]
 */
export function JobFlowProgress({
    jobId,
    currentCellId,
    nextCellName,
    nextCellMetrics,
    className
}: JobFlowProgressProps) {
    const { t } = useTranslation();
    const { profile } = useAuth();
    const { routing, loading, error } = useJobRouting(jobId, profile?.tenant_id || null);

    if (loading) {
        return (
            <div className={cn("flex items-center gap-2 text-muted-foreground text-xs", className)}>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{t('terminal.flowProgress.loading', 'Loading routing...')}</span>
            </div>
        );
    }

    if (error || !routing || routing.length === 0) {
        return null;
    }

    const currentIndex = routing.findIndex(step => step.cell_id === currentCellId);
    const totalSteps = routing.length;
    const currentStep = currentIndex + 1;
    const isLastStep = currentIndex === totalSteps - 1;

    // Determine next cell capacity status
    const getCapacityStatus = () => {
        if (!nextCellMetrics || isLastStep) return null;

        const hasLimit = nextCellMetrics.wip_limit !== null && nextCellMetrics.wip_limit !== undefined;
        if (!hasLimit) return { status: 'ok', label: t('terminal.flowProgress.noLimit', 'No limit') };

        const currentWip = nextCellMetrics.current_wip || 0;
        const wipLimit = nextCellMetrics.wip_limit || 0;
        const utilizationPercent = wipLimit > 0 ? (currentWip / wipLimit) * 100 : 0;

        if (currentWip >= wipLimit) {
            return {
                status: 'blocked',
                label: t('terminal.flowProgress.atCapacity', 'At capacity'),
                count: `${currentWip}/${wipLimit}`
            };
        } else if (utilizationPercent >= 80) {
            return {
                status: 'warning',
                label: t('terminal.flowProgress.nearCapacity', 'Near capacity'),
                count: `${currentWip}/${wipLimit}`
            };
        }
        return {
            status: 'ok',
            label: t('terminal.flowProgress.available', 'Available'),
            count: `${currentWip}/${wipLimit}`
        };
    };

    const capacityStatus = getCapacityStatus();

    return (
        <div className={cn("space-y-2", className)}>
            {/* Progress indicator row */}
            <div className="flex items-center justify-between gap-2">
                {/* Step dots */}
                <div className="flex items-center gap-1">
                    {routing.map((step, index) => {
                        const isCompleted = step.completed_operations === step.operation_count && step.operation_count > 0;
                        const isCurrent = step.cell_id === currentCellId;

                        return (
                            <div
                                key={step.cell_id}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    isCompleted && "bg-status-completed",
                                    isCurrent && "bg-primary ring-2 ring-primary/30 scale-125",
                                    !isCompleted && !isCurrent && "bg-muted-foreground/30"
                                )}
                                title={step.cell_name}
                            />
                        );
                    })}
                </div>

                {/* Step counter */}
                <span className="text-[10px] text-muted-foreground font-medium">
                    {t('terminal.flowProgress.step', 'Step')} {currentStep}/{totalSteps}
                </span>
            </div>

            {/* Current → Next with capacity */}
            <div className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-lg border",
                capacityStatus?.status === 'blocked' && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
                capacityStatus?.status === 'warning' && "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
                (!capacityStatus || capacityStatus.status === 'ok') && "bg-muted/30 border-border"
            )}>
                {/* Current cell */}
                <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                    <span className="text-sm font-semibold text-foreground truncate">
                        {routing[currentIndex]?.cell_name || t('terminal.flowProgress.unknown', 'Unknown')}
                    </span>
                </div>

                {/* Arrow to next */}
                {!isLastStep && (
                    <>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

                        {/* Next cell with capacity */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className={cn(
                                "text-sm font-medium truncate",
                                capacityStatus?.status === 'blocked' && "text-red-700 dark:text-red-300",
                                capacityStatus?.status === 'warning' && "text-amber-700 dark:text-amber-300",
                                capacityStatus?.status === 'ok' && "text-foreground"
                            )}>
                                {nextCellName || routing[currentIndex + 1]?.cell_name}
                            </span>

                            {/* Capacity indicator */}
                            {capacityStatus && (
                                <div className={cn(
                                    "flex items-center gap-1 text-[10px] font-medium shrink-0",
                                    capacityStatus.status === 'blocked' && "text-red-600 dark:text-red-400",
                                    capacityStatus.status === 'warning' && "text-amber-600 dark:text-amber-400",
                                    capacityStatus.status === 'ok' && "text-emerald-600 dark:text-emerald-400"
                                )}>
                                    {capacityStatus.status === 'blocked' && <XCircle className="w-3 h-3" />}
                                    {capacityStatus.status === 'warning' && <AlertTriangle className="w-3 h-3" />}
                                    {capacityStatus.status === 'ok' && <CheckCircle2 className="w-3 h-3" />}
                                    {capacityStatus.count && (
                                        <span className="font-mono">{capacityStatus.count}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Last step indicator */}
                {isLastStep && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="font-medium">{t('terminal.flowProgress.finalStep', 'Final step')}</span>
                    </div>
                )}
            </div>

            {/* Blocking message */}
            {capacityStatus?.status === 'blocked' && nextCellMetrics?.enforce_limit && (
                <div className="flex items-center gap-1.5 text-[10px] text-red-600 dark:text-red-400 font-medium px-1">
                    <XCircle className="w-3 h-3" />
                    <span>{t('terminal.flowProgress.cannotProceed', 'Cannot proceed - next cell at capacity')}</span>
                </div>
            )}
        </div>
    );
}
