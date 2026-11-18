import { addDays, format } from 'date-fns';
import type { Job, Operation, Cell, Part, DayAllocation, ScheduledOperation, SchedulerConfig, CalendarDay, ScheduleJobsOptions } from './types';
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

  releaseAllocations(allocations: DayAllocation[]): void {
    for (const allocation of allocations) {
      this.capacity.removeUsedHours(
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
        scheduled.push({
          ...op,
          planned_start: null,
          planned_end: null,
          day_allocations: [],
          scheduling_status: 'unscheduled',
          scheduling_failure_reason: 'missing_cell',
          remaining_hours: hours,
        });
        continue;
      }
      const result = this.allocator.allocate(cellId, op.id, hours, currentStart);
      if (result.complete) {
        scheduled.push({
          ...op,
          planned_start: result.allocations[0].date + 'T00:00:00.000Z',
          planned_end: format(result.endDate, 'yyyy-MM-dd') + 'T23:59:59.999Z',
          day_allocations: result.allocations,
          scheduling_status: 'scheduled',
          scheduling_failure_reason: null,
          remaining_hours: 0,
        });
        currentStart = this.allocator.findNextWorkingDay(addDays(result.endDate, 1));
      } else {
        scheduled.push({
          ...op,
          planned_start: null,
          planned_end: null,
          day_allocations: [],
          scheduling_status: 'unscheduled',
          scheduling_failure_reason: 'insufficient_capacity',
          remaining_hours: result.remainingHours,
        });
      }
    }
    return scheduled;
  }

  scheduleJobs(
    jobs: Job[],
    operationsByJob: Map<string, Operation[]>,
    startDate = new Date(),
    options: ScheduleJobsOptions = {},
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

      for (const route of operationsByPart.values()) {
        route.sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
        let routeCurrentDate = globalStart;
        let routeBlocked = false;

        for (const op of route) {
          const hours = this.allocator.getOperationDurationHours(op);
          const cellId = op.cell_id;
          const constraint = options.constraintsByOperation?.get(op.id);
          const existingAllocations = options.existingAllocationsByOperation?.get(op.id) ?? [];

          if (routeBlocked || constraint?.blockedByPredecessor) {
            allScheduled.push({
              ...op,
              planned_start: null,
              planned_end: null,
              day_allocations: [],
              scheduling_status: 'unscheduled',
              scheduling_failure_reason: 'blocked_by_predecessor',
              remaining_hours: hours,
            });
            routeBlocked = true;
            continue;
          }

          if (constraint?.earliestStart) {
            const constrainedStart = this.allocator.findNextWorkingDay(constraint.earliestStart);
            if (constrainedStart > routeCurrentDate) routeCurrentDate = constrainedStart;
          }

          if (!cellId) {
            allScheduled.push({
              ...op,
              planned_start: null,
              planned_end: null,
              day_allocations: [],
              scheduling_status: 'unscheduled',
              scheduling_failure_reason: 'missing_cell',
              remaining_hours: hours,
            });
            routeBlocked = true;
            continue;
          }

          this.releaseAllocations(existingAllocations);
          const result = this.allocator.allocate(cellId, op.id, hours, routeCurrentDate);
          if (result.complete) {
            allScheduled.push({
              ...op,
              planned_start: result.allocations[0].date + 'T00:00:00.000Z',
              planned_end: format(result.endDate, 'yyyy-MM-dd') + 'T23:59:59.999Z',
              day_allocations: result.allocations,
              scheduling_status: 'scheduled',
              scheduling_failure_reason: null,
              remaining_hours: 0,
            });
            routeCurrentDate = this.allocator.findNextWorkingDay(addDays(result.endDate, 1));
          } else {
            this.reserveAllocations(existingAllocations);
            allScheduled.push({
              ...op,
              planned_start: null,
              planned_end: null,
              day_allocations: [],
              scheduling_status: 'unscheduled',
              scheduling_failure_reason: 'insufficient_capacity',
              remaining_hours: result.remainingHours,
            });
            routeBlocked = true;
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
