import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SchedulerService, CalendarDay } from "@/lib/scheduler";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { addMonths, format } from "date-fns";

export function AutoScheduleButton() {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { t } = useTranslation();
    const { tenant } = useAuth();

    const handleSchedule = async () => {
        setLoading(true);
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

            toast({
                title: t("capacity.schedulingComplete", "Scheduling Complete"),
                description: t("capacity.operationsScheduled", { count: updatedCount }),
            });

            // Reload to show updated data
            window.location.reload();

        } catch (error: any) {
            console.error("Scheduling error:", error);
            toast({
                title: t("capacity.schedulingFailed", "Scheduling Failed"),
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleSchedule} disabled={loading}>
            {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <CalendarClock className="mr-2 h-4 w-4" />
            )}
            {t("capacity.autoSchedule", "Auto Schedule")}
        </Button>
    );
}
