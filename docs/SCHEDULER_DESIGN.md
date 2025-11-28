# QRM Cell-Based Scheduler - Design Plan

## Overview

This document outlines the implementation plan for a production-ready QRM (Quick Response Manufacturing) cell-based scheduler for Eryxon Flow.

## Current State

### What Exists

| Component | File | Status |
|-----------|------|--------|
| Basic scheduler service | `src/lib/scheduler.ts` | ✅ MVP (day-level only) |
| Capacity matrix UI | `src/pages/admin/CapacityMatrix.tsx` | ✅ 14-day view |
| Auto-schedule button | `src/components/scheduler/AutoScheduleButton.tsx` | ✅ Works |
| Cell capacity column | `cells.capacity_hours_per_day` | ✅ Defaults to 8h |
| Factory hours | `tenants.factory_opening_time/closing_time` | ✅ Not used by scheduler |

### What's Missing (Phase 1 - This Sprint)

| Feature | Priority | Status |
|---------|----------|--------|
| UI settings for cell capacity limits | 🔴 High | ✅ Done |
| Factory calendar (closures/off days) | 🔴 High | ✅ Done |
| Day-level scheduling with overflow | 🔴 High | ✅ Done |
| Jobs spanning multiple days | 🔴 High | ✅ Done |

### Future Phases

| Feature | Phase |
|---------|-------|
| Weekly/daily/monthly views | Phase 2 |
| Gantt chart visualization | Phase 2 |
| Operator/machine linking to cells | Phase 2 |
| Drag-and-drop rescheduling | Phase 3 |
| Optimization algorithms | Phase 3 |

---

## Phase 1 Implementation

### 1. Factory Calendar Table

**Purpose**: Store factory closures, holidays, and non-working days.

```sql
CREATE TABLE factory_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_type TEXT NOT NULL DEFAULT 'working',  -- 'working', 'holiday', 'closure', 'half_day'
  name TEXT,  -- e.g., "Christmas", "Factory Maintenance"
  opening_time TIME,  -- Override for this specific day (null = use tenant default)
  closing_time TIME,  -- Override for this specific day (null = use tenant default)
  capacity_multiplier NUMERIC DEFAULT 1.0,  -- 0.5 for half days, 0 for closures
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, date)
);

-- Enable RLS
ALTER TABLE factory_calendar ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's calendar"
  ON factory_calendar FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage their tenant's calendar"
  ON factory_calendar FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
```

**Day Types**:
- `working`: Normal working day (use tenant default hours)
- `holiday`: Public holiday (factory closed, capacity = 0)
- `closure`: Planned closure (factory closed, capacity = 0)
- `half_day`: Reduced hours (capacity_multiplier = 0.5)

### 2. Cell Capacity Settings UI

**Location**: Add to existing Cells configuration page (`/admin/config/stages`)

**Features**:
- Edit `capacity_hours_per_day` per cell
- Visual capacity indicator
- Bulk edit capability

**UI Mockup**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Cell: Assembly                                                   │
├─────────────────────────────────────────────────────────────────┤
│ Capacity Hours per Day: [  8  ] hours                           │
│ ─────────────────────────────────────────────────────────────── │
│ This means the cell can process up to 8 hours of work per day.  │
│ Adjust based on available operators/machines and shifts.        │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Hour-Level Precision Scheduling

**Current**: Operations have `planned_start` and `planned_end` set to same day (day-level).

**New**: Calculate actual start and end times within a day.

```typescript
interface TimeSlot {
  date: Date;
  startTime: string;  // "09:00"
  endTime: string;    // "12:30"
  availableHours: number;
}

interface ScheduledOperation {
  operation_id: string;
  planned_start: Date;     // Full timestamp with time
  planned_end: Date;       // Full timestamp with time
  spans_multiple_days: boolean;
  day_allocations: {
    date: string;
    hours: number;
    start_time: string;
    end_time: string;
  }[];
}
```

**Algorithm**:
```
1. Get factory hours for the day (from tenant defaults or calendar override)
2. Get cell capacity for the day (capacity_hours_per_day * calendar.capacity_multiplier)
3. Get already scheduled hours for this cell on this day
4. Calculate available time slots
5. If operation fits in remaining time → schedule within day
6. If operation exceeds remaining time → span to next working day(s)
```

### 4. Multi-Day Job Spanning

**Problem**: Operations requiring more hours than available in a day must span multiple days.

**Solution**: Track allocation per day.

```typescript
interface DayAllocation {
  date: string;           // "2025-11-28"
  hours_allocated: number; // 6.5
  start_time: string;      // "07:00"
  end_time: string;        // "13:30"
}

// Example: 20-hour operation starting Nov 28
// Day 1 (Nov 28): 8 hours (07:00-15:00)
// Day 2 (Nov 29): 8 hours (07:00-15:00)
// Day 3 (Nov 30): 4 hours (07:00-11:00)
```

**Database Schema Addition**:
```sql
CREATE TABLE operation_day_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours_allocated NUMERIC NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(operation_id, date)
);

-- Index for efficient capacity queries
CREATE INDEX idx_operation_day_allocations_date
  ON operation_day_allocations(tenant_id, date, operation_id);
```

---

## Updated Scheduler Service

### New Methods

```typescript
class SchedulerService {
  // Existing
  constructor(cells: Cell[], calendar: FactoryCalendar[]);

  // New methods
  isWorkingDay(date: Date): boolean;
  getWorkingHours(date: Date): { start: string; end: string; totalHours: number };
  getCellCapacity(cellId: string, date: Date): number;
  getAvailableCapacity(cellId: string, date: Date): number;

  // Updated scheduling with hour precision
  scheduleOperation(
    operation: Operation,
    earliestStart: Date
  ): ScheduledOperation;

  // Multi-day allocation
  allocateAcrossDays(
    cellId: string,
    hoursNeeded: number,
    startDate: Date
  ): DayAllocation[];
}
```

### Scheduling Flow

```
Input: List of operations sorted by job due date

For each operation:
  1. Get cell and required hours
  2. Find earliest available date (considering dependencies)
  3. Check if it's a working day (skip weekends/holidays)
  4. Get available capacity for cell on that day
  5. If operation fits:
     - Schedule within day with precise start/end times
  6. If operation doesn't fit:
     - Allocate what fits today
     - Continue to next working day(s)
     - Create DayAllocation records for each day
  7. Update capacity tracking
  8. Set planned_start (first day, start time)
  9. Set planned_end (last day, end time)

Output: Scheduled operations with timestamps and day allocations
```

---

## UI Updates

### 1. Factory Calendar Management Page

**Route**: `/admin/config/calendar`

**Features**:
- Monthly calendar view
- Mark days as holiday/closure
- Set custom hours for specific days
- Bulk operations (e.g., mark all weekends as non-working)
- Import holidays from locale

**Components**:
```
src/
  pages/admin/
    FactoryCalendar.tsx       # Main calendar management page
  components/scheduler/
    CalendarDayEditor.tsx     # Edit single day details
    CalendarMonthView.tsx     # Month grid with day types
    HolidayImporter.tsx       # Import public holidays
```

### 2. Capacity Matrix Enhancements

**Current**: Shows % capacity per cell per day

**Enhanced**:
- Show actual operations scheduled (not just %)
- Click to see operation details
- Color-coded by job/customer
- Show jobs spanning multiple days as bars

```
┌──────────────────────────────────────────────────────────────────────┐
│ Cell A     │ Mon 28   │ Tue 29   │ Wed 30   │ Thu 01   │ Fri 02    │
├────────────┼──────────┼──────────┼──────────┼──────────┼───────────┤
│ Assembly   │ ████████ │ ████░░░░ │ ██░░░░░░ │ ░░░░░░░░ │ HOLIDAY   │
│ 8h/day     │ 8h (100%)│ 4h (50%) │ 2h (25%) │ 0h (0%)  │ CLOSED    │
│            │ ─────────┴──────────┴────────  │          │           │
│            │ JOB-123: Assembly (14h total)  │          │           │
└────────────┴───────────────────────────────────────────┴───────────┘

Legend:
█ = Scheduled hours
░ = Available hours
─ = Job spanning multiple days
```

### 3. Cell Settings Enhancement

**Location**: `/admin/config/stages` (existing Cells page)

**Add**:
- Capacity hours input field
- Link to capacity matrix view
- Weekly/monthly capacity summary

---

## Database Migration Plan

### Migration 1: Factory Calendar Table
```sql
-- 20251127180000_add_factory_calendar.sql
CREATE TABLE factory_calendar (...);
-- Enable RLS + policies
```

### Migration 2: Operation Day Allocations
```sql
-- 20251127180001_add_operation_day_allocations.sql
CREATE TABLE operation_day_allocations (...);
-- Add index
```

### Migration 3: Update Types
```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

---

## Implementation Checklist

### Phase 1 (Current Sprint)

- [ ] **Database**
  - [ ] Create `factory_calendar` table
  - [ ] Create `operation_day_allocations` table
  - [ ] Add RLS policies
  - [ ] Regenerate TypeScript types

- [ ] **Backend/Service**
  - [ ] Update `SchedulerService` with calendar awareness
  - [ ] Add hour-level precision to scheduling
  - [ ] Implement multi-day spanning logic
  - [ ] Add day allocation tracking

- [ ] **UI - Cell Capacity**
  - [ ] Add capacity input to Cells config page
  - [ ] Show capacity in cell list

- [ ] **UI - Factory Calendar**
  - [ ] Create `/admin/config/calendar` page
  - [ ] Monthly calendar view
  - [ ] Day type editor (working/holiday/closure)
  - [ ] Custom hours per day

- [ ] **UI - Capacity Matrix Updates**
  - [ ] Show operations with job identifiers
  - [ ] Visual indicator for multi-day operations
  - [ ] Holiday/closure indicators
  - [ ] Click to expand operation details

---

## File Structure

```
src/
├── lib/
│   └── scheduler.ts                    # Enhanced scheduler service
├── pages/admin/
│   ├── CapacityMatrix.tsx              # Updated with job indicators
│   └── FactoryCalendar.tsx             # NEW: Calendar management
├── components/scheduler/
│   ├── AutoScheduleButton.tsx          # Existing
│   ├── CalendarMonthView.tsx           # NEW: Month grid component
│   ├── CalendarDayEditor.tsx           # NEW: Edit day dialog
│   └── OperationDayBar.tsx             # NEW: Multi-day visual
└── integrations/supabase/
    └── types.ts                        # Regenerated

supabase/migrations/
├── 20251127180000_add_factory_calendar.sql
└── 20251127180001_add_operation_day_allocations.sql
```

---

## Testing Plan

1. **Unit Tests** (if test framework exists)
   - Scheduler calculates correct day allocations
   - Factory calendar correctly identifies working days
   - Multi-day spanning works with various durations

2. **Manual Testing**
   - Schedule operation that fits in one day
   - Schedule operation that spans 2 days
   - Schedule operation that spans a weekend (skips non-working days)
   - Schedule on a holiday (should skip to next working day)
   - Edit cell capacity and verify impact

---

## Success Criteria

✅ **Cell Capacity UI**: Admin can set hours/day per cell from the UI
✅ **Factory Calendar**: Admin can mark holidays/closures, system respects them
✅ **Hour Precision**: Operations show actual start/end times (not just date)
✅ **Multi-Day Spanning**: 20-hour operation correctly spans 3x 8-hour days
✅ **Visual Clarity**: Capacity matrix shows which jobs run on which days

---

## Next Phases (Future)

### Phase 2
- Weekly/daily/monthly view toggles
- Gantt chart visualization
- Operator assignment to cells
- Resource constraints

### Phase 3
- Drag-and-drop rescheduling
- What-if analysis
- Optimization algorithms (minimize lateness, balance load)
- Integration with external scheduling libraries (OR-Tools, etc.)
