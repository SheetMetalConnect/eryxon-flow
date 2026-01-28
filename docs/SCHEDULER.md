# Simple Scheduler

Eryxon Flow includes a **simple capacity-based scheduler** for planning operations across your production cells. While it doesn't perform complex optimization, it provides a quick way to allocate work based on cell capacity and factory calendar settings.

---

## Overview

The scheduler is designed to be straightforward:

1. **No complex optimization** - Operations are scheduled sequentially based on job priority (due date)
2. **Capacity-aware** - Respects cell capacity limits and factory calendar (holidays, closures, half-days)
3. **Multi-day overflow** - Large operations automatically span multiple days when they exceed daily capacity
4. **Manual override friendly** - Dates from ERP systems or manual overrides take precedence

> **Note:** The scheduler is a planning aid, not a replacement for proper production scheduling software. For complex scheduling needs, consider using dedicated APS (Advanced Planning & Scheduling) tools.

---

## How It Works

### Scheduling Logic

When you click "Auto Schedule", the scheduler:

1. **Fetches all incomplete jobs and operations** from the database
2. **Sorts jobs by due date** - Earlier due dates get scheduled first
3. **Allocates operations to cells** based on available capacity:
   - Checks the cell's `capacity_hours_per_day` setting
   - Respects factory calendar overrides (holidays, closures, half-days)
   - Skips weekends based on the working days configuration
4. **Handles multi-day operations** - If an operation exceeds a day's capacity, it overflows to subsequent working days
5. **Saves planned dates** - Updates `planned_start` and `planned_end` on each operation
6. **Records day allocations** - Stores how hours are distributed across days for capacity visualization

### Working Days Configuration

The scheduler uses a bitmask for working days:

| Day | Bit Value |
|-----|-----------|
| Monday | 1 |
| Tuesday | 2 |
| Wednesday | 4 |
| Thursday | 8 |
| Friday | 16 |
| Saturday | 32 |
| Sunday | 64 |

**Default:** `31` (Monday through Friday = 1+2+4+8+16)

To include Saturday, use `63` (31 + 32).

### Calendar Overrides

The Factory Calendar allows you to define:

- **Working days** - Normal work days with full capacity
- **Holidays** - No work (capacity multiplier = 0)
- **Closures** - Factory closed (capacity multiplier = 0)
- **Half days** - Reduced capacity (capacity multiplier = 0.5)

Calendar entries override the default working days configuration.

---

## Components

### AutoScheduleButton

Located at: `src/components/scheduler/AutoScheduleButton.tsx`

A button component that triggers the scheduling process. When clicked:

1. Shows a confirmation dialog if operations already have planned dates
2. Fetches all required data (jobs, operations, cells, calendar)
3. Runs the scheduling algorithm
4. Updates the database with planned dates
5. Invalidates React Query caches to refresh the UI

**Usage:**
```tsx
import { AutoScheduleButton } from '@/components/scheduler/AutoScheduleButton';

// In your capacity planning page
<AutoScheduleButton />
```

### SchedulerService

Located at: `src/lib/scheduler.ts`

The core scheduling engine. Key methods:

```typescript
class SchedulerService {
  constructor(cells: Cell[], calendarDays: CalendarDay[], config: SchedulerConfig)

  // Check if a date is a working day
  isWorkingDay(date: Date): boolean

  // Get available capacity for a cell on a date
  getAvailableCapacity(cellId: string, date: Date): number

  // Schedule a list of operations
  scheduleOperations(operations: Operation[], startDate?: Date): ScheduledOperation[]

  // Schedule operations grouped by job (maintains job operation sequence)
  scheduleJobs(jobs: Job[], operationsByJob: Map<string, Operation[]>, startDate?: Date): ScheduledOperation[]

  // Get capacity summary for a date range
  getCapacitySummary(startDate: Date, endDate: Date, cellId?: string): Map<string, CapacitySummary>
}
```

### DueDateOverrideModal

Located at: `src/components/admin/DueDateOverrideModal.tsx`

Allows manual override of job due dates. The scheduler uses the overridden date when prioritizing jobs.

---

## Database Schema

### Operations Table

The scheduler updates these columns:

| Column | Type | Description |
|--------|------|-------------|
| `planned_start` | timestamp | Scheduled start date/time |
| `planned_end` | timestamp | Scheduled end date/time |
| `estimated_time` | integer | Duration in minutes (used for scheduling) |

### Cells Table

| Column | Type | Description |
|--------|------|-------------|
| `capacity_hours_per_day` | numeric | Daily capacity in hours (default: 8) |

### Factory Calendar Table

| Column | Type | Description |
|--------|------|-------------|
| `date` | date | The calendar date |
| `day_type` | enum | 'working', 'holiday', 'closure', 'half_day' |
| `capacity_multiplier` | numeric | 0.0 to 1.0 (reduces available hours) |

### Operation Day Allocations Table

Stores multi-day operation distribution for capacity visualization:

| Column | Type | Description |
|--------|------|-------------|
| `operation_id` | uuid | Reference to operation |
| `cell_id` | uuid | Reference to cell |
| `date` | date | The allocation date |
| `hours_allocated` | numeric | Hours allocated on this day |

---

## Capacity Matrix Page

The Capacity Matrix page (`/admin/capacity-matrix`) provides:

1. **Visual capacity overview** - Shows cell utilization by date
2. **Color-coded utilization**:
   - Green (≤50% utilized)
   - Yellow (≤80% utilized)
   - Orange (≤100% utilized)
   - Red (>100% overloaded)
3. **Auto Schedule button** - One-click scheduling
4. **Day allocation details** - Click a cell to see which operations are scheduled

---

## Limitations

1. **No optimization** - Operations are scheduled in job due date order, not optimized for efficiency
2. **No dependencies** - Operations within a job are scheduled sequentially, but cross-job dependencies aren't considered
3. **No resource constraints** - Only cell capacity is considered, not worker availability or material constraints
4. **Simple overflow** - Multi-day operations use remaining capacity, which may not be optimal
5. **No what-if analysis** - Cannot simulate different scheduling scenarios

---

## Best Practices

1. **Set realistic cell capacities** - Configure `capacity_hours_per_day` to reflect actual production capacity
2. **Maintain the factory calendar** - Keep holidays and closures up to date
3. **Use estimated times** - Ensure operations have accurate `estimated_time` values
4. **Review before committing** - Use the Capacity Matrix to visualize the schedule before production
5. **Consider manual overrides** - For critical jobs, use due date overrides to prioritize

---

## Future Considerations

For production environments with complex scheduling needs, consider:

- **Integration with APS systems** - Import optimized schedules from dedicated planning tools
- **ERP integration** - Sync due dates and priorities from your ERP system
- **Custom scheduling rules** - Implement business-specific logic via webhooks

The simple scheduler is intended as a starting point. For advanced scheduling requirements, external tools provide more sophisticated optimization capabilities.
