---
title: "Scheduling & Capacity"
description: "Auto-schedule operations across production cells with capacity-aware planning."
---

Eryxon MES includes a simple capacity-based scheduler for planning operations across your production cells. It allocates work based on cell capacity and your factory calendar—not a full APS optimizer, but enough to get a clear capacity overview and planned dates on every operation.

## How It Works

1. **Click Auto Schedule** on the Capacity Matrix page
2. The scheduler fetches all incomplete jobs and their operations
3. Jobs are sorted by due date (respecting any manual overrides)
4. Operations are allocated to their assigned cells day by day, respecting daily capacity limits
5. `planned_start` and `planned_end` dates are saved on each operation

If operations already have planned dates, a confirmation modal warns you before overwriting.

## Key Concepts

### Cell Capacity

Each cell (work center) has a `capacity_hours_per_day` setting, configured in **Admin → Stages & Cells**. The scheduler never exceeds this daily limit—large operations overflow to subsequent working days.

### Factory Calendar

Navigate to **Admin → Factory Calendar** to configure:

- **Holidays** — No work scheduled (capacity = 0)
- **Closures** — Factory closed (capacity = 0)
- **Half days** — Reduced capacity (multiplier = 0.5)
- **Working days** — Full capacity

Calendar entries override the default Monday–Friday working week.

### Due Date Overrides

Admins can override a job's due date without changing the original ERP-provided date. The scheduler uses the override when prioritizing which jobs to schedule first. Override a due date from the Jobs list by clicking the calendar icon.

### Capacity Matrix

The Capacity Matrix page at **Admin → Capacity Matrix** shows:

- Cell utilization by date in a color-coded grid
- **Green** ≤50% · **Yellow** ≤80% · **Orange** ≤100% · **Red** overloaded
- Click any cell/date to see which operations are allocated

## Limitations

- Operations are scheduled in job due date order, not optimized for throughput
- No cross-job dependency tracking
- Only cell capacity is considered, not worker availability or materials
- No what-if scenario simulation

For complex scheduling needs, use a dedicated APS tool and sync dates via the [REST API](/docs/architecture/connectivity-rest-api) or [CSV Import](/docs/features/csv-import).
