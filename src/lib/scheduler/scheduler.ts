import { addDays, format } from 'date-fns';
import type { Job, Operation, Cell, Part, DayAllocation, ScheduledOperation, SchedulerConfig, CalendarDay } from './types';
import { CalendarService } from './calendar';
import { CapacityTracker } from './capacity';
import { OperationAllocator } from './allocator';

export function groupOperationsByJob(
  operations: Operation[],
  parts: Array<Pick<Part, 'id' | 'job_id'>>,
): Map<string, Operation[]> {
  const jobIdByPartId = new Map(parts.map((part) => [part.id, part.job_id]));
  const grouped = new Map<string, Operation[]>();

  for (const operation of operations) {
    const jobId = jobIdByPartId.get(operation.part_id);
    if (!jobId) continue;
    const jobOperations = grouped.get(jobId) ?? [];
    jobOperations.push(operation);
    grouped.set(jobId, jobOperations);
  }

  for (const jobOperations of grouped.values()) {
    jobOperations.sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
  }

  return grouped;
}

export class SchedulerService {
  private calendar: CalendarService;
  private capacity: CapacityTracker;
  private allocator: OperationAllocator;

  constructor(cells: Cell[], calendarDays: CalendarDay[] = [], config: SchedulerConfig = {}) {
    this.calendar = new CalendarService(calendarDays, config.workingDaysMask ?? 31);
    this.capacity = new CapacityTracker(cells, this.calendar);
    this.allocator = new OperationAllocator(this.calendar, this.capacity);
  }

  isWorkingDay(date: Date) { return this.calendar.isWorkingDay(date); }
  getCellCapacityForDay(cellId: string, date: Date) { return this.capacity.getCellCapacityForDay(cellId, date); }
  getAvailableCapacity(cellId: string, date: Date) { return this.capacity.getAvailableCapacity(cellId, date); }

  reserveAllocations(allocations: DayAllocation[]): void {
    for (const allocation of allocations) {
      this.capacity.addUsedHours(
        allocation.cell_id,
        allocation.date,
        allocation.hours_allocated,
      );
    }
  }

  scheduleOperations(operations: Operation[], startDate = new Date()): ScheduledOperation[] {
    const scheduled: ScheduledOperation[] = [];
    let currentStart = this.allocator.findNextWorkingDay(startDate);

    for (const op of operations) {
      const hours = this.allocator.getOperationDurationHours(op);
      const cellId = op.cell_id;
      if (!cellId) {
        scheduled.push({ ...op, planned_start: null, planned_end: null, day_allocations: [] });
        continue;
      }
      const { allocations, endDate } = this.allocator.allocate(cellId, op.id, hours, currentStart);
      if (allocations.length > 0) {
        scheduled.push({
          ...op,
          planned_start: allocations[0].date + 'T00:00:00.000Z',
          planned_end: format(endDate, 'yyyy-MM-dd') + 'T23:59:59.999Z',
          day_allocations: allocations,
        });
        currentStart = this.allocator.findNextWorkingDay(addDays(endDate, 1));
      } else {
        scheduled.push({ ...op, planned_start: null, planned_end: null, day_allocations: [] });
      }
    }
    return scheduled;
  }

  scheduleJobs(
    jobs: Job[],
    operationsByJob: Map<string, Operation[]>,
    startDate = new Date(),
    earliestStartByPart: Map<string, Date> = new Map(),
  ): ScheduledOperation[] {
    const sortedJobs = [...jobs].sort((a, b) => {
      const dateA = a.due_date_override || a.due_date;
      const dateB = b.due_date_override || b.due_date;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    const allScheduled: ScheduledOperation[] = [];
    const globalStart = this.allocator.findNextWorkingDay(startDate);

    for (const job of sortedJobs) {
      const jobOps = operationsByJob.get(job.id) || [];
      if (jobOps.length === 0) continue;

      const operationsByPart = new Map<string, Operation[]>();
      for (const operation of jobOps) {
        const route = operationsByPart.get(operation.part_id) ?? [];
        route.push(operation);
        operationsByPart.set(operation.part_id, route);
      }

      for (const [partId, route] of operationsByPart) {
        route.sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
        let routeCurrentDate = this.allocator.findNextWorkingDay(
          earliestStartByPart.get(partId) ?? globalStart,
        );

        for (const op of route) {
          const hours = this.allocator.getOperationDurationHours(op);
          const cellId = op.cell_id;
          if (!cellId) {
            allScheduled.push({ ...op, planned_start: null, planned_end: null, day_allocations: [] });
            continue;
          }
          const { allocations, endDate } = this.allocator.allocate(cellId, op.id, hours, routeCurrentDate);
          if (allocations.length > 0) {
            allScheduled.push({
              ...op,
              planned_start: allocations[0].date + 'T00:00:00.000Z',
              planned_end: format(endDate, 'yyyy-MM-dd') + 'T23:59:59.999Z',
              day_allocations: allocations,
            });
            routeCurrentDate = this.allocator.findNextWorkingDay(addDays(endDate, 1));
          } else {
            allScheduled.push({ ...op, planned_start: null, planned_end: null, day_allocations: [] });
          }
        }
      }
    }
    return allScheduled;
  }

  getCapacitySummary(startDate: Date, endDate: Date, cellId?: string) {
    const summary = new Map<string, { total: number; used: number; available: number }>();
    let current = startDate;
    while (current <= endDate) {
      if (this.calendar.isWorkingDay(current)) {
        const dateStr = format(current, 'yyyy-MM-dd');
        if (cellId) {
          const total = this.capacity.getCellCapacityForDay(cellId, current);
          const used = this.capacity.getUsedHours(cellId, dateStr);
          summary.set(dateStr, { total, used, available: Math.max(0, total - used) });
        } else {
          let totalSum = 0, usedSum = 0;
          for (const [cId] of this.capacity.getCells()) {
            totalSum += this.capacity.getCellCapacityForDay(cId, current);
            usedSum += this.capacity.getUsedHours(cId, dateStr);
          }
          summary.set(dateStr, { total: totalSum, used: usedSum, available: Math.max(0, totalSum - usedSum) });
        }
      }
      current = addDays(current, 1);
    }
    return summary;
  }
}
