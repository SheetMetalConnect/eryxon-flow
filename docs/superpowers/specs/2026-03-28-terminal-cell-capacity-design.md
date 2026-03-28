# Terminal Cell Column — POLCA Capacity Signal

**Date:** 2026-03-28
**Issue:** #504

## Problem

The Cell column in the operator terminal shows only the current cell name as a static badge. Operators have no visibility into where the job goes next or whether the downstream cell can handle more work.

## Solution

### 1. Cell Column → POLCA Signal

Replace the static cell badge with a smart cell indicator:

- **Colored dot** (cell's own color) + **cell name** + **POLCA signal icon**
- Signal is binary:
  - **▶ GO** — next cell has capacity, safe to send work
  - **‖ PAUSE** — next cell is at or over capacity
  - No icon if no `wip_limit` configured on next cell
- Context varies by queue section:
  - "In Process" / "In Buffer" → shows **next cell** in routing (where it goes after this step)
  - "Expected" → shows **current cell** (where it is now, upstream)
- If last operation (no next cell) → just show current cell, no signal

### 2. Backlog Status Column

New column showing schedule adherence:
- Past due date → red indicator
- Based on existing `getDueUrgency()` logic

### Data Query

Standalone component with own `useQuery` (FlowCell pattern):
1. Fetch all operations for the part, ordered by `sequence`
2. Find the next operation after current one → get its `cell_id`
3. Fetch next cell metadata (name, color, wip_limit)
4. Count non-completed operations in next cell = current WIP
5. Compare against `wip_limit` → GO or PAUSE

### Files

| File | Change |
|------|--------|
| `src/components/terminal/TerminalCellInfo.tsx` | New standalone POLCA cell component |
| `src/components/terminal/JobRow.tsx` | Replace cell `<td>`, add backlog status column |
| `src/components/operator/OperatorWorkQueue.tsx` | Add backlog status header |
