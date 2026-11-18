import { getDay, format } from 'date-fns';
import type { CalendarDay } from './types';

export class CalendarService {
  private calendar: Map<string, CalendarDay>;
  private workingDaysMask: number;

  constructor(calendarDays: CalendarDay[] = [], workingDaysMask: number = 31) {
    this.calendar = new Map(calendarDays.map(d => [d.date, d]));
    this.workingDaysMask = workingDaysMask;
  }

  isDefaultWorkingDay(date: Date): boolean {
    const jsDay = getDay(date);
    const maskBits = [64, 1, 2, 4, 8, 16, 32];
    return (this.workingDaysMask & maskBits[jsDay]) !== 0;
  }

  isWorkingDay(date: Date): boolean {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = this.calendar.get(dateStr);
    if (entry) {
      return entry.day_type === 'working' || entry.day_type === 'half_day';
    }
    return this.isDefaultWorkingDay(date);
  }

  getCalendarEntry(dateStr: string): CalendarDay | undefined {
    return this.calendar.get(dateStr);
  }
}
