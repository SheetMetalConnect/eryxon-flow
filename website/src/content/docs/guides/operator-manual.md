---
title: "Operator Manual"
description: "Complete guide for machine operators using Eryxon Flow."
---

## Daily Workflow

1. **Login** → Redirected to Work Queue
2. **Select Operation** → Click to open details
3. **Start Timing** → Begin tracking your work
4. **Work on Operation** → Pause if needed
5. **Report Issues** → If problems occur (with photos)
6. **Stop Timing** → When finished
7. **Mark Complete** → Move to next operation

## Work Queue

Your main page is the **Work Queue** (`/work-queue`). It shows operations assigned to you.

**Tip:** If you don't see any operations:
1. Check if work has been assigned to you.
2. Clear all filters.
3. Check **My Activity** to see if you've already completed them.

## Operator Terminal

The **Operator Terminal** (`/operator/terminal`) provides a specialized interface for production work.

### Interface Overview

**Left Panel (Job List):**
- **In Process** (Green) - Currently active operations
- **In Buffer** (Blue) - Next 5 operations ready to start
- **Expected** (Amber) - Upcoming work in queue

**Right Panel (Detail View):**
- Job details (customer, quantity, due date)
- Current operation and controls (Start/Pause/Complete)
- **QRM Features:**
  - **Next Cell** - Shows which cell the part moves to after current operation
  - **Capacity Status** - Real-time WIP (Work-In-Progress) for next cell
    - 🟢 Green: Available capacity
    - 🟡 Yellow: Warning (80%+ full)
    - 🔴 Red: At capacity (blocked)
  - **Routing Visualization** - Visual flow showing all cells in the job routing
  - **Capacity Blocking** - Complete button disabled if next cell is at capacity (when enforced)
- 3D model viewer (if STEP file attached)
- PDF drawing viewer (if drawing attached)
- Operations list showing full routing sequence

### QRM Capacity Management
The terminal uses default **QRM (Quick Response Manufacturing)** logic:
- **"Next cell at capacity"**: Means the next stage in production is full.
- This prevents bottlenecks.
- If blocked: Wait for capacity, Contact supervisor, or Pause timer.

## Time Tracking

**Starting:**
- Click **"Start Timing"**.
- This creates a `time_entry` and sets status to `in_progress`.
- **Note:** Only one operation can be timed at once.

**Pausing:**
- Click **"Pause"** for breaks.
- Pause time is excluded from your performance metrics.
- `Effective Time = (Stop Time - Start Time) - Total Pause Time`

**Stopping:**
- Click **"Stop Timing"** when finished physically working.
- Click **"Mark Complete"** to send it to the next stage.

## Reporting Issues

1. Click **"Report Issue"** in operation detail.
2. Select severity (Low, Medium, High, Critical).
3. Add description of the problem.
4. **Upload Solution/Photos** (Recommended).
5. Submit.

## Best Practices

- **Always start timing** before you begin work.
- **Pause timer** during breaks or interruptions.
- **Report issues immediately** when they occur.
- **Take photos** of issues for documentation.
- **Mark operations complete** as soon as finished (unless blocked by QRM).
