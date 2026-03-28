import { addDays, format } from 'date-fns';
import type { Job, Operation, Cell, ScheduledOperation, SchedulerConfig, CalendarDay } from './types';
import { CalendarService } from './calendar';
import { CapacityTracker } from './capacity';
import { OperationAllocator } from './allocator';

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

  scheduleJobs(jobs: Job[], operationsByJob: Map<string, Operation[]>, startDate = new Date()): ScheduledOperation[] {
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

      let jobCurrentDate = globalStart;
      for (const op of jobOps) {
        const hours = this.allocator.getOperationDurationHours(op);
        const cellId = op.cell_id;
        if (!cellId) {
          allScheduled.push({ ...op, planned_start: null, planned_end: null, day_allocations: [] });
          continue;
        }
        const { allocations, endDate } = this.allocator.allocate(cellId, op.id, hours, jobCurrentDate);
        if (allocations.length > 0) {
          allScheduled.push({
            ...op,
            planned_start: allocations[0].date + 'T00:00:00.000Z',
            planned_end: format(endDate, 'yyyy-MM-dd') + 'T23:59:59.999Z',
            day_allocations: allocations,
          });
          jobCurrentDate = this.allocator.findNextWorkingDay(addDays(endDate, 1));
        } else {
          allScheduled.push({ ...op, planned_start: null, planned_end: null, day_allocations: [] });
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
