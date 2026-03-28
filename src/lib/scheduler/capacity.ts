import { format } from 'date-fns';
import type { Cell } from './types';
import type { CalendarService } from './calendar';

export class CapacityTracker {
  private cells: Map<string, Cell>;
  private used: Map<string, Map<string, number>>;
  private cache: Map<string, number>;
  private calendar: CalendarService;

  constructor(cells: Cell[], calendar: CalendarService) {
    this.cells = new Map(cells.map(c => [c.id, c]));
    this.used = new Map();
    this.cache = new Map();
    this.calendar = calendar;
  }

  getCellCapacityForDay(cellId: string, date: Date): number {
    const dateStr = format(date, 'yyyy-MM-dd');
    const cacheKey = `${cellId}:${dateStr}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const cell = this.cells.get(cellId);
    const baseCap = cell?.capacity_hours_per_day ?? 8;
    const entry = this.calendar.getCalendarEntry(dateStr);

    let capacity: number;
    if (entry) {
      capacity = baseCap * entry.capacity_multiplier;
    } else if (!this.calendar.isDefaultWorkingDay(date)) {
      capacity = 0;
    } else {
      capacity = baseCap;
    }

    this.cache.set(cacheKey, capacity);
    return capacity;
  }

  getUsedHours(cellId: string, dateStr: string): number {
    return this.used.get(cellId)?.get(dateStr) ?? 0;
  }

  addUsedHours(cellId: string, dateStr: string, hours: number): void {
    if (!this.used.has(cellId)) this.used.set(cellId, new Map());
    const current = this.used.get(cellId)!.get(dateStr) ?? 0;
    this.used.get(cellId)!.set(dateStr, current + hours);
  }

  getAvailableCapacity(cellId: string, date: Date): number {
    const total = this.getCellCapacityForDay(cellId, date);
    const dateStr = format(date, 'yyyy-MM-dd');
    return Math.max(0, total - this.getUsedHours(cellId, dateStr));
  }

  getCells(): Map<string, Cell> {
    return this.cells;
  }
}
