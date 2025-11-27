import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { SchedulerService } from "@/lib/scheduler";
import { AutoScheduleButton } from "@/components/scheduler/AutoScheduleButton";

import { useTranslation } from "react-i18next";

export default function CapacityMatrix() {
    const { t } = useTranslation();
    const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const { data: cells, isLoading: cellsLoading } = useQuery({
        queryKey: ["cells-capacity"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("cells")
                .select("*")
                .order("sequence");
            if (error) throw error;
            return data as any[];
        },
    });

    const { data: operations, isLoading: opsLoading } = useQuery({
        queryKey: ["operations-capacity", startDate],
        queryFn: async () => {
            // Fetch operations that overlap with the 2-week window
            // For simplicity, we fetch all active/planned operations and filter in memory or service
            // In a real app, we'd filter by date range in the query
            const { data, error } = await supabase
                .from("operations")
                .select("*, cell:cells(name)")
                .not("status", "eq", "completed");

            if (error) throw error;
            return data as any[];
        },
    });

    const daysToShow = 14;
    const dates = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));

    const getCellLoad = (cellId: string, date: Date) => {
        if (!operations || !cells) return { hours: 0, percent: 0 };

        const cell = cells.find(c => c.id === cellId);
        if (!cell) return { hours: 0, percent: 0 };

        const capacity = cell.capacity_hours_per_day || 8;

        // Sum hours for this cell on this date
        // We look at planned_start. If null, we ignore (or put in backlog bucket)
        const opsOnDate = operations.filter(op => {
            if (op.cell_id !== cellId) return false;
            if (!op.planned_start) return false;
            return isSameDay(parseISO(op.planned_start), date);
        });

        const totalMinutes = opsOnDate.reduce((sum, op) => {
            // Calculate total time: setup + (run * quantity) + wait + changeover
            // We need quantity. Assuming run_time_per_unit is total for now if quantity missing
            // Or we fetch quantity from somewhere else. 
            // For this MVP, let's use estimated_time as total minutes.
            return sum + (op.estimated_time || 0);
        }, 0);

        const totalHours = totalMinutes / 60;
        const percent = (totalHours / capacity) * 100;

        return { hours: totalHours, percent };
    };

    const getLoadColor = (percent: number) => {
        if (percent === 0) return "bg-gray-100 text-gray-400";
        if (percent <= 50) return "bg-green-100 text-green-700";
        if (percent <= 80) return "bg-yellow-100 text-yellow-700";
        return "bg-red-100 text-red-700";
    };

    if (cellsLoading || opsLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t("capacity.title")}</h1>
                <div className="flex items-center gap-4">
                    <AutoScheduleButton />
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setStartDate(d => addDays(d, -7))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-medium">
                            {format(startDate, "MMM d")} - {format(addDays(startDate, daysToShow - 1), "MMM d, yyyy")}
                        </span>
                        <Button variant="outline" size="icon" onClick={() => setStartDate(d => addDays(d, 7))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("capacity.workloadOverview")}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-2 text-left border-b min-w-[150px] sticky left-0 bg-background z-10">{t("capacity.cell")}</th>
                                {dates.map(date => (
                                    <th key={date.toISOString()} className="p-2 text-center border-b min-w-[80px]">
                                        <div className="text-xs text-muted-foreground">{format(date, "EEE")}</div>
                                        <div className="font-bold">{format(date, "d")}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {cells?.map(cell => (
                                <tr key={cell.id} className="border-b hover:bg-muted/50">
                                    <td className="p-3 font-medium sticky left-0 bg-background z-10 border-r">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cell.color || '#ccc' }} />
                                            {cell.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground ml-5">
                                            {t("capacity.capacity")}: {cell.capacity_hours_per_day || 8}h
                                        </div>
                                    </td>
                                    {dates.map(date => {
                                        const { hours, percent } = getCellLoad(cell.id, date);
                                        return (
                                            <td key={date.toISOString()} className="p-1 text-center border-r last:border-r-0">
                                                <div
                                                    className={`rounded-md p-2 text-xs font-medium transition-colors ${getLoadColor(percent)}`}
                                                    title={`${hours.toFixed(1)}h / ${(cell.capacity_hours_per_day || 8)}h`}
                                                >
                                                    {Math.round(percent)}%
                                                    <div className="text-[10px] opacity-80">{hours.toFixed(1)}h</div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
