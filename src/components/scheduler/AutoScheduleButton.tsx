import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SchedulerService } from "@/lib/scheduler";
import { useTranslation } from "react-i18next";

export function AutoScheduleButton() {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { t } = useTranslation();

    const handleSchedule = async () => {
        setLoading(true);
        try {
            // 1. Fetch all necessary data
            const { data: jobs, error: jobsError } = await supabase
                .from("jobs")
                .select("*")
                .neq("status", "completed");

            if (jobsError) throw jobsError;

            const { data: operations, error: opsError } = await supabase
                .from("operations")
                .select("*")
                .neq("status", "completed");

            if (opsError) throw opsError;

            const { data: cells, error: cellsError } = await supabase
                .from("cells")
                .select("*");

            if (cellsError) throw cellsError;

            // 2. Run Scheduler
            const scheduler = new SchedulerService(cells);
            // We need to group operations or pass them correctly. 
            // For this MVP, we'll just pass all operations and let the scheduler handle them simply.
            // Note: The scheduler implementation we wrote does a simple pass.

            const scheduledOps = scheduler.scheduleOperations(operations);

            // 3. Update Operations in DB
            // We'll do this in batches or one by one.
            let updatedCount = 0;
            for (const op of scheduledOps) {
                if (op.planned_start && op.planned_end) {
                    const { error } = await supabase
                        .from("operations")
                        .update({
                            planned_start: op.planned_start,
                            planned_end: op.planned_end
                        })
                        .eq("id", op.id);

                    if (!error) updatedCount++;
                }
            }

            toast({
                title: t("capacity.schedulingComplete"),
                description: t("capacity.operationsScheduled", { count: updatedCount }),
            });

            // Optionally trigger a refresh of the parent view if needed
            // window.location.reload(); // Simple brute force refresh or use query invalidation

        } catch (error: any) {
            console.error("Scheduling error:", error);
            toast({
                title: t("capacity.schedulingFailed"),
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
            {t("capacity.autoSchedule")}
        </Button>
    );
}
