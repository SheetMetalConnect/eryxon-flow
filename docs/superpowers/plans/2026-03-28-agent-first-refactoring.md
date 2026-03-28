# Agent-First Codebase Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the 6 architecture hotspots into agent-safe, small-blast-radius modules with test guardrails, so any AI agent can ship changes confidently without cascading failures.

**Architecture:** Bottom-up hotspot elimination. Each task splits a god-object into focused modules with explicit interfaces. Test coverage wraps each new module before it ships. The sequence is ordered by blast radius (highest risk first).

**Tech Stack:** React 18, TypeScript strict, Vitest, TanStack Query, Supabase, Three.js, Tailwind/shadcn

---

## File Map

| Hotspot | Current | After |
|---------|---------|-------|
| useAuth (94 files, 216 refs) | `src/contexts/AuthContext.tsx` (255 lines) | Split into `useProfile`, `useTenant`, `useSession`, `useAuthActions` + slim `useAuth` re-export |
| SchedulerService (20 functions) | `src/lib/scheduler.ts` (425 lines) | Split into `calendar.ts`, `capacity.ts`, `allocator.ts`, `scheduler.ts` (orchestrator) |
| STEPViewer (16 functions) | `src/components/STEPViewer.tsx` (1976 lines) | Split into `viewer/scene.ts`, `viewer/controls.ts`, `viewer/pmi-overlay.ts`, `viewer/grid.ts`, `STEPViewer.tsx` (shell) |
| BatchDetail (684 lines) | `src/pages/admin/BatchDetail.tsx` | Extract `BatchHeader`, `BatchOperations`, `BatchRequirements`, `BatchSplitDialog` |
| OperatorView (686 lines) | `src/pages/operator/OperatorView.tsx` | Extract `OperatorHeader`, `OperatorWorkQueue`, `OperatorTimeTracking` |
| Test coverage | 28 test files / 167 components | Target: tests for every new module + coverage for existing hooks |

---

## Task 1: Split useAuth into Focused Hooks

**Why first:** 94 files import useAuth. Any change to AuthContext.tsx has the largest blast radius in the entire app. Splitting it means agents can change profile logic without risking tenant or session consumers.

**Files:**
- Modify: `src/contexts/AuthContext.tsx`
- Create: `src/hooks/useProfile.ts`
- Create: `src/hooks/useTenant.ts`
- Create: `src/hooks/useSession.ts`
- Create: `src/hooks/useAuthActions.ts`
- Create: `src/hooks/useProfile.test.ts`
- Create: `src/hooks/useTenant.test.ts`
- Modify: `src/contexts/AuthContext.test.tsx` (update existing tests)

### Approach

The existing `AuthContext` stays as the single source of truth. New hooks are **selector hooks** that read from the same context but expose only their slice. This means zero migration risk — `useAuth()` keeps working, and consumers can be migrated file-by-file over time.

- [ ] **Step 1: Create useProfile hook**

```ts
// src/hooks/useProfile.ts
import { useAuth } from "@/contexts/AuthContext";

/** Focused hook: returns only the user profile.
 *  ~70% of useAuth consumers only need this. */
export function useProfile() {
  const { profile } = useAuth();
  return profile;
}
```

- [ ] **Step 2: Create useTenant hook**

```ts
// src/hooks/useTenant.ts
import { useAuth } from "@/contexts/AuthContext";

/** Focused hook: returns tenant info + refresh.
 *  Use this for plan checks, whitelabel, feature flags. */
export function useTenant() {
  const { tenant, refreshTenant } = useAuth();
  return { tenant, refreshTenant };
}
```

- [ ] **Step 3: Create useSession hook**

```ts
// src/hooks/useSession.ts
import { useAuth } from "@/contexts/AuthContext";

/** Focused hook: returns Supabase session/user.
 *  Use for API calls that need the Bearer token. */
export function useSession() {
  const { user, session } = useAuth();
  return { user, session };
}
```

- [ ] **Step 4: Create useAuthActions hook**

```ts
// src/hooks/useAuthActions.ts
import { useAuth } from "@/contexts/AuthContext";

/** Focused hook: auth mutations (sign in/up/out, tenant switch).
 *  Only 3-4 components need this. */
export function useAuthActions() {
  const { signIn, signUp, signOut, switchTenant, loading } = useAuth();
  return { signIn, signUp, signOut, switchTenant, loading };
}
```

- [ ] **Step 5: Write tests for useProfile**

```ts
// src/hooks/useProfile.test.ts
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock useAuth to return a known profile
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: { id: "u1", tenant_id: "t1", username: "testuser", role: "admin" },
    tenant: null,
    user: null,
    session: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    switchTenant: vi.fn(),
    refreshTenant: vi.fn(),
  }),
}));

import { useProfile } from "./useProfile";

describe("useProfile", () => {
  it("returns only the profile from auth context", () => {
    const { result } = renderHook(() => useProfile());
    expect(result.current).toEqual(
      expect.objectContaining({ id: "u1", username: "testuser" })
    );
  });

  it("returns null when not authenticated", async () => {
    const { useAuth } = await import("@/contexts/AuthContext");
    vi.mocked(useAuth).mockReturnValueOnce({
      profile: null, tenant: null, user: null, session: null,
      loading: false, signIn: vi.fn(), signUp: vi.fn(),
      signOut: vi.fn(), switchTenant: vi.fn(), refreshTenant: vi.fn(),
    });
    const { result } = renderHook(() => useProfile());
    expect(result.current).toBeNull();
  });
});
```

- [ ] **Step 6: Write tests for useTenant**

```ts
// src/hooks/useTenant.test.ts
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: null, user: null, session: null, loading: false,
    tenant: { id: "t1", name: "Test Co", plan: "pro", status: "active",
      trial_ends_at: null, company_name: "Test Co",
      whitelabel_enabled: false, whitelabel_logo_url: null,
      whitelabel_app_name: null, whitelabel_primary_color: null,
      whitelabel_favicon_url: null },
    signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
    switchTenant: vi.fn(), refreshTenant: vi.fn(),
  }),
}));

import { useTenant } from "./useTenant";

describe("useTenant", () => {
  it("returns tenant info and refreshTenant", () => {
    const { result } = renderHook(() => useTenant());
    expect(result.current.tenant?.id).toBe("t1");
    expect(result.current.tenant?.plan).toBe("pro");
    expect(typeof result.current.refreshTenant).toBe("function");
  });
});
```

- [ ] **Step 7: Run all tests**

Run: `npm run test:run`
Expected: All existing + new tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useProfile.ts src/hooks/useTenant.ts src/hooks/useSession.ts src/hooks/useAuthActions.ts src/hooks/useProfile.test.ts src/hooks/useTenant.test.ts
git commit -m "feat: split useAuth into focused selector hooks (useProfile, useTenant, useSession, useAuthActions)"
```

---

## Task 2: Migrate High-Traffic useAuth Consumers to Focused Hooks

**Why:** The new hooks exist but nobody uses them yet. Migrate the highest-traffic consumers so the blast radius shrinks immediately. This is mechanical find-and-replace, safe for agents.

**Files:**
- Modify: All files that destructure only `{ profile }` from useAuth (~65 files)
- Modify: All files that destructure only `{ tenant }` from useAuth (~10 files)
- Modify: All files that destructure only `{ session }` from useAuth (~3 files)

### Migration Rules

| Current pattern | Replace with |
|----------------|-------------|
| `const { profile } = useAuth()` | `const profile = useProfile()` |
| `const { tenant } = useAuth()` | `const { tenant } = useTenant()` |
| `const { session } = useAuth()` | `const { session } = useSession()` |
| `const { profile, tenant } = useAuth()` | Leave as `useAuth()` for now (mixed usage) |

Also update the import: replace `import { useAuth } from "@/contexts/AuthContext"` with the appropriate focused hook import.

- [ ] **Step 1: Migrate profile-only consumers**

For each file that matches `const { profile } = useAuth()`:
1. Change `import { useAuth } from "@/contexts/AuthContext"` → `import { useProfile } from "@/hooks/useProfile"`
2. Change `const { profile } = useAuth()` → `const profile = useProfile()`

**Target files (partial list — agent should grep for all):**
- `src/hooks/useGlobalSearch.ts`
- `src/hooks/usePendingIssuesCount.ts`
- `src/hooks/useInvitations.ts`
- `src/pages/admin/Jobs.tsx`
- `src/pages/admin/Parts.tsx`
- `src/pages/admin/Operations.tsx`
- `src/components/operator/OperationCard.tsx`
- `src/components/admin/PartDetailModal.tsx`
- ... (~65 files total)

- [ ] **Step 2: Migrate tenant-only consumers**

For each file that matches `const { tenant } = useAuth()`:
1. Change import to `import { useTenant } from "@/hooks/useTenant"`
2. Change `const { tenant } = useAuth()` → `const { tenant } = useTenant()`

**Target files:**
- `src/hooks/useFeatureFlags.ts`
- `src/pages/admin/McpServerSettings.tsx`
- `src/components/admin/TrialStatusBanner.tsx`
- `src/components/ui/brand-logo.tsx`
- ... (~10 files total)

- [ ] **Step 3: Migrate session-only consumers**

For each file that matches `const { session } = useAuth()`:
1. Change import to `import { useSession } from "@/hooks/useSession"`
2. Change `const { session } = useAuth()` → `const { session } = useSession()`

**Target files:**
- `src/hooks/usePMI.ts`
- ... (~3 files total)

- [ ] **Step 4: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass. The focused hooks delegate to useAuth internally, so behavior is identical.

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: migrate useAuth consumers to focused hooks (useProfile, useTenant, useSession)"
```

---

## Task 3: Decompose SchedulerService into Focused Modules

**Why:** 425 lines, 20 functions in one class. An agent editing scheduling logic risks breaking capacity calculations or calendar logic. Split by responsibility.

**Files:**
- Modify: `src/lib/scheduler.ts` (becomes thin orchestrator)
- Create: `src/lib/scheduler/calendar.ts`
- Create: `src/lib/scheduler/capacity.ts`
- Create: `src/lib/scheduler/allocator.ts`
- Create: `src/lib/scheduler/types.ts`
- Create: `src/lib/scheduler/index.ts` (re-export)
- Create: `src/lib/scheduler/calendar.test.ts`
- Create: `src/lib/scheduler/capacity.test.ts`
- Create: `src/lib/scheduler/allocator.test.ts`
- Modify: `src/lib/scheduler.test.ts` (update imports)

- [ ] **Step 1: Create types module**

```ts
// src/lib/scheduler/types.ts
import { Database } from '@/integrations/supabase/types';

export type Job = Database['public']['Tables']['jobs']['Row'];
export type Operation = Database['public']['Tables']['operations']['Row'];
export type Cell = Database['public']['Tables']['cells']['Row'];

export const MAX_SCHEDULING_DAYS = 365;
export const DEFAULT_OPERATION_DURATION_MINUTES = 60;

export interface CalendarDay {
  date: string;
  day_type: 'working' | 'holiday' | 'closure' | 'half_day';
  capacity_multiplier: number;
}

export interface DayAllocation {
  date: string;
  hours_allocated: number;
  cell_id: string;
  operation_id: string;
}

export interface ScheduledOperation extends Operation {
  planned_start: string | null;
  planned_end: string | null;
  day_allocations: DayAllocation[];
}

export interface SchedulerConfig {
  workingDaysMask?: number;
  factoryOpeningTime?: string;
  factoryClosingTime?: string;
}
```

- [ ] **Step 2: Extract CalendarService**

```ts
// src/lib/scheduler/calendar.ts
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
```

- [ ] **Step 3: Write CalendarService tests**

```ts
// src/lib/scheduler/calendar.test.ts
import { describe, it, expect } from 'vitest';
import { CalendarService } from './calendar';

describe('CalendarService', () => {
  it('treats Mon-Fri as working days by default', () => {
    const cal = new CalendarService();
    // 2026-03-30 is a Monday
    expect(cal.isWorkingDay(new Date('2026-03-30'))).toBe(true);
    // 2026-03-29 is a Sunday
    expect(cal.isWorkingDay(new Date('2026-03-29'))).toBe(false);
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
```

- [ ] **Step 4: Extract CapacityTracker**

```ts
// src/lib/scheduler/capacity.ts
import { format } from 'date-fns';
import type { Cell } from './types';
import type { CalendarService } from './calendar';

export class CapacityTracker {
  private cells: Map<string, Cell>;
  private used: Map<string, Map<string, number>>;  // cellId -> date -> hours
  private cache: Map<string, number>;               // "cellId:date" -> totalCapacity
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
```

- [ ] **Step 5: Write CapacityTracker tests**

```ts
// src/lib/scheduler/capacity.test.ts
import { describe, it, expect } from 'vitest';
import { CapacityTracker } from './capacity';
import { CalendarService } from './calendar';

const mockCell = { id: 'c1', capacity_hours_per_day: 8 } as any;

describe('CapacityTracker', () => {
  it('returns base capacity on a working day', () => {
    const cal = new CalendarService();
    const tracker = new CapacityTracker([mockCell], cal);
    // Monday
    expect(tracker.getCellCapacityForDay('c1', new Date('2026-03-30'))).toBe(8);
  });

  it('returns 0 capacity on weekend', () => {
    const cal = new CalendarService();
    const tracker = new CapacityTracker([mockCell], cal);
    // Sunday
    expect(tracker.getCellCapacityForDay('c1', new Date('2026-03-29'))).toBe(0);
  });

  it('tracks used hours and computes available', () => {
    const cal = new CalendarService();
    const tracker = new CapacityTracker([mockCell], cal);
    tracker.addUsedHours('c1', '2026-03-30', 3);
    expect(tracker.getAvailableCapacity('c1', new Date('2026-03-30'))).toBe(5);
  });
});
```

- [ ] **Step 6: Extract OperationAllocator**

```ts
// src/lib/scheduler/allocator.ts
import { addDays, format, startOfDay } from 'date-fns';
import type { DayAllocation, Operation } from './types';
import { MAX_SCHEDULING_DAYS, DEFAULT_OPERATION_DURATION_MINUTES } from './types';
import type { CalendarService } from './calendar';
import type { CapacityTracker } from './capacity';

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
    return (op.estimated_time || DEFAULT_OPERATION_DURATION_MINUTES) / 60;
  }

  allocate(
    cellId: string,
    operationId: string,
    hoursNeeded: number,
    startDate: Date
  ): { allocations: DayAllocation[]; endDate: Date } {
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
        this.capacity.addUsedHours(cellId, dateStr, hours);
        remaining -= hours;
        lastDate = current;
      }

      current = addDays(current, 1);
      attempts++;
    }

    return { allocations, endDate: lastDate };
  }
}
```

- [ ] **Step 7: Write OperationAllocator tests**

```ts
// src/lib/scheduler/allocator.test.ts
import { describe, it, expect } from 'vitest';
import { OperationAllocator } from './allocator';
import { CalendarService } from './calendar';
import { CapacityTracker } from './capacity';

const mockCell = { id: 'c1', capacity_hours_per_day: 8 } as any;

describe('OperationAllocator', () => {
  it('allocates a small operation within one day', () => {
    const cal = new CalendarService();
    const cap = new CapacityTracker([mockCell], cal);
    const alloc = new OperationAllocator(cal, cap);

    const result = alloc.allocate('c1', 'op1', 4, new Date('2026-03-30'));
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].hours_allocated).toBe(4);
    expect(result.allocations[0].date).toBe('2026-03-30');
  });

  it('overflows to next working day when exceeding capacity', () => {
    const cal = new CalendarService();
    const cap = new CapacityTracker([mockCell], cal);
    const alloc = new OperationAllocator(cal, cap);

    const result = alloc.allocate('c1', 'op1', 12, new Date('2026-03-30'));
    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0].hours_allocated).toBe(8);
    expect(result.allocations[1].hours_allocated).toBe(4);
  });

  it('skips weekends', () => {
    const cal = new CalendarService();
    const cap = new CapacityTracker([mockCell], cal);
    const alloc = new OperationAllocator(cal, cap);

    // Friday 2026-04-03 → should skip Sat/Sun → continue Monday
    const result = alloc.allocate('c1', 'op1', 12, new Date('2026-04-03'));
    expect(result.allocations[0].date).toBe('2026-04-03');
    expect(result.allocations[1].date).toBe('2026-04-06'); // Monday
  });
});
```

- [ ] **Step 8: Rewrite scheduler.ts as thin orchestrator**

Replace the monolithic `src/lib/scheduler.ts` with a slim file that re-exports from the new modules and keeps `SchedulerService` as a facade delegating to `CalendarService`, `CapacityTracker`, and `OperationAllocator`. This preserves the existing public API so no consumers break.

```ts
// src/lib/scheduler/index.ts
export { CalendarService } from './calendar';
export { CapacityTracker } from './capacity';
export { OperationAllocator } from './allocator';
export { SchedulerService } from './scheduler';
export type { CalendarDay, DayAllocation, ScheduledOperation, SchedulerConfig } from './types';
```

**Important:** Delete the old `src/lib/scheduler.ts` file before creating the `src/lib/scheduler/` directory — a file and directory cannot coexist at the same path. All existing imports of `@/lib/scheduler` will resolve to `src/lib/scheduler/index.ts` automatically.

The `SchedulerService` class in `src/lib/scheduler/scheduler.ts` becomes a thin facade:
```ts
// src/lib/scheduler/scheduler.ts
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

  // Delegate public methods — preserves exact same API
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
```

- [ ] **Step 9: Update existing scheduler tests**

Update `src/lib/scheduler.test.ts` to import from the new path. The public API is identical, so tests should pass without changes beyond the import.

- [ ] **Step 10: Run tests and build**

Run: `npm run test:run && npm run build`
Expected: All tests pass, build succeeds.

- [ ] **Step 11: Commit**

```bash
git add src/lib/scheduler/ src/lib/scheduler.ts src/lib/scheduler.test.ts
git commit -m "refactor: decompose SchedulerService into calendar, capacity, allocator modules"
```

---

## Task 4: Decompose STEPViewer (1976 lines → focused modules)

**Why:** Largest single component. Mixes Three.js scene setup, controls, grid rendering, PMI overlay, and measurement logic. An agent touching PMI rendering risks breaking the scene setup.

**Files:**
- Modify: `src/components/STEPViewer.tsx` (keep as shell component)
- Create: `src/components/viewer/scene.ts` (Three.js scene, camera, renderer setup)
- Create: `src/components/viewer/controls.ts` (OrbitControls, view reset, zoom)
- Create: `src/components/viewer/grid.ts` (fading grid material + mesh)
- Create: `src/components/viewer/pmi-overlay.ts` (PMI label rendering via CSS2DRenderer)
- Create: `src/components/viewer/types.ts` (shared viewer types)

**Note:** This task requires reading the full STEPViewer.tsx (1976 lines) to identify exact function boundaries. The agent executing this task should:

1. Read the full file in chunks
2. Map all functions and their dependencies
3. Group by responsibility (scene setup, controls, grid, PMI, measurements)
4. Extract each group into its own module
5. Keep STEPViewer.tsx as a composition shell that imports and wires the modules

- [ ] **Step 1: Read and map all functions in STEPViewer.tsx**

Read the full file. Document every function, its line range, and what it depends on. Group into: scene, controls, grid, pmi, measurement, component-lifecycle.

- [ ] **Step 2: Create shared viewer types**

Extract all interfaces and type aliases used across multiple viewer functions into `src/components/viewer/types.ts`.

- [ ] **Step 3: Extract grid module**

Move `createFadingGridMaterial` and grid mesh creation into `src/components/viewer/grid.ts`. This is the most self-contained piece — no dependencies on component state.

- [ ] **Step 4: Extract scene setup**

Move Three.js scene initialization (renderer, camera, lighting) into `src/components/viewer/scene.ts`. Export a `createScene(container: HTMLElement)` factory.

- [ ] **Step 5: Extract controls**

Move OrbitControls setup, view reset, zoom-to-fit into `src/components/viewer/controls.ts`.

- [ ] **Step 6: Extract PMI overlay**

Move CSS2DRenderer setup and PMI label creation into `src/components/viewer/pmi-overlay.ts`.

- [ ] **Step 7: Rewrite STEPViewer.tsx as composition shell**

STEPViewer.tsx should import from the extracted modules and compose them. Target: under 400 lines.

- [ ] **Step 8: Run build**

Run: `npm run build`
Expected: Build succeeds. STEPViewer is a visual component — build verification is the primary gate. Manual visual QA recommended.

- [ ] **Step 9: Commit**

```bash
git add src/components/viewer/ src/components/STEPViewer.tsx
git commit -m "refactor: decompose STEPViewer into scene, controls, grid, pmi-overlay modules"
```

---

## Task 5: Extract Sub-Components from BatchDetail (684 lines)

**Why:** Page component doing too much directly — data fetching, mutations, dialogs, layout all in one file.

**Files:**
- Modify: `src/pages/admin/BatchDetail.tsx`
- Create: `src/components/batch/BatchHeader.tsx`
- Create: `src/components/batch/BatchOperationsTable.tsx`
- Create: `src/components/batch/BatchRequirements.tsx`
- Create: `src/components/batch/BatchSplitDialog.tsx`

- [ ] **Step 1: Read BatchDetail.tsx and identify extractable sections**

Read the full file. Identify:
- Header/status section → `BatchHeader`
- Operations table/list → `BatchOperationsTable`
- Requirements section → `BatchRequirements`
- Split dialog → `BatchSplitDialog`

- [ ] **Step 2: Extract BatchHeader**

Move the batch info display (status badge, customer, dates, action buttons) into a focused component. Props: `batch`, `onStatusChange`, `onDelete`.

- [ ] **Step 3: Extract BatchOperationsTable**

Move the operations list/table into its own component. Props: `batchId`, `operations`, `onOperationClick`.

- [ ] **Step 4: Extract BatchRequirements**

Move material requirements section. Props: `batchId`, `requirements`, `onCreateRequirement`.

- [ ] **Step 5: Extract BatchSplitDialog**

Move the batch split dialog. Props: `batch`, `open`, `onClose`, `onSplit`.

- [ ] **Step 6: Rewrite BatchDetail as composition**

BatchDetail.tsx becomes a layout shell that composes the sub-components. Target: under 150 lines.

- [ ] **Step 7: Run build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/pages/admin/BatchDetail.tsx src/components/batch/
git commit -m "refactor: extract BatchDetail into focused sub-components"
```

---

## Task 6: Extract Sub-Components from OperatorView (686 lines)

**Why:** Same pattern as BatchDetail — operator tablet UI doing too much in one file.

**Files:**
- Modify: `src/pages/operator/OperatorView.tsx`
- Create: `src/components/operator/OperatorViewHeader.tsx`
- Create: `src/components/operator/OperatorWorkList.tsx`
- Create: `src/components/operator/OperatorTimingPanel.tsx`

- [ ] **Step 1: Read OperatorView.tsx and identify sections**

Map the component structure: header, work queue/list, timing panel, any dialogs.

- [ ] **Step 2: Extract OperatorViewHeader**

Status bar, operator name, shift info.

- [ ] **Step 3: Extract OperatorWorkList**

The operation list/queue the operator works through.

- [ ] **Step 4: Extract OperatorTimingPanel**

Time tracking controls and display.

- [ ] **Step 5: Rewrite OperatorView as composition**

Target: under 150 lines.

- [ ] **Step 6: Run build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/pages/operator/OperatorView.tsx src/components/operator/
git commit -m "refactor: extract OperatorView into focused sub-components"
```

---

## Task 7: Add Test Coverage for Critical Hooks

**Why:** 28 test files for 30 hooks and 167 components is dangerously thin. Agents need tests as guardrails — without them, a refactor can silently break behavior. Focus on the hooks that are most-used and least-tested.

**Files:**
- Create: `src/hooks/useFeatureFlags.test.ts`
- Create: `src/hooks/useExceptions.test.ts`
- Create: `src/hooks/useCADProcessing.test.ts`
- Create: `src/hooks/useBatches.test.ts`
- Create: `src/hooks/useProductionMetrics.test.ts`
- Create: `src/hooks/useQualityMetrics.test.ts`

- [ ] **Step 1: Write useFeatureFlags tests**

Test that feature flags correctly gate on tenant plan. Mock useAuth to return different plan levels (free, pro, premium, enterprise) and verify the flag evaluations.

- [ ] **Step 2: Write useExceptions tests**

Test exception fetching and filtering by profile tenant.

- [ ] **Step 3: Write useBatches tests**

Test batch CRUD operations, especially the 13 useAuth references in this file — verify tenant isolation.

- [ ] **Step 4: Write useProductionMetrics tests**

Test metric calculations with known inputs.

- [ ] **Step 5: Write useCADProcessing tests**

Test CAD file processing hooks — mock the session from useAuth, verify file URL generation and processing state machine.

- [ ] **Step 6: Write useQualityMetrics tests**

Test quality metric aggregations.

- [ ] **Step 7: Run full test suite**

Run: `npm run test:run`
Expected: All new + existing tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/*.test.ts
git commit -m "test: add coverage for critical hooks (featureFlags, exceptions, batches, CAD, metrics)"
```

---

## Task 8: Agent Safety Guardrails

**Why:** After refactoring, lock in the new structure so agents don't re-create god-objects. Add lint rules and documentation that agents read before making changes.

**Files:**
- Modify: `.agents/README.md` (add refactoring guidelines)
- Modify: `docs/CONVENTIONS.md` (add module size limits)

- [ ] **Step 1: Add module size conventions to CONVENTIONS.md**

Add a "Module Boundaries" section:
```markdown
## Module Boundaries

| Rule | Limit |
|------|-------|
| Max lines per component | 400 |
| Max lines per hook | 200 |
| Max lines per utility module | 300 |
| Max functions per class | 10 |
| Max imports of a single hook | 30 (split if exceeded) |

When a file exceeds these limits, decompose it before adding new functionality.
```

- [ ] **Step 2: Add agent refactoring guidelines to .agents/README.md**

Add a "Refactoring Rules" section:
```markdown
## Refactoring Rules

- **Before adding to a large file:** Check line count. If over the limit, extract first.
- **Before changing a shared hook:** Check import count with grep. If >30 importers, add a focused selector hook instead of modifying the original.
- **Prefer composition over modification:** Extract new sub-components rather than adding more logic to existing ones.
- **Test before and after:** Run `npm run test:run` before starting and after every commit.
- **Use focused hooks:** Import `useProfile`, `useTenant`, `useSession` instead of `useAuth` for new code.
```

- [ ] **Step 3: Commit**

```bash
git add .agents/README.md docs/CONVENTIONS.md
git commit -m "docs: add agent safety guardrails — module size limits and refactoring rules"
```

---

## Execution Order

Tasks are independent except where noted:

| Task | Depends On | Parallelizable With |
|------|-----------|-------------------|
| 1: Split useAuth | — | 3, 4 |
| 2: Migrate consumers | 1 | — |
| 3: Decompose Scheduler | — | 1, 4 |
| 4: Decompose STEPViewer | — | 1, 3 |
| 5: Extract BatchDetail | — | 6 |
| 6: Extract OperatorView | — | 5 |
| 7: Test coverage | 1, 2, 3 | — |
| 8: Agent guardrails | 7 | — |

**Recommended parallel groups:**
- **Wave 1:** Tasks 1, 3, 4 (independent core refactors)
- **Wave 2:** Task 2 (depends on Task 1)
- **Wave 3:** Tasks 5, 6 (independent page decompositions)
- **Wave 4:** Task 7 (test coverage for all new modules)
- **Wave 5:** Task 8 (documentation guardrails)
