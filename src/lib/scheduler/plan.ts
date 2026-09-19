import type { Json } from '@/integrations/supabase/types';
import type { DayAllocation, ScheduledOperation } from './types';

interface ExistingAllocation extends Pick<DayAllocation, 'cell_id' | 'date' | 'hours_allocated'> {}

interface SchedulePlanPayload {
  operations: Json[];
  allocations: Json[];
}

function parseTime(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new Error(`Invalid factory time: ${value}`);
  }
  return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}:00`;
}

export function buildSchedulePlanPayload(
  scheduledOperations: ScheduledOperation[],
  existingAllocations: ExistingAllocation[],
  openingTime: string,
  closingTime: string,
): SchedulePlanPayload {
  const openingMinutes = parseTime(openingTime);
  const closingMinutes = parseTime(closingTime);
  const usedByCellDay = new Map<string, number>();

  for (const allocation of existingAllocations) {
    const key = `${allocation.cell_id}:${allocation.date}`;
    usedByCellDay.set(key, (usedByCellDay.get(key) ?? 0) + allocation.hours_allocated);
  }

  const operations: Json[] = [];
  const allocations: Json[] = [];

  for (const operation of scheduledOperations) {
    if (operation.scheduling_status !== 'scheduled') continue;
    if (!operation.planned_start || !operation.planned_end || !operation.updated_at) {
      throw new Error(`Scheduled operation ${operation.id} is missing plan metadata`);
    }

    operations.push({
      id: operation.id,
      planned_start: operation.planned_start,
      planned_end: operation.planned_end,
      expected_updated_at: operation.updated_at,
    });

    for (const allocation of operation.day_allocations) {
      const key = `${allocation.cell_id}:${allocation.date}`;
      const usedHours = usedByCellDay.get(key) ?? 0;
      const startMinutes = openingMinutes + usedHours * 60;
      const endMinutes = startMinutes + allocation.hours_allocated * 60;
      if (endMinutes > closingMinutes) {
        throw new Error(`Cell capacity exceeds factory hours on ${allocation.date}`);
      }

      allocations.push({
        operation_id: allocation.operation_id,
        cell_id: allocation.cell_id,
        date: allocation.date,
        hours_allocated: allocation.hours_allocated,
        start_time: formatTime(startMinutes),
        end_time: formatTime(endMinutes),
      });
      usedByCellDay.set(key, usedHours + allocation.hours_allocated);
    }
  }

  return { operations, allocations };
}
