import { describe, it, expect } from 'vitest';
import { CalendarService } from './calendar';

describe('CalendarService', () => {
  it('treats Mon-Fri as working days by default', () => {
    const cal = new CalendarService();
    expect(cal.isWorkingDay(new Date('2026-03-30'))).toBe(true); // Monday
    expect(cal.isWorkingDay(new Date('2026-03-29'))).toBe(false); // Sunday
  });

  it('respects calendar overrides', () => {
    const cal = new CalendarService([
      { date: '2026-03-30', day_type: 'holiday', capacity_multiplier: 0 },
    ]);
    expect(cal.isWorkingDay(new Date('2026-03-30'))).toBe(false);
  });

  it('treats half_day as working', () => {
    const cal = new CalendarService([
      { date: '2026-03-30', day_type: 'half_day', capacity_multiplier: 0.5 },
    ]);
    expect(cal.isWorkingDay(new Date('2026-03-30'))).toBe(true);
  });
});
