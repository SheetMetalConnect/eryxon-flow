---
title: Operator Manual
description: How to use Eryxon Flow as an operator — work queue, terminal, time tracking.
---

This manual covers everything you need to work with Eryxon Flow on the shop floor. Two main interfaces exist: the **Work Queue** for desktop use and the **Terminal** for dedicated workstation screens. Both show the same work — just presented differently.

## Work Queue (Kanban)

The Work Queue (`/work-queue`) is your default view after logging in. It displays operations as cards on a kanban board.

### Layout

Each **column** represents a cell (work center) in the shop. Cards inside a column are the operations waiting or in progress at that cell. Column headers show totals: hours of work queued, number of pieces, and how many rush jobs are in the column.

### Reading a card

Every card shows:

- **Job number** and part name
- **Operation** name (e.g. "Kanten", "Lassen")
- **Material** type and thickness
- **Estimated hours**
- **Due date** with urgency coloring — overdue stands out immediately

### Finding your work

- **Search** by job number, part name, or customer
- **Filter** by cell, material, status, or rush priority
- **Sort** by due date, priority, or hours

If you see nothing: check that your filters are cleared. If still empty, no work has been assigned to your cell yet.

### Card badges

- **Rush** (red) — this job has priority over everything else. Rush jobs sort to the top automatically.
- **Hold** (yellow) — this operation is paused. Do not start work on it until the hold is removed.

### Detail panel

Click any card to open the detail panel on the right side. Here you see:

- Full part information (customer, quantity, material, dimensions)
- Complete routing — every operation in sequence, with your current step highlighted
- Attached files: 3D model viewer for STEP files, PDF viewer for drawings
- Rush and hold toggles — you can flag an operation as rush or place a hold directly from this panel
- Time tracking controls (start, pause, stop)

## Terminal View

The Terminal (`/operator/terminal`) is built for dedicated screens at a workstation. It works well on touch devices and tablets. Use it when you are stationed at one cell for your shift.

### Getting started

Pick your cell from the **cell selector** at the top. The terminal then shows only work for that cell, split into three queues:

- **In Process** (green) — operations you are actively working on right now
- **In Buffer** (blue) — the next operations ready to start, already physically at your cell
- **Expected** (amber) — upcoming work that will arrive at your cell soon

### Status bar

The bar at the top of the screen shows:

- Your name and selected cell
- The operation you are currently working on
- A running timer since you started
- Color-coded state: green while working, yellow when paused, grey when idle

### POLCA cell signals

Below each operation, you see a signal showing the **current cell to next cell** relationship. This is the POLCA capacity system:

- **GO** (green) — the next cell in the routing has capacity. You can complete your operation and the part will flow smoothly.
- **PAUSE** (red/yellow) — the next cell is full. Finishing your operation now would create a pile-up. Wait for capacity to free up, or talk to your supervisor.

This prevents bottlenecks. The system manages work-in-progress limits automatically.

### Backlog status

Operations in your queue show a backlog label:

- **Te laat** — overdue, should have been done already
- **Vandaag** — due today
- **Binnenkort** — due soon, within the planning window

### Detail sidebar

Tap any operation to open the sidebar on the right:

- **3D viewer** — rotate and zoom the part model (if a STEP file is attached)
- **PDF viewer** — view the technical drawing
- **Routing** — see the full sequence of operations, where you are, and where the part goes next

## Time Tracking

Time tracking ties your work to each operation. The rules are simple.

### How it works

1. **Start** — tap "Start" on the operation you are about to work on. The timer begins and the operation moves to "In Process."
2. **Pause** — tap "Pause" for breaks, interruptions, or when you need to step away. Pause time is excluded from your tracked hours.
3. **Stop** — tap "Stop" when the physical work is done. Then mark the operation as complete to move it to the next cell.

Only **one operation** can be timed at a time. Starting a new operation stops the previous one.

The running timer is always visible in the status bar so you never forget to stop it.

### Effective time

Your logged time is calculated as: total elapsed time minus total pause time. This is what shows up in reports.

## Reporting Issues

When something goes wrong — wrong material, damaged part, machine problem, drawing error — report it immediately.

### Steps

1. Open the operation detail (from either Work Queue or Terminal)
2. Tap **Report Issue**
3. Pick a severity:
   - **Low** — minor, does not block work
   - **Medium** — needs attention but you can continue
   - **High** — blocks this operation
   - **Critical** — safety risk or major production stop
4. Describe the problem in a few sentences
5. **Add photos** — take a picture with your phone or tablet camera. Photos make it much easier for supervisors to assess the situation without walking over.
6. Submit

The issue is logged against the operation and visible to supervisors and planners immediately.

## Tips for your first day

- Always start your timer before you begin physical work.
- Pause the timer during breaks. Forgetting to pause inflates your hours.
- Check the POLCA signals before completing an operation. If the next cell shows PAUSE, ask your supervisor what to do.
- Report issues the moment you spot them. A photo is worth a thousand words.
- If your screen looks empty, clear all filters first.
