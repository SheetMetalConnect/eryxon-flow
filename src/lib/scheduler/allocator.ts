import { addDays, format, startOfDay } from 'date-fns';
import type { DayAllocation, Operation } from './types';
import { MAX_SCHEDULING_DAYS, DEFAULT_OPERATION_DURATION_MINUTES } from './types';
import type { CalendarService } from './calendar';
import type { CapacityTracker } from './capacity';

export interface AllocationResult {
  allocations: DayAllocation[];
  endDate: Date;
  remainingHours: number;
  complete: boolean;
}

export class OperationAllocator {
  constructor(
    private calendar: CalendarService,
    private capacity: CapacityTracker,
  ) {}

  findNextWorkingDay(startDate: Date): Date {
    let current = startOfDay(startDate);
    let attempts = 0;
    while (attempts < MAX_SCHEDULING_DAYS) {
      if (this.calendar.isWorkingDay(current)) return current;
      current = addDays(current, 1);
      attempts++;
    }
    return current;
  }

  getOperationDurationHours(op: Operation): number {
    const minutes = op.estimated_time > 0 ? op.estimated_time : DEFAULT_OPERATION_DURATION_MINUTES;
    return minutes / 60;
  }

  allocate(
    cellId: string,
    operationId: string,
    hoursNeeded: number,
    startDate: Date
  ): AllocationResult {
    const allocations: DayAllocation[] = [];
    let remaining = hoursNeeded;
    let current = this.findNextWorkingDay(startDate);
    let lastDate = current;
    let attempts = 0;

    while (remaining > 0 && attempts < MAX_SCHEDULING_DAYS) {
      if (!this.calendar.isWorkingDay(current)) {
        current = addDays(current, 1);
        attempts++;
        continue;
      }

      const available = this.capacity.getAvailableCapacity(cellId, current);
      if (available > 0) {
        const hours = Math.min(available, remaining);
        const dateStr = format(current, 'yyyy-MM-dd');
        allocations.push({ date: dateStr, hours_allocated: hours, cell_id: cellId, operation_id: operationId });
        remaining -= hours;
        lastDate = current;
      }

      current = addDays(current, 1);
      attempts++;
    }

    const remainingHours = Math.max(0, remaining);
    const complete = remainingHours === 0;
    if (complete) {
      for (const allocation of allocations) {
        this.capacity.addUsedHours(cellId, allocation.date, allocation.hours_allocated);
      }
    }

    return { allocations, endDate: lastDate, remainingHours, complete };
  }
}
