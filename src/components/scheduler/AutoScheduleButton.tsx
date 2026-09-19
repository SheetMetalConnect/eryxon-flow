import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildOperationScheduleConstraints, buildSchedulePlanPayload, groupOperationsByJob, SchedulerService, CalendarDay } from "@/lib/scheduler";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/hooks/useProfile";
import { useTenant } from "@/hooks/useTenant";
import { useQueryClient } from "@tanstack/react-query";
import { addMonths, format } from "date-fns";
import { logger } from '@/lib/logger';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AutoScheduleButton() {
    const [loading, setLoading] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [operationsWithDates, setOperationsWithDates] = useState(0);
    const { t } = useTranslation();
    const profile = useProfile();
    const { tenant } = useTenant();
    const queryClient = useQueryClient();
    const tenantId = tenant?.id ?? profile?.tenant_id;

    const checkExistingSchedules = async (): Promise<number> => {
        if (!tenantId) {
            throw new Error(t("capacity.tenantRequired"));
        }

        let query = supabase
            .from("operations")
            .select("id", { count: "exact", head: true })
            .eq("status", "not_started")
            .not("planned_start", "is", null);
        if (tenantId) {
            query = query.eq("tenant_id", tenantId);
        }
        const { count, error } = await query;

        if (error) throw error;
        return count ?? 0;
    };

    const handleScheduleClick = async () => {
        setLoading(true);
        try {
            const existingCount = await checkExistingSchedules();
            if (existingCount > 0) {
                setOperationsWithDates(existingCount);
                setShowConfirmDialog(true);
                setLoading(false);
                return;
            }
            await runScheduler();
        } catch (error: unknown) {
            logger.error('AutoScheduleButton', 'Error checking schedules', error);
            toast.error(t("capacity.schedulingFailed"), {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
            setLoading(false);
        }
    };

    const runScheduler = async () => {
        setLoading(true);
        setShowConfirmDialog(false);
        try {
            if (!tenantId) {
                throw new Error(t("capacity.tenantRequired"));
            }

            const [jobsResult, partsResult, operationsResult, cellsResult, calendarResult, allocationsResult] = await Promise.all([
                supabase
                    .from("jobs")
                    .select("id, due_date, due_date_override")
                    .eq("tenant_id", tenantId)
                    .is("deleted_at", null)
                    .neq("status", "completed")
                    .order("due_date", { ascending: true }),
                supabase
                    .from("parts")
                    .select("id, job_id")
                    .eq("tenant_id", tenantId)
                    .is("deleted_at", null),
                supabase
                    .from("operations")
                    .select("id, part_id, cell_id, sequence, estimated_time, status, planned_start, planned_end, updated_at")
                    .eq("tenant_id", tenantId)
                    .is("deleted_at", null)
                    .neq("status", "completed")
                    .order("sequence", { ascending: true }),
                supabase
                    .from("cells")
                    .select("id, capacity_hours_per_day")
                    .eq("tenant_id", tenantId)
                    .is("deleted_at", null),
                supabase
                    .from("factory_calendar")
                    .select("date, day_type, capacity_multiplier")
                    .eq("tenant_id", tenantId)
                    .gte("date", format(new Date(), 'yyyy-MM-dd'))
                    .lte("date", format(addMonths(new Date(), 12), 'yyyy-MM-dd')),
                supabase
                    .from("operation_day_allocations")
                    .select("operation_id, cell_id, date, hours_allocated")
                    .eq("tenant_id", tenantId)
                    .gte("date", format(new Date(), 'yyyy-MM-dd')),
            ]);

            if (jobsResult.error) throw jobsResult.error;
            if (partsResult.error) throw partsResult.error;
            if (operationsResult.error) throw operationsResult.error;
            if (cellsResult.error) throw cellsResult.error;
            if (calendarResult.error) throw calendarResult.error;
            if (allocationsResult.error) throw allocationsResult.error;

            const jobs = jobsResult.data || [];
            const parts = partsResult.data || [];
            const operations = operationsResult.data || [];
            const cells = cellsResult.data || [];

            const calendarDays = (calendarResult.data || []).map((d: { date: string; day_type: string; capacity_multiplier: number | null }) => ({
                date: d.date,
                day_type: d.day_type as CalendarDay['day_type'],
                capacity_multiplier: d.capacity_multiplier ?? 1,
            })) as CalendarDay[];

            const config = {
                workingDaysMask: tenant?.working_days_mask ?? 31,
                factoryOpeningTime: tenant?.factory_opening_time?.substring(0, 5) ?? '07:00',
                factoryClosingTime: tenant?.factory_closing_time?.substring(0, 5) ?? '17:00',
            };

            const scheduler = new SchedulerService(cells, calendarDays, config);
            const allExistingAllocations = allocationsResult.data || [];
            scheduler.reserveAllocations(allExistingAllocations);
            const allocationsByOperation = new Map<string, typeof allExistingAllocations>();
            for (const allocation of allExistingAllocations) {
                const existing = allocationsByOperation.get(allocation.operation_id) ?? [];
                existing.push(allocation);
                allocationsByOperation.set(allocation.operation_id, existing);
            }

            const notStartedOperations = operations.filter(
                (operation) => operation.status === "not_started",
            );
            const now = new Date();
            const scheduledOps = scheduler.scheduleJobs(
                jobs,
                groupOperationsByJob(notStartedOperations, parts),
                now,
                {
                    constraintsByOperation: buildOperationScheduleConstraints(operations, now),
                    existingAllocationsByOperation: allocationsByOperation,
                },
            );

            const scheduledOperationIds = new Set(
                scheduledOps
                    .filter((operation) => operation.scheduling_status === 'scheduled')
                    .map((operation) => operation.id),
            );
            const retainedAllocations = allExistingAllocations.filter((allocation) =>
                !scheduledOperationIds.has(allocation.operation_id),
            );
            const plan = buildSchedulePlanPayload(
                scheduledOps,
                retainedAllocations,
                config.factoryOpeningTime,
                config.factoryClosingTime,
            );
            const unscheduledCount = scheduledOps.filter(
                (operation) => operation.scheduling_status === 'unscheduled',
            ).length;

            if (plan.operations.length > 0) {
                const { error } = await supabase.rpc('apply_schedule_plan', {
                    p_tenant_id: tenantId,
                    p_operations: plan.operations,
                    p_allocations: plan.allocations,
                });
                if (error) throw error;
            }

            if (plan.operations.length > 0) {
                toast.success(t("capacity.schedulingComplete"), {
                    description: t("capacity.operationsScheduled", { count: plan.operations.length }),
                });
            }
            if (unscheduledCount > 0) {
                toast.warning(t("capacity.schedulingPartial"), {
                    description: t("capacity.operationsUnscheduled", { count: unscheduledCount }),
                });
            }

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["capacity"] }),
                queryClient.invalidateQueries({ queryKey: ["factoryCalendar"] }),
                queryClient.invalidateQueries({ queryKey: ["operations"] }),
                queryClient.invalidateQueries({ queryKey: ["jobs"] }),
            ]);

        } catch (error: unknown) {
            logger.error('AutoScheduleButton', 'Scheduling error', error);
            toast.error(t("capacity.schedulingFailed"), {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button onClick={handleScheduleClick} disabled={loading}>
                {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <CalendarClock className="mr-2 h-4 w-4" />
                )}
                {t("capacity.autoSchedule")}
            </Button>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            {t("capacity.confirmOverwrite")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>
                                {t("capacity.confirmOverwriteDescription", {
                                    count: operationsWithDates,
                                    defaultValue: "{{count}} operations already have planned dates. Running the auto-scheduler will overwrite these existing schedules."
                                })}
                            </p>
                            <div className="bg-muted p-3 rounded-md">
                                <p className="text-sm font-medium text-foreground">
                                    {t("capacity.existingSchedules")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {t("capacity.operationsWithDates", {
                                        count: operationsWithDates,
                                        defaultValue: "{{count}} operations with planned dates"
                                    })}
                                </p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t("capacity.overwriteWarning")}
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {t("capacity.cancelScheduling")}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={runScheduler}>
                            {t("capacity.proceedWithScheduling")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
