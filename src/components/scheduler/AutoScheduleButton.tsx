import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SchedulerService, CalendarDay } from "@/lib/scheduler";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { addMonths, format } from "date-fns";
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
    const { tenant } = useAuth();
    const queryClient = useQueryClient();

    const checkExistingSchedules = async (): Promise<number> => {
        const { count, error } = await supabase
            .from("operations")
            .select("*", { count: "exact", head: true })
            .neq("status", "completed")
            .not("planned_start", "is", null);

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
        } catch (error: any) {
            console.error("Error checking schedules:", error);
            toast.error(t("capacity.schedulingFailed", "Scheduling Failed"), {
                description: error.message,
            });
            setLoading(false);
        }
    };

    const runScheduler = async () => {
        setLoading(true);
        setShowConfirmDialog(false);
        try {
            // 1. Fetch all necessary data in parallel
            const [jobsResult, operationsResult, cellsResult, calendarResult] = await Promise.all([
                supabase
                    .from("jobs")
                    .select("*")
                    .neq("status", "completed"),
                supabase
                    .from("operations")
                    .select("*")
                    .neq("status", "completed"),
                supabase
                    .from("cells")
                    .select("*"),
                // Fetch calendar for next 12 months
                supabase
                    .from("factory_calendar")
                    .select("*")
                    .gte("date", format(new Date(), 'yyyy-MM-dd'))
                    .lte("date", format(addMonths(new Date(), 12), 'yyyy-MM-dd'))
            ]);

            if (jobsResult.error) throw jobsResult.error;
            if (operationsResult.error) throw operationsResult.error;
            if (cellsResult.error) throw cellsResult.error;
            if (calendarResult.error) throw calendarResult.error;

            const jobs = jobsResult.data || [];
            const operations = operationsResult.data || [];
            const cells = cellsResult.data || [];

            // Convert calendar data to CalendarDay format
            const calendarDays: CalendarDay[] = (calendarResult.data || []).map((d: any) => ({
                date: d.date,
                day_type: d.day_type,
                capacity_multiplier: d.capacity_multiplier ?? 1,
            }));

            // Get tenant config
            const tenantConfig = tenant as any;
            const config = {
                workingDaysMask: tenantConfig?.working_days_mask ?? 31,
                factoryOpeningTime: tenantConfig?.factory_opening_time?.substring(0, 5) ?? '07:00',
                factoryClosingTime: tenantConfig?.factory_closing_time?.substring(0, 5) ?? '17:00',
            };

            // 2. Run Scheduler with calendar awareness
            const scheduler = new SchedulerService(cells, calendarDays, config);
            const scheduledOps = scheduler.scheduleOperations(operations);

            // 3. Update Operations in DB
            let updatedCount = 0;
            const updates = scheduledOps
                .filter(op => op.planned_start && op.planned_end)
                .map(op => ({
                    id: op.id,
                    planned_start: op.planned_start,
                    planned_end: op.planned_end
                }));

            // Batch update operations
            for (const update of updates) {
                const { error } = await supabase
                    .from("operations")
                    .update({
                        planned_start: update.planned_start,
                        planned_end: update.planned_end
                    })
                    .eq("id", update.id);

                if (!error) updatedCount++;
            }

            // 4. Save day allocations (for multi-day operations visualization)
            // First, clear existing allocations for these operations
            const operationIds = scheduledOps.map(op => op.id);
            await supabase
                .from("operation_day_allocations")
                .delete()
                .in("operation_id", operationIds);

            // Insert new allocations
            const allAllocations = scheduledOps.flatMap(op =>
                op.day_allocations.map(alloc => ({
                    operation_id: alloc.operation_id,
                    cell_id: alloc.cell_id,
                    date: alloc.date,
                    hours_allocated: alloc.hours_allocated,
                    start_time: '07:00:00',
                    end_time: '17:00:00',
                    tenant_id: tenantConfig?.id,
                }))
            ).filter(a => a.tenant_id);

            if (allAllocations.length > 0) {
                const { error: allocError } = await supabase
                    .from("operation_day_allocations")
                    .insert(allAllocations);

                if (allocError) {
                    console.warn("Failed to save day allocations:", allocError);
                }
            }

            toast.success(t("capacity.schedulingComplete", "Scheduling Complete"), {
                description: t("capacity.operationsScheduled", { count: updatedCount }),
            });

            // Invalidate relevant queries to refresh data without full page reload
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["day-allocations"] }),
                queryClient.invalidateQueries({ queryKey: ["operations-capacity"] }),
                queryClient.invalidateQueries({ queryKey: ["factory-calendar"] }),
                queryClient.invalidateQueries({ queryKey: ["operations"] }),
                queryClient.invalidateQueries({ queryKey: ["jobs"] }),
            ]);

        } catch (error: any) {
            console.error("Scheduling error:", error);
            toast.error(t("capacity.schedulingFailed", "Scheduling Failed"), {
                description: error.message,
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
                {t("capacity.autoSchedule", "Auto Schedule")}
            </Button>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            {t("capacity.confirmOverwrite", "Confirm Schedule Overwrite")}
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
                                    {t("capacity.existingSchedules", "Existing Schedules")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {t("capacity.operationsWithDates", {
                                        count: operationsWithDates,
                                        defaultValue: "{{count}} operations with planned dates"
                                    })}
                                </p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t("capacity.overwriteWarning", "This action cannot be undone. The scheduler will recalculate all operation dates based on current capacity settings.")}
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {t("capacity.cancelScheduling", "Cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={runScheduler}>
                            {t("capacity.proceedWithScheduling", "Proceed with Scheduling")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
