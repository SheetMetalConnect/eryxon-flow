import { Database } from '@/integrations/supabase/types';
import { addDays, format, startOfDay, getDay } from 'date-fns';

type Job = Database['public']['Tables']['jobs']['Row'];
type Operation = Database['public']['Tables']['operations']['Row'];
type Cell = Database['public']['Tables']['cells']['Row'];

export interface CalendarDay {
    date: string;
    day_type: 'working' | 'holiday' | 'closure' | 'half_day';
    capacity_multiplier: number;
}

export interface DayAllocation {
    date: string;
    hours_allocated: number;
    cell_id: string;
    operation_id: string;
}

export interface ScheduledOperation extends Operation {
    planned_start: string | null;
    planned_end: string | null;
    day_allocations: DayAllocation[];
}

export interface SchedulerConfig {
    workingDaysMask?: number; // Bitmask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
    factoryOpeningTime?: string;
    factoryClosingTime?: string;
}

export class SchedulerService {
    private cells: Map<string, Cell>;
    private cellCapacity: Map<string, Map<string, number>>; // cellId -> date -> usedHours
    private calendar: Map<string, CalendarDay>; // date -> calendar entry
    private workingDaysMask: number;
    private defaultFactoryHours: number;

    constructor(
        cells: Cell[],
        calendarDays: CalendarDay[] = [],
        config: SchedulerConfig = {}
    ) {
        this.cells = new Map(cells.map(c => [c.id, c]));
        this.cellCapacity = new Map();
        this.calendar = new Map(calendarDays.map(d => [d.date, d]));
        this.workingDaysMask = config.workingDaysMask ?? 31; // Default Mon-Fri

        // Calculate default factory hours from opening/closing time
        const opening = config.factoryOpeningTime ?? '07:00';
        const closing = config.factoryClosingTime ?? '17:00';
        const [openH, openM] = opening.split(':').map(Number);
        const [closeH, closeM] = closing.split(':').map(Number);
        this.defaultFactoryHours = (closeH + closeM / 60) - (openH + openM / 60);
    }

    /**
     * Check if a date is a working day based on the working days mask
     */
    private isDefaultWorkingDay(date: Date): boolean {
        // JavaScript: 0=Sunday, 1=Monday, ..., 6=Saturday
        // Our mask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
        const jsDay = getDay(date);
        const maskBits = [64, 1, 2, 4, 8, 16, 32]; // Map JS day to our mask bits
        return (this.workingDaysMask & maskBits[jsDay]) !== 0;
    }

    /**
     * Check if a specific date is a working day (considering calendar overrides)
     */
    public isWorkingDay(date: Date): boolean {
        const dateStr = format(date, 'yyyy-MM-dd');
        const calendarEntry = this.calendar.get(dateStr);

        if (calendarEntry) {
            // Calendar override exists
            return calendarEntry.day_type === 'working' || calendarEntry.day_type === 'half_day';
        }

        // Use default working days mask
        return this.isDefaultWorkingDay(date);
    }

    /**
     * Get the effective capacity for a cell on a specific date
     */
    public getCellCapacityForDay(cellId: string, date: Date): number {
        const cell = this.cells.get(cellId);
        const baseCap = cell?.capacity_hours_per_day ?? 8;

        const dateStr = format(date, 'yyyy-MM-dd');
        const calendarEntry = this.calendar.get(dateStr);

        if (calendarEntry) {
            return baseCap * calendarEntry.capacity_multiplier;
        }

        // Check default working day
        if (!this.isDefaultWorkingDay(date)) {
            return 0; // Weekend or non-working day
        }

        return baseCap;
    }

    /**
     * Get used hours for a cell on a specific date
     */
    private getUsedHours(cellId: string, date: string): number {
        if (!this.cellCapacity.has(cellId)) {
            this.cellCapacity.set(cellId, new Map());
        }
        return this.cellCapacity.get(cellId)?.get(date) || 0;
    }

    /**
     * Add used hours for a cell on a specific date
     */
    private addUsedHours(cellId: string, date: string, hours: number) {
        if (!this.cellCapacity.has(cellId)) {
            this.cellCapacity.set(cellId, new Map());
        }
        const current = this.cellCapacity.get(cellId)?.get(date) || 0;
        this.cellCapacity.get(cellId)?.set(date, current + hours);
    }

    /**
     * Get available capacity for a cell on a specific date
     */
    public getAvailableCapacity(cellId: string, date: Date): number {
        const totalCapacity = this.getCellCapacityForDay(cellId, date);
        const dateStr = format(date, 'yyyy-MM-dd');
        const usedHours = this.getUsedHours(cellId, dateStr);
        return Math.max(0, totalCapacity - usedHours);
    }

    /**
     * Find the next working day from a given date
     */
    private findNextWorkingDay(startDate: Date, maxDays: number = 365): Date {
        let currentDate = startOfDay(startDate);
        let attempts = 0;

        while (attempts < maxDays) {
            if (this.isWorkingDay(currentDate)) {
                return currentDate;
            }
            currentDate = addDays(currentDate, 1);
            attempts++;
        }

        // Fallback - return the last date checked
        return currentDate;
    }

    /**
     * Allocate an operation across multiple days with overflow
     * Returns the day allocations and the end date
     */
    private allocateOperation(
        cellId: string,
        operationId: string,
        hoursNeeded: number,
        startDate: Date
    ): { allocations: DayAllocation[]; endDate: Date } {
        const allocations: DayAllocation[] = [];
        let remainingHours = hoursNeeded;
        let currentDate = this.findNextWorkingDay(startDate);
        let lastAllocationDate = currentDate;
        let attempts = 0;

        while (remainingHours > 0 && attempts < 365) {
            // Skip non-working days
            if (!this.isWorkingDay(currentDate)) {
                currentDate = addDays(currentDate, 1);
                attempts++;
                continue;
            }

            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const available = this.getAvailableCapacity(cellId, currentDate);

            if (available > 0) {
                const hoursToAllocate = Math.min(available, remainingHours);

                allocations.push({
                    date: dateStr,
                    hours_allocated: hoursToAllocate,
                    cell_id: cellId,
                    operation_id: operationId,
                });

                this.addUsedHours(cellId, dateStr, hoursToAllocate);
                remainingHours -= hoursToAllocate;
                lastAllocationDate = currentDate;
            }

            currentDate = addDays(currentDate, 1);
            attempts++;
        }

        return {
            allocations,
            endDate: lastAllocationDate,
        };
    }

    /**
     * Schedule a list of operations with overflow support
     * Operations overflow to subsequent working days if they don't fit in one day
     */
    public scheduleOperations(
        operations: Operation[],
        startDate: Date = new Date()
    ): ScheduledOperation[] {
        const scheduled: ScheduledOperation[] = [];
        let currentStartDate = this.findNextWorkingDay(startDate);

        for (const op of operations) {
            // Calculate total duration in hours from estimated_time (in minutes)
            const durationMinutes = op.estimated_time || 60; // Default 1 hour
            const durationHours = durationMinutes / 60;

            const cellId = op.cell_id;
            if (!cellId) {
                // Operation has no cell assigned - skip scheduling
                scheduled.push({
                    ...op,
                    planned_start: null,
                    planned_end: null,
                    day_allocations: [],
                });
                continue;
            }

            // Allocate this operation across days
            const { allocations, endDate } = this.allocateOperation(
                cellId,
                op.id,
                durationHours,
                currentStartDate
            );

            if (allocations.length > 0) {
                const plannedStart = allocations[0].date + 'T00:00:00.000Z';
                const plannedEnd = format(endDate, 'yyyy-MM-dd') + 'T23:59:59.999Z';

                scheduled.push({
                    ...op,
                    planned_start: plannedStart,
                    planned_end: plannedEnd,
                    day_allocations: allocations,
                });

                // Next operation starts the day after this one ends (for same cell)
                // But for different cells, it can start from currentStartDate
                // For simplicity, we'll advance the start date to the next working day after end
                currentStartDate = this.findNextWorkingDay(addDays(endDate, 1));
            } else {
                // Could not allocate - no capacity found
                scheduled.push({
                    ...op,
                    planned_start: null,
                    planned_end: null,
                    day_allocations: [],
                });
            }
        }

        return scheduled;
    }

    /**
     * Schedule operations grouped by job
     * Operations within the same job are scheduled sequentially
     */
    public scheduleJobs(
        jobs: Job[],
        operationsByJob: Map<string, Operation[]>,
        startDate: Date = new Date()
    ): ScheduledOperation[] {
        // Sort jobs by due date
        const sortedJobs = [...jobs].sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });

        const allScheduled: ScheduledOperation[] = [];
        let globalStartDate = this.findNextWorkingDay(startDate);

        for (const job of sortedJobs) {
            const jobOps = operationsByJob.get(job.id) || [];
            if (jobOps.length === 0) continue;

            // Schedule all operations for this job
            // Each operation in a job should start after the previous one completes
            let jobCurrentDate = globalStartDate;

            for (const op of jobOps) {
                const durationMinutes = op.estimated_time || 60;
                const durationHours = durationMinutes / 60;

                const cellId = op.cell_id;
                if (!cellId) {
                    allScheduled.push({
                        ...op,
                        planned_start: null,
                        planned_end: null,
                        day_allocations: [],
                    });
                    continue;
                }

                const { allocations, endDate } = this.allocateOperation(
                    cellId,
                    op.id,
                    durationHours,
                    jobCurrentDate
                );

                if (allocations.length > 0) {
                    const plannedStart = allocations[0].date + 'T00:00:00.000Z';
                    const plannedEnd = format(endDate, 'yyyy-MM-dd') + 'T23:59:59.999Z';

                    allScheduled.push({
                        ...op,
                        planned_start: plannedStart,
                        planned_end: plannedEnd,
                        day_allocations: allocations,
                    });

                    // Next operation in this job starts after this one
                    jobCurrentDate = this.findNextWorkingDay(addDays(endDate, 1));
                } else {
                    allScheduled.push({
                        ...op,
                        planned_start: null,
                        planned_end: null,
                        day_allocations: [],
                    });
                }
            }
        }

        return allScheduled;
    }

    /**
     * Get capacity summary for a date range
     */
    public getCapacitySummary(
        startDate: Date,
        endDate: Date,
        cellId?: string
    ): Map<string, { total: number; used: number; available: number }> {
        const summary = new Map<string, { total: number; used: number; available: number }>();
        let currentDate = startDate;

        while (currentDate <= endDate) {
            if (this.isWorkingDay(currentDate)) {
                const dateStr = format(currentDate, 'yyyy-MM-dd');

                if (cellId) {
                    // Single cell
                    const total = this.getCellCapacityForDay(cellId, currentDate);
                    const used = this.getUsedHours(cellId, dateStr);
                    summary.set(dateStr, {
                        total,
                        used,
                        available: Math.max(0, total - used),
                    });
                } else {
                    // All cells combined
                    let totalSum = 0;
                    let usedSum = 0;

                    for (const [cId] of this.cells) {
                        totalSum += this.getCellCapacityForDay(cId, currentDate);
                        usedSum += this.getUsedHours(cId, dateStr);
                    }

                    summary.set(dateStr, {
                        total: totalSum,
                        used: usedSum,
                        available: Math.max(0, totalSum - usedSum),
                    });
                }
            }

            currentDate = addDays(currentDate, 1);
        }

        return summary;
    }
}
