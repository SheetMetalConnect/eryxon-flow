---
title: QRM & Flow Control
description: How Eryxon Flow uses Quick Response Manufacturing to keep work moving through your shop.
---

Work piles up between stations. Bottlenecks form. Due dates slip. Sound familiar? In a job shop, the biggest time waster isn't the cutting or bending itself — it's the waiting in between. Parts sit in queues while someone figures out what's next, or the next cell is already overloaded.

Eryxon Flow tackles this with **Quick Response Manufacturing (QRM)** principles baked into the terminal and planning screens. The goal is simple: reduce the time work spends *not* being worked on.

## The POLCA Principle

POLCA (Paired-cell Overlapping Loops of Cards with Authorization) is a flow control method designed for job shops — environments where every order follows a different route through different cells.

The core idea: **only release work to a cell if that cell can absorb it.**

In traditional shops, work gets pushed downstream regardless of what's happening there. That creates piles. POLCA flips this: before you start an operation, check whether the *next* cell in the routing has capacity. If it does, go. If not, work on something else.

This prevents the classic job shop failure mode: every cell is busy, but nothing gets *finished* because half-done work is stuck everywhere.

## How Eryxon Implements This

### WIP Limits Per Cell

Each cell (work center) has an optional **WIP limit** — the maximum number of operations that should be active or queued there at once. Configure this in **Admin > Stages & Cells**.

When a cell approaches or exceeds its WIP limit, the terminal shows a clear signal:

- **GO** (green) — next cell has capacity, start this work
- **PAUSE** (red) — next cell is full, pick something else

These signals appear on every operation row in the terminal, showing the next cell in that part's routing along with its current load. Operators don't need to walk the floor or call ahead — the information is right there.

### Terminal Queue Sections

The operator terminal splits work into three sections:

- **Process** — operations actively being worked on in this cell (highlighted)
- **Buffer** — operations waiting in queue at this cell, ready to start
- **Expected** — operations still at an upstream cell that will arrive here next

Each section shows **total hours** and **piece counts**, so operators and planners can see the real workload at a glance — not just a count of jobs, but how many hours of work is actually queued.

### Rush Orders (Bullet Card)

Some jobs can't wait. When a job is flagged as a **rush order** (internally called "bullet card"), it jumps to the top of every queue it touches — globally, across all cells.

Rush jobs are visually distinct: red left border, lightning icon, sorted first in every list. In the admin Jobs and Parts tables, rush orders always float to the top regardless of other sort criteria.

Use rush sparingly. If everything is a rush, nothing is.

### On Hold

Sometimes work needs to pause — waiting for material, customer clarification, a tooling issue. Instead of removing the operation or losing track of it, mark it **on hold**.

On-hold operations stay visible in the queue but don't count against WIP limits and won't be picked up by operators as available work. When the issue is resolved, take it off hold and it returns to the queue in its original position.

### Capacity Matrix

The **Capacity Matrix** (Admin > Capacity Matrix) gives a bird's-eye view of all cell load across your planning horizon:

- Color-coded grid: **green** (under 50%), **yellow** (under 80%), **orange** (near capacity), **red** (overloaded)
- Click any cell/date combination to see exactly which operations are allocated there
- Run **Auto Schedule** to distribute unplanned operations across cells based on due dates and daily capacity

This is where planners spot problems before they happen — a red cell next Tuesday means you need to act now, not when parts start piling up.

## What This Means in Practice

A foreman looking at the terminal sees:

1. Which jobs to work on (buffer section, sorted by due date, rush first)
2. Whether the next cell can take the work (GO/PAUSE signal)
3. How much work is queued (hours and pieces per section)
4. What's coming next from upstream (expected section)

No guessing. No walking to the next station to check. No releasing work that's just going to sit in a pile.

The result: shorter lead times, fewer bottlenecks, and due dates that actually hold. Not because you're working faster — because you're working on the right things in the right order.

## Limitations

- POLCA signals are based on operation count against WIP limits, not on estimated hours
- WIP limits are per-cell, not per cell-pair (simplified from academic POLCA)
- The system shows signals and information — it doesn't block operators from starting work against a PAUSE signal
- Rush orders override flow control by design; too many rush orders will defeat the purpose

For more on capacity planning, see [Scheduling & Capacity](/features/scheduling/).
