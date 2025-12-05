import { describe, it, expect, beforeEach } from 'vitest';
import { SchedulerService, CalendarDay, SchedulerConfig } from './scheduler';
import { addDays, format, startOfDay } from 'date-fns';

// Mock cell data
const createMockCells = () => [
  {
    id: 'cell-1',
    tenant_id: 'tenant-1',
    name: 'Assembly',
    sequence: 0,
    active: true,
    capacity_hours_per_day: 8,
    color: '#3b82f6',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    description: 'Assembly cell',
    enforce_wip_limit: false,
    show_capacity_warning: true,
    wip_limit: 10,
    wip_warning_threshold: 8,
    deleted_at: null,
    deleted_by: null,
    external_id: null,
    external_source: null,
    synced_at: null,
    icon_name: null,
    image_url: null,
  },
  {
    id: 'cell-2',
    tenant_id: 'tenant-1',
    name: 'Welding',
    sequence: 1,
    active: true,
    capacity_hours_per_day: 6,
    color: '#ef4444',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    description: 'Welding cell',
    enforce_wip_limit: true,
    show_capacity_warning: true,
    wip_limit: 5,
    wip_warning_threshold: 4,
    deleted_at: null,
    deleted_by: null,
    external_id: null,
    external_source: null,
    synced_at: null,
    icon_name: null,
    image_url: null,
  },
];

// Mock operation data factory
const createMockOperation = (overrides: Partial<{
  id: string;
  cell_id: string | null;
  estimated_time: number | null;
  sequence: number;
}> = {}) => ({
  id: overrides.id ?? 'op-1',
  tenant_id: 'tenant-1',
  part_id: 'part-1',
  cell_id: 'cell_id' in overrides ? overrides.cell_id : 'cell-1',
  operation_name: 'Test Operation',
  sequence: overrides.sequence ?? 10,
  estimated_time: 'estimated_time' in overrides ? overrides.estimated_time : 60,
  actual_time: 0,
  status: 'not_started' as const,
  assigned_operator_id: null,
  completed_at: null,
  notes: null,
  metadata: null,
  planned_start: null,
  planned_end: null,
  completion_percentage: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  deleted_at: null,
  deleted_by: null,
  external_id: null,
  external_source: null,
  synced_at: null,
  setup_time: 0,
  run_time_per_unit: 0,
  wait_time: 0,
  changeover_time: 0,
  icon_name: null,
  search_vector: null,
});

// Mock job data factory
const createMockJob = (overrides: Partial<{
  id: string;
  due_date: string | null;
  customer: string;
  job_number: string;
}> = {}) => ({
  id: overrides.id ?? 'job-1',
  tenant_id: 'tenant-1',
  job_number: overrides.job_number ?? 'JOB-001',
  customer: overrides.customer ?? 'Customer A',
  due_date: 'due_date' in overrides ? overrides.due_date : '2025-01-15T00:00:00Z',
  due_date_override: null,
  status: 'not_started' as const,
  notes: null,
  metadata: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  current_cell_id: null,
  deleted_at: null,
  deleted_by: null,
  external_id: null,
  external_source: null,
  synced_at: null,
  sync_hash: null,
  delivery_address: null,
  delivery_city: null,
  delivery_country: null,
  delivery_lat: null,
  delivery_lng: null,
  delivery_postal_code: null,
  package_count: null,
  total_volume_m3: null,
  total_weight_kg: null,
  search_vector: null,
});

describe('SchedulerService', () => {
  let scheduler: SchedulerService;
  const cells = createMockCells();

  beforeEach(() => {
    scheduler = new SchedulerService(cells);
  });

  describe('constructor', () => {
    it('initializes with default working days mask (Mon-Fri)', () => {
      const scheduler = new SchedulerService(cells);
      // Monday is a working day
      const monday = new Date('2025-01-06'); // This is a Monday
      expect(scheduler.isWorkingDay(monday)).toBe(true);
      // Saturday is not a working day with default mask
      const saturday = new Date('2025-01-04'); // This is a Saturday
      expect(scheduler.isWorkingDay(saturday)).toBe(false);
    });

    it('respects custom working days bitmask', () => {
      // Only Monday and Tuesday working (mask = 1 + 2 = 3)
      const customScheduler = new SchedulerService(cells, [], { workingDaysMask: 3 });
      const monday = new Date('2025-01-06'); // Monday
      const tuesday = new Date('2025-01-07'); // Tuesday
      const wednesday = new Date('2025-01-08'); // Wednesday

      expect(customScheduler.isWorkingDay(monday)).toBe(true);
      expect(customScheduler.isWorkingDay(tuesday)).toBe(true);
      expect(customScheduler.isWorkingDay(wednesday)).toBe(false);
    });

    it('calculates default factory hours from opening/closing time', () => {
      const config: SchedulerConfig = {
        factoryOpeningTime: '08:00',
        factoryClosingTime: '16:00',
      };
      const customScheduler = new SchedulerService(cells, [], config);
      // Should have 8 hours (16:00 - 08:00)
      expect(customScheduler).toBeDefined();
    });
  });

  describe('isWorkingDay', () => {
    it('returns true for Monday-Friday with default mask', () => {
      const monday = new Date('2025-01-06');
      const tuesday = new Date('2025-01-07');
      const wednesday = new Date('2025-01-08');
      const thursday = new Date('2025-01-09');
      const friday = new Date('2025-01-10');

      expect(scheduler.isWorkingDay(monday)).toBe(true);
      expect(scheduler.isWorkingDay(tuesday)).toBe(true);
      expect(scheduler.isWorkingDay(wednesday)).toBe(true);
      expect(scheduler.isWorkingDay(thursday)).toBe(true);
      expect(scheduler.isWorkingDay(friday)).toBe(true);
    });

    it('returns false for weekends with default mask', () => {
      const saturday = new Date('2025-01-04');
      const sunday = new Date('2025-01-05');

      expect(scheduler.isWorkingDay(saturday)).toBe(false);
      expect(scheduler.isWorkingDay(sunday)).toBe(false);
    });

    it('respects calendar holiday overrides', () => {
      const calendarDays: CalendarDay[] = [
        { date: '2025-01-06', day_type: 'holiday', capacity_multiplier: 0 },
      ];
      const holidayScheduler = new SchedulerService(cells, calendarDays);

      const holidayMonday = new Date('2025-01-06');
      expect(holidayScheduler.isWorkingDay(holidayMonday)).toBe(false);
    });

    it('treats half_day as a working day', () => {
      const calendarDays: CalendarDay[] = [
        { date: '2025-01-06', day_type: 'half_day', capacity_multiplier: 0.5 },
      ];
      const halfDayScheduler = new SchedulerService(cells, calendarDays);

      const halfDay = new Date('2025-01-06');
      expect(halfDayScheduler.isWorkingDay(halfDay)).toBe(true);
    });

    it('treats closure as non-working day', () => {
      const calendarDays: CalendarDay[] = [
        { date: '2025-01-06', day_type: 'closure', capacity_multiplier: 0 },
      ];
      const closureScheduler = new SchedulerService(cells, calendarDays);

      const closureDay = new Date('2025-01-06');
      expect(closureScheduler.isWorkingDay(closureDay)).toBe(false);
    });
  });

  describe('getCellCapacityForDay', () => {
    it('returns cell capacity for a normal working day', () => {
      const monday = new Date('2025-01-06');
      expect(scheduler.getCellCapacityForDay('cell-1', monday)).toBe(8);
      expect(scheduler.getCellCapacityForDay('cell-2', monday)).toBe(6);
    });

    it('returns zero for non-working days', () => {
      const saturday = new Date('2025-01-04');
      expect(scheduler.getCellCapacityForDay('cell-1', saturday)).toBe(0);
    });

    it('applies capacity multiplier from calendar', () => {
      const calendarDays: CalendarDay[] = [
        { date: '2025-01-06', day_type: 'half_day', capacity_multiplier: 0.5 },
      ];
      const halfDayScheduler = new SchedulerService(cells, calendarDays);

      const halfDay = new Date('2025-01-06');
      expect(halfDayScheduler.getCellCapacityForDay('cell-1', halfDay)).toBe(4); // 8 * 0.5
      expect(halfDayScheduler.getCellCapacityForDay('cell-2', halfDay)).toBe(3); // 6 * 0.5
    });

    it('returns zero for holidays', () => {
      const calendarDays: CalendarDay[] = [
        { date: '2025-01-06', day_type: 'holiday', capacity_multiplier: 0 },
      ];
      const holidayScheduler = new SchedulerService(cells, calendarDays);

      const holiday = new Date('2025-01-06');
      expect(holidayScheduler.getCellCapacityForDay('cell-1', holiday)).toBe(0);
    });

    it('returns default capacity for unknown cells', () => {
      const monday = new Date('2025-01-06');
      // Unknown cell should return 8 (default)
      expect(scheduler.getCellCapacityForDay('unknown-cell', monday)).toBe(8);
    });
  });

  describe('getAvailableCapacity', () => {
    it('returns full capacity when no operations scheduled', () => {
      const monday = new Date('2025-01-06');
      expect(scheduler.getAvailableCapacity('cell-1', monday)).toBe(8);
    });

    it('returns zero capacity on non-working days', () => {
      const saturday = new Date('2025-01-04');
      expect(scheduler.getAvailableCapacity('cell-1', saturday)).toBe(0);
    });
  });

  describe('scheduleOperations', () => {
    it('schedules a single operation that fits in one day', () => {
      const operation = createMockOperation({ estimated_time: 240 }); // 4 hours
      const monday = new Date('2025-01-06');

      const result = scheduler.scheduleOperations([operation], monday);

      expect(result).toHaveLength(1);
      expect(result[0].planned_start).toBeDefined();
      expect(result[0].planned_end).toBeDefined();
      expect(result[0].day_allocations).toHaveLength(1);
      expect(result[0].day_allocations[0].hours_allocated).toBe(4);
    });

    it('splits operation across multiple days when it exceeds capacity', () => {
      const operation = createMockOperation({ estimated_time: 960 }); // 16 hours
      const monday = new Date('2025-01-06');

      const result = scheduler.scheduleOperations([operation], monday);

      expect(result).toHaveLength(1);
      expect(result[0].day_allocations.length).toBeGreaterThan(1);

      // Sum of all allocations should equal 16 hours
      const totalAllocated = result[0].day_allocations.reduce(
        (sum, alloc) => sum + alloc.hours_allocated,
        0
      );
      expect(totalAllocated).toBe(16);
    });

    it('skips weekends when scheduling multi-day operations', () => {
      // Start on Friday with a 20-hour operation
      const operation = createMockOperation({ estimated_time: 1200 }); // 20 hours
      const friday = new Date('2025-01-10');

      const result = scheduler.scheduleOperations([operation], friday);

      expect(result).toHaveLength(1);

      // Check that no allocations are on Saturday (2025-01-11) or Sunday (2025-01-12)
      const allocatedDates = result[0].day_allocations.map((a) => a.date);
      expect(allocatedDates).not.toContain('2025-01-11');
      expect(allocatedDates).not.toContain('2025-01-12');
    });

    it('handles operations with no cell assignment', () => {
      const operation = createMockOperation({ cell_id: null });
      const monday = new Date('2025-01-06');

      const result = scheduler.scheduleOperations([operation], monday);

      expect(result).toHaveLength(1);
      expect(result[0].planned_start).toBeNull();
      expect(result[0].planned_end).toBeNull();
      expect(result[0].day_allocations).toHaveLength(0);
    });

    it('handles operations with zero or null estimated_time', () => {
      const operation = createMockOperation({ estimated_time: null });
      const monday = new Date('2025-01-06');

      const result = scheduler.scheduleOperations([operation], monday);

      expect(result).toHaveLength(1);
      // Should default to 1 hour (60 minutes)
      expect(result[0].day_allocations).toHaveLength(1);
      expect(result[0].day_allocations[0].hours_allocated).toBe(1);
    });

    it('schedules multiple operations sequentially', () => {
      const operations = [
        createMockOperation({ id: 'op-1', estimated_time: 480 }), // 8 hours
        createMockOperation({ id: 'op-2', estimated_time: 480 }), // 8 hours
      ];
      const monday = new Date('2025-01-06');

      const result = scheduler.scheduleOperations(operations, monday);

      expect(result).toHaveLength(2);

      // First operation should be on Monday
      expect(result[0].day_allocations[0].date).toBe('2025-01-06');

      // Second operation should be on Tuesday (next working day)
      expect(result[1].day_allocations[0].date).toBe('2025-01-07');
    });

    it('skips holidays when scheduling', () => {
      const calendarDays: CalendarDay[] = [
        { date: '2025-01-07', day_type: 'holiday', capacity_multiplier: 0 },
      ];
      const holidayScheduler = new SchedulerService(cells, calendarDays);

      const operations = [
        createMockOperation({ id: 'op-1', estimated_time: 480 }), // 8 hours
        createMockOperation({ id: 'op-2', estimated_time: 480 }), // 8 hours
      ];
      const monday = new Date('2025-01-06');

      const result = holidayScheduler.scheduleOperations(operations, monday);

      // First op on Monday, second op should skip Tuesday (holiday) to Wednesday
      expect(result[0].day_allocations[0].date).toBe('2025-01-06');
      expect(result[1].day_allocations[0].date).toBe('2025-01-08');
    });
  });

  describe('scheduleJobs', () => {
    it('sorts jobs by due date', () => {
      const jobs = [
        createMockJob({ id: 'job-1', job_number: 'JOB-001', customer: 'Customer A', due_date: '2025-02-01T00:00:00Z' }),
        createMockJob({ id: 'job-2', job_number: 'JOB-002', customer: 'Customer B', due_date: '2025-01-15T00:00:00Z' }),
      ];

      const operationsByJob = new Map([
        ['job-1', [createMockOperation({ id: 'op-job1' })]],
        ['job-2', [createMockOperation({ id: 'op-job2' })]],
      ]);

      const monday = new Date('2025-01-06');
      const result = scheduler.scheduleJobs(jobs, operationsByJob, monday);

      // Job 2 should be scheduled first (earlier due date)
      expect(result).toHaveLength(2);
    });

    it('handles jobs with no due date', () => {
      const jobs = [
        createMockJob({ id: 'job-1', due_date: null }),
      ];

      const operationsByJob = new Map([
        ['job-1', [createMockOperation()]],
      ]);

      const monday = new Date('2025-01-06');
      const result = scheduler.scheduleJobs(jobs, operationsByJob, monday);

      expect(result).toHaveLength(1);
    });

    it('skips jobs with no operations', () => {
      const jobs = [
        createMockJob({ id: 'job-1' }),
      ];

      const operationsByJob = new Map<string, any[]>(); // Empty map

      const monday = new Date('2025-01-06');
      const result = scheduler.scheduleJobs(jobs, operationsByJob, monday);

      expect(result).toHaveLength(0);
    });

    it('sequences operations within a job', () => {
      const jobs = [
        createMockJob({ id: 'job-1' }),
      ];

      const operationsByJob = new Map([
        ['job-1', [
          createMockOperation({ id: 'op-1', sequence: 10, estimated_time: 480 }),
          createMockOperation({ id: 'op-2', sequence: 20, estimated_time: 480 }),
        ]],
      ]);

      const monday = new Date('2025-01-06');
      const result = scheduler.scheduleJobs(jobs, operationsByJob, monday);

      expect(result).toHaveLength(2);
      // Second operation should start after first completes
      const firstOpEndDate = result[0].day_allocations[result[0].day_allocations.length - 1].date;
      const secondOpStartDate = result[1].day_allocations[0].date;

      expect(new Date(secondOpStartDate) >= new Date(firstOpEndDate)).toBe(true);
    });
  });

  describe('getCapacitySummary', () => {
    it('returns capacity summary for date range', () => {
      const startDate = new Date('2025-01-06'); // Monday
      const endDate = new Date('2025-01-10'); // Friday

      const summary = scheduler.getCapacitySummary(startDate, endDate);

      // Should have 5 entries (Mon-Fri)
      expect(summary.size).toBe(5);
    });

    it('returns capacity summary for specific cell', () => {
      const startDate = new Date('2025-01-06');
      const endDate = new Date('2025-01-06');

      const summary = scheduler.getCapacitySummary(startDate, endDate, 'cell-1');

      expect(summary.size).toBe(1);
      const daySummary = summary.get('2025-01-06');
      expect(daySummary?.total).toBe(8);
      expect(daySummary?.used).toBe(0);
      expect(daySummary?.available).toBe(8);
    });

    it('excludes non-working days from summary', () => {
      const startDate = new Date('2025-01-04'); // Saturday
      const endDate = new Date('2025-01-05'); // Sunday

      const summary = scheduler.getCapacitySummary(startDate, endDate);

      // Weekend days should not be in the summary
      expect(summary.size).toBe(0);
    });

    it('returns combined capacity for all cells', () => {
      const startDate = new Date('2025-01-06');
      const endDate = new Date('2025-01-06');

      const summary = scheduler.getCapacitySummary(startDate, endDate);
      const daySummary = summary.get('2025-01-06');

      // Total should be cell-1 (8) + cell-2 (6) = 14
      expect(daySummary?.total).toBe(14);
    });
  });
});

describe('SchedulerService - Edge Cases', () => {
  it('handles empty cells array', () => {
    const scheduler = new SchedulerService([]);
    const monday = new Date('2025-01-06');

    // Should not throw
    expect(() => scheduler.isWorkingDay(monday)).not.toThrow();
    expect(() => scheduler.getCapacitySummary(monday, monday)).not.toThrow();
  });

  it('handles very long operation (365+ days)', () => {
    const cells = createMockCells();
    const scheduler = new SchedulerService(cells);

    // 10000 hours = over a year of work for one cell
    const operation = createMockOperation({ estimated_time: 600000 }); // 10000 hours
    const monday = new Date('2025-01-06');

    const result = scheduler.scheduleOperations([operation], monday);

    expect(result).toHaveLength(1);
    // Should still produce allocations up to max attempts (365)
    expect(result[0].day_allocations.length).toBeGreaterThan(0);
  });

  it('handles start date on non-working day', () => {
    const cells = createMockCells();
    const scheduler = new SchedulerService(cells);

    const operation = createMockOperation({ estimated_time: 120 }); // 2 hours
    const saturday = new Date('2025-01-04');

    const result = scheduler.scheduleOperations([operation], saturday);

    expect(result).toHaveLength(1);
    // Should find next working day (Monday)
    expect(result[0].day_allocations[0].date).toBe('2025-01-06');
  });

  it('handles all days being holidays', () => {
    const cells = createMockCells();
    // Mark a week of holidays
    const calendarDays: CalendarDay[] = [];
    for (let i = 6; i <= 10; i++) {
      calendarDays.push({
        date: `2025-01-${i.toString().padStart(2, '0')}`,
        day_type: 'holiday',
        capacity_multiplier: 0,
      });
    }
    const holidayScheduler = new SchedulerService(cells, calendarDays);

    const operation = createMockOperation({ estimated_time: 120 });
    const monday = new Date('2025-01-06');

    const result = holidayScheduler.scheduleOperations([operation], monday);

    expect(result).toHaveLength(1);
    // Should find first working day after holidays
    const allocDate = result[0].day_allocations[0]?.date;
    if (allocDate) {
      expect(new Date(allocDate) > new Date('2025-01-10')).toBe(true);
    }
  });
});

describe('SchedulerService - Working Days Bitmask', () => {
  const cells = createMockCells();

  it('handles Sunday-only working (mask = 64)', () => {
    const scheduler = new SchedulerService(cells, [], { workingDaysMask: 64 });

    const sunday = new Date('2025-01-05');
    const monday = new Date('2025-01-06');

    expect(scheduler.isWorkingDay(sunday)).toBe(true);
    expect(scheduler.isWorkingDay(monday)).toBe(false);
  });

  it('handles full week working (mask = 127)', () => {
    const scheduler = new SchedulerService(cells, [], { workingDaysMask: 127 });

    for (let i = 4; i <= 10; i++) {
      const date = new Date(`2025-01-${i.toString().padStart(2, '0')}`);
      expect(scheduler.isWorkingDay(date)).toBe(true);
    }
  });

  it('handles Saturday-Sunday working (mask = 96)', () => {
    const scheduler = new SchedulerService(cells, [], { workingDaysMask: 96 });

    const saturday = new Date('2025-01-04');
    const sunday = new Date('2025-01-05');
    const monday = new Date('2025-01-06');

    expect(scheduler.isWorkingDay(saturday)).toBe(true);
    expect(scheduler.isWorkingDay(sunday)).toBe(true);
    expect(scheduler.isWorkingDay(monday)).toBe(false);
  });
});
