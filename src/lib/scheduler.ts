import { Database } from '@/integrations/supabase/types';
import { addMinutes, addDays, format, parseISO, isBefore, startOfDay } from 'date-fns';

type Job = Database['public']['Tables']['jobs']['Row'];
type Operation = Database['public']['Tables']['operations']['Row'];
type Cell = Database['public']['Tables']['cells']['Row'];

export interface ScheduledOperation extends Operation {
    planned_start: string | null;
    planned_end: string | null;
}

export class SchedulerService {
    private cells: Map<string, Cell>;
    private cellCapacity: Map<string, Map<string, number>>; // cellId -> date -> usedHours

    constructor(cells: Cell[]) {
        this.cells = new Map(cells.map(c => [c.id, c]));
        this.cellCapacity = new Map();
    }

    private getUsedHours(cellId: string, date: string): number {
        if (!this.cellCapacity.has(cellId)) {
            this.cellCapacity.set(cellId, new Map());
        }
        return this.cellCapacity.get(cellId)?.get(date) || 0;
    }

    private addUsedHours(cellId: string, date: string, hours: number) {
        if (!this.cellCapacity.has(cellId)) {
            this.cellCapacity.set(cellId, new Map());
        }
        const current = this.cellCapacity.get(cellId)?.get(date) || 0;
        this.cellCapacity.get(cellId)?.set(date, current + hours);
    }

    private findNextAvailableSlot(cellId: string, durationHours: number, startDate: Date): Date {
        let currentDate = startOfDay(startDate);
        const cell = this.cells.get(cellId);
        const dailyCapacity = cell?.capacity_hours_per_day || 8; // Default to 8 hours if not set

        // Safety break to prevent infinite loops
        let attempts = 0;
        while (attempts < 365) { // Look ahead 1 year max
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const used = this.getUsedHours(cellId, dateStr);

            if (used + durationHours <= dailyCapacity) {
                return currentDate;
            }

            currentDate = addDays(currentDate, 1);
            attempts++;
        }

        return currentDate; // Fallback
    }

    public scheduleJobs(jobs: Job[], operations: Operation[]): ScheduledOperation[] {
        // Sort jobs by due date
        const sortedJobs = [...jobs].sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });

        const scheduledOps: ScheduledOperation[] = [];
        const jobOperations = new Map<string, Operation[]>();

        // Group operations by job
        operations.forEach(op => {
            // Assuming we can link operations to jobs via part_id -> job_id or similar
            // For this implementation, we'll assume operations are passed in a way we can group them
            // Since the DB schema links operations to parts, and parts to jobs:
            // We might need to look up the job for each operation.
            // For simplicity in this service, let's assume the caller groups them or we process sequentially.
        });

        // Actually, let's process job by job
        for (const job of sortedJobs) {
            // Find operations for this job (this is a bit inefficient, but works for now)
            // We need a way to link op -> part -> job. 
            // Let's assume the 'operations' array passed in contains all ops for these jobs.

            // Filter operations for this job (indirectly via part)
            // This requires fetching parts too, which we don't have in the signature.
            // Let's update the signature to accept a flat list of "JobWithOperations" or similar.
        }

        return scheduledOps;
    }

    // Simplified single-pass scheduling for a list of operations that are already sorted/grouped
    public scheduleOperations(operations: Operation[], startDate: Date = new Date()): ScheduledOperation[] {
        const scheduled: ScheduledOperation[] = [];
        let jobStartDate = startDate;

        for (const op of operations) {
            // Calculate total duration in hours
            // duration = (setup + (run * quantity) + wait + changeover) / 60
            // We need quantity from somewhere. Operation doesn't have it directly, it's on the Part or OperationQuantity.
            // For now, we'll use 'estimated_time' as the total duration in minutes if available.

            const durationMinutes = op.estimated_time || 60; // Default 1 hour
            const durationHours = durationMinutes / 60;

            // Find slot
            const cellId = op.cell_id;
            // If it's a new job sequence, reset start date (or use previous op's end date)
            // This logic depends heavily on the sequence of operations passed in.

            const availableDate = this.findNextAvailableSlot(cellId, durationHours, jobStartDate);
            const dateStr = format(availableDate, 'yyyy-MM-dd');

            this.addUsedHours(cellId, dateStr, durationHours);

            // Set start/end
            // We are simplifying to day-level granularity for the "Capacity Matrix"
            // So planned_start is just the date.

            scheduled.push({
                ...op,
                planned_start: availableDate.toISOString(),
                planned_end: availableDate.toISOString() // Same day for simplicity
            });

            // Next op starts after this one (simplified)
            jobStartDate = availableDate;
        }

        return scheduled;
    }
}
