import { useState, useMemo, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek, isSameDay, parseISO, getDay, isWithinInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarOff } from "lucide-react";
import { AutoScheduleButton } from "@/components/scheduler/AutoScheduleButton";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { CapacityMatrixSkeleton, CellSkeleton } from "@/components/capacity/CapacityMatrixSkeleton";
import { CellScheduleDialog } from "@/components/capacity/CellScheduleDialog";

interface CalendarDay {
    date: string;
    day_type: 'working' | 'holiday' | 'closure' | 'half_day';
    name: string | null;
    capacity_multiplier: number;
}

interface DayAllocation {
    id: string;
    operation_id: string;
    cell_id: string;
    date: string;
    hours_allocated: number;
    operation?: {
        id: string;
        operation_name: string | null;
        part?: {
            part_number: string;
            job?: {
                job_number: string;
                customer: string | null;
            };
        };
    };
}

// Memoized cell component for better performance
const CapacityCell = memo(function CapacityCell({
    cellId,
    cellName,
    date,
    hours,
    percent,
    capacity,
    dayInfo,
    allocations,
    operations,
    onClick,
}: {
    cellId: string;
    cellName: string;
    date: Date;
    hours: number;
    percent: number;
    capacity: number;
    dayInfo: { type: string; label: string | null; multiplier: number };
    allocations: DayAllocation[];
    operations: any[];
    onClick: () => void;
}) {
    const items = allocations.length > 0 ? allocations : operations;

    const getLoadColor = (percent: number, dayType: string) => {
        if (dayType === 'holiday' || dayType === 'closure') {
            return "bg-gray-200 text-gray-500 border-gray-300";
        }
        if (dayType === 'weekend') {
            return "bg-gray-100 text-gray-400 border-gray-200";
        }
        if (percent === 0) return "bg-gray-50 text-gray-400 border-gray-200";
        if (percent <= 50) return "bg-green-100 text-green-700 border-green-200";
        if (percent <= 80) return "bg-yellow-100 text-yellow-700 border-yellow-200";
        if (percent <= 100) return "bg-orange-100 text-orange-700 border-orange-200";
        return "bg-red-100 text-red-700 border-red-200";
    };

    return (
        <td className="p-1 text-center border-r last:border-r-0">
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={`rounded-md p-2 text-xs font-medium transition-all cursor-pointer border hover:ring-2 hover:ring-primary/20 hover:scale-105 ${getLoadColor(percent, dayInfo.type)}`}
                        onClick={onClick}
                    >
                        {dayInfo.type === 'holiday' || dayInfo.type === 'closure' ? (
                            <div className="flex flex-col items-center">
                                <CalendarOff className="h-4 w-4" />
                                <span className="text-[10px]">Closed</span>
                            </div>
                        ) : dayInfo.type === 'weekend' ? (
                            <div className="flex flex-col items-center">
                                <span className="text-[10px]">Weekend</span>
                            </div>
                        ) : (
                            <>
                                {Math.round(percent)}%
                                <div className="text-[10px] opacity-80">
                                    {hours.toFixed(1)}h / {capacity}h
                                </div>
                            </>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                        <div className="font-semibold">
                            {cellName} - {format(date, "MMM d")}
                        </div>
                        {dayInfo.label && (
                            <div className="text-red-500">{dayInfo.label}</div>
                        )}
                        {capacity > 0 && (
                            <div>
                                {hours.toFixed(1)}h scheduled / {capacity}h capacity
                            </div>
                        )}
                        {items.length > 0 && (
                            <div className="border-t pt-1 mt-1">
                                <div className="text-xs font-medium mb-1">Operations:</div>
                                {items.slice(0, 3).map((item: any, idx: number) => (
                                    <div key={idx} className="text-xs">
                                        • {item.operation?.part?.job?.job_number || item.part?.job?.job_number || 'Job'}:
                                        {' '}{item.operation?.operation_name || item.name || 'Operation'}
                                        {item.hours_allocated ? ` (${item.hours_allocated}h)` : ''}
                                    </div>
                                ))}
                                {items.length > 3 && (
                                    <div className="text-xs text-muted-foreground">
                                        +{items.length - 3} more
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="text-xs text-primary mt-2 font-medium">
                            Click to manage schedule →
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </td>
    );
});

export default function CapacityMatrix() {
    const { t } = useTranslation();
    const { tenant } = useAuth();
    const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [selectedCell, setSelectedCell] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Working days mask from tenant (default Mon-Fri = 31)
    const workingDaysMask = (tenant as any)?.working_days_mask ?? 31;

    // Fetch cells first (usually cached, fast)
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
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Fetch calendar data
    const { data: calendarDays, isLoading: calendarLoading } = useQuery({
        queryKey: ["factory-calendar", format(startDate, 'yyyy-MM-dd')],
        queryFn: async () => {
            const endDate = addDays(startDate, 14);
            const { data, error } = await supabase
                .from("factory_calendar")
                .select("*")
                .gte("date", format(startDate, 'yyyy-MM-dd'))
                .lte("date", format(endDate, 'yyyy-MM-dd'));
            if (error) throw error;
            return (data || []) as CalendarDay[];
        },
        staleTime: 60 * 1000, // 1 minute
    });

    // Fetch day allocations (main data source)
    const { data: dayAllocations, isLoading: allocationsLoading, isFetching: allocationsFetching } = useQuery({
        queryKey: ["day-allocations", format(startDate, 'yyyy-MM-dd')],
        queryFn: async () => {
            const endDate = addDays(startDate, 14);
            const { data, error } = await supabase
                .from("operation_day_allocations")
                .select(`
                    *,
                    operation:operations(
                        id,
                        operation_name,
                        part:parts(
                            part_number,
                            job:jobs(job_number, customer)
                        )
                    )
                `)
                .gte("date", format(startDate, 'yyyy-MM-dd'))
                .lte("date", format(endDate, 'yyyy-MM-dd'));
            if (error) throw error;
            return (data || []) as DayAllocation[];
        },
        staleTime: 30 * 1000, // 30 seconds
    });

    // Fallback: fetch operations with planned dates if no allocations
    const { data: operations, isLoading: opsLoading } = useQuery({
        queryKey: ["operations-capacity", format(startDate, 'yyyy-MM-dd')],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("operations")
                .select(`
                    *,
                    cell:cells(name),
                    part:parts(
                        name,
                        job:jobs(job_number, customer_name)
                    )
                `)
                .neq("status", "completed")
                .not("planned_start", "is", null);

            if (error) throw error;
            return data as any[];
        },
        staleTime: 60 * 1000, // 1 minute
        enabled: !dayAllocations || dayAllocations.length === 0, // Only fetch if no allocations
    });

    const daysToShow = 14;
    const dates = useMemo(
        () => Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i)),
        [startDate]
    );

    // Check if a date is a default working day
    const isDefaultWorkingDay = useCallback((date: Date): boolean => {
        const jsDay = getDay(date);
        const maskBits = [64, 1, 2, 4, 8, 16, 32];
        return (workingDaysMask & maskBits[jsDay]) !== 0;
    }, [workingDaysMask]);

    // Memoized calendar lookup map
    const calendarMap = useMemo(() => {
        const map = new Map<string, CalendarDay>();
        calendarDays?.forEach(day => map.set(day.date, day));
        return map;
    }, [calendarDays]);

    // Get calendar entry for a date
    const getCalendarEntry = useCallback((date: Date): CalendarDay | null => {
        return calendarMap.get(format(date, 'yyyy-MM-dd')) || null;
    }, [calendarMap]);

    // Get day type and label
    const getDayInfo = useCallback((date: Date): { type: string; label: string | null; multiplier: number } => {
        const entry = getCalendarEntry(date);
        if (entry) {
            return {
                type: entry.day_type,
                label: entry.name,
                multiplier: entry.capacity_multiplier
            };
        }
        if (!isDefaultWorkingDay(date)) {
            return { type: 'weekend', label: null, multiplier: 0 };
        }
        return { type: 'working', label: null, multiplier: 1 };
    }, [getCalendarEntry, isDefaultWorkingDay]);

    // Memoized allocations by cell and date
    const allocationsByCellDate = useMemo(() => {
        const map = new Map<string, DayAllocation[]>();
        dayAllocations?.forEach(a => {
            const key = `${a.cell_id}-${a.date}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(a);
        });
        return map;
    }, [dayAllocations]);

    // Get allocations for a cell on a date
    const getAllocationsForCellDate = useCallback((cellId: string, date: Date): DayAllocation[] => {
        return allocationsByCellDate.get(`${cellId}-${format(date, 'yyyy-MM-dd')}`) || [];
    }, [allocationsByCellDate]);

    // Get operations for a cell on a date (fallback when no allocations)
    const getOperationsForCellDate = useCallback((cellId: string, date: Date): any[] => {
        if (!operations) return [];
        return operations.filter(op => {
            if (op.cell_id !== cellId) return false;
            if (!op.planned_start) return false;

            const opStart = parseISO(op.planned_start);
            const opEnd = op.planned_end ? parseISO(op.planned_end) : opStart;

            return isWithinInterval(date, { start: opStart, end: opEnd }) ||
                   isSameDay(opStart, date) ||
                   isSameDay(opEnd, date);
        });
    }, [operations]);

    // Calculate load for a cell on a date
    const getCellLoad = useCallback((cellId: string, date: Date, cell: any) => {
        if (!cell) return { hours: 0, percent: 0, capacity: 0 };

        const dayInfo = getDayInfo(date);
        const baseCapacity = cell.capacity_hours_per_day || 8;
        const capacity = baseCapacity * dayInfo.multiplier;

        // Use allocations if available, otherwise fall back to operations
        const allocations = getAllocationsForCellDate(cellId, date);
        let totalHours = 0;

        if (allocations.length > 0) {
            totalHours = allocations.reduce((sum, a) => sum + (a.hours_allocated || 0), 0);
        } else {
            // Fallback: use operations with planned_start on this date
            const opsOnDate = getOperationsForCellDate(cellId, date);
            const totalMinutes = opsOnDate.reduce((sum, op) => sum + (op.estimated_time || 0), 0);
            totalHours = totalMinutes / 60;
        }

        const percent = capacity > 0 ? (totalHours / capacity) * 100 : 0;

        return { hours: totalHours, percent, capacity };
    }, [getDayInfo, getAllocationsForCellDate, getOperationsForCellDate]);

    const handleCellClick = useCallback((cell: any, date: Date) => {
        setSelectedCell(cell);
        setSelectedDate(date);
        setDialogOpen(true);
    }, []);

    const handleDialogDateChange = useCallback((newDate: Date) => {
        setSelectedDate(newDate);
    }, []);

    // Show skeleton during initial load
    const isInitialLoading = cellsLoading;

    if (isInitialLoading || !cells) {
        return <CapacityMatrixSkeleton rowCount={6} />;
    }

    // Get dialog data
    const dialogAllocations = selectedCell && selectedDate
        ? getAllocationsForCellDate(selectedCell.id, selectedDate)
        : [];
    const dialogDayInfo = selectedDate ? getDayInfo(selectedDate) : { type: 'working', label: null, multiplier: 1 };
    const dialogLoad = selectedCell && selectedDate
        ? getCellLoad(selectedCell.id, selectedDate, selectedCell)
        : { hours: 0, percent: 0, capacity: 0 };

    return (
        <div className="p-4 space-y-4">
            <AdminPageHeader
                title={t("capacity.title", "Capacity Matrix")}
                description={t("capacity.description", "View and manage cell capacity across dates")}
            >
                <AutoScheduleButton />
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setStartDate(d => addDays(d, -7))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium min-w-[180px] text-center text-sm">
                        {format(startDate, "MMM d")} - {format(addDays(startDate, daysToShow - 1), "MMM d, yyyy")}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setStartDate(d => addDays(d, 7))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </AdminPageHeader>

            {/* Legend */}
            <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                    {t("capacity.load050", "0-50%")}
                </Badge>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                    {t("capacity.load5080", "50-80%")}
                </Badge>
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                    {t("capacity.load80100", "80-100%")}
                </Badge>
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                    {t("capacity.overCapacity", "Over Capacity")}
                </Badge>
                <Badge variant="outline" className="bg-gray-200 text-gray-500 border-gray-300">
                    <CalendarOff className="h-3 w-3 mr-1" />
                    {t("capacity.holidayClosure", "Holiday/Closure")}
                </Badge>
            </div>

            <Card className="glass-card">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{t("capacity.workloadOverview", "Workload Overview")}</CardTitle>
                    <CardDescription>
                        {t("capacity.clickToManage", "Click on a cell to view and manage scheduled operations")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <TooltipProvider delayDuration={200}>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-2 text-left border-b min-w-[150px] sticky left-0 bg-background z-10">
                                        {t("capacity.cell", "Cell")}
                                    </th>
                                    {dates.map(date => {
                                        const dayInfo = getDayInfo(date);
                                        const isNonWorking = dayInfo.type !== 'working' && dayInfo.type !== 'half_day';
                                        return (
                                            <th
                                                key={date.toISOString()}
                                                className={`p-2 text-center border-b min-w-[80px] ${isNonWorking ? 'bg-gray-50' : ''}`}
                                            >
                                                <div className="text-xs text-muted-foreground">{format(date, "EEE")}</div>
                                                <div className="font-bold">{format(date, "d")}</div>
                                                {dayInfo.label && (
                                                    <div className="text-[10px] text-red-600 truncate max-w-[70px]">
                                                        {dayInfo.label}
                                                    </div>
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {cells?.map(cell => (
                                    <tr key={cell.id} className="border-b hover:bg-muted/50">
                                        <td className="p-3 font-medium sticky left-0 bg-background z-10 border-r">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: cell.color || '#ccc' }}
                                                />
                                                {cell.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground ml-5">
                                                {t("capacity.capacity", "Capacity")}: {cell.capacity_hours_per_day || 8}h/day
                                            </div>
                                        </td>
                                        {dates.map(date => {
                                            const dayInfo = getDayInfo(date);

                                            // Show skeleton while allocations are loading/refetching
                                            if (allocationsLoading) {
                                                return (
                                                    <td key={date.toISOString()} className="p-1 text-center border-r last:border-r-0">
                                                        <CellSkeleton />
                                                    </td>
                                                );
                                            }

                                            const { hours, percent, capacity } = getCellLoad(cell.id, date, cell);
                                            const allocations = getAllocationsForCellDate(cell.id, date);
                                            const opsOnDate = getOperationsForCellDate(cell.id, date);

                                            return (
                                                <CapacityCell
                                                    key={date.toISOString()}
                                                    cellId={cell.id}
                                                    cellName={cell.name}
                                                    date={date}
                                                    hours={hours}
                                                    percent={percent}
                                                    capacity={capacity}
                                                    dayInfo={dayInfo}
                                                    allocations={allocations}
                                                    operations={opsOnDate}
                                                    onClick={() => handleCellClick(cell, date)}
                                                />
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TooltipProvider>
                </CardContent>
            </Card>

            {/* Schedule Dialog */}
            <CellScheduleDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                cell={selectedCell}
                date={selectedDate}
                allocations={dialogAllocations}
                dayInfo={dialogDayInfo}
                capacity={dialogLoad.capacity}
                totalHours={dialogLoad.hours}
                onDateChange={handleDialogDateChange}
                startDate={startDate}
            />
        </div>
    );
}
