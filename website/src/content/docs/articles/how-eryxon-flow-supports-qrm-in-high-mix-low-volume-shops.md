---
title: How Eryxon Flow supports QRM in high-mix, low-volume shops
description: Quick Response Manufacturing works when the shop can see routing, control WIP, and act on bottlenecks before queue time grows. Eryxon Flow supports that with cell-based queues, next-cell signals, and a practical capacity view.
head:
  - tag: meta
    attrs:
      property: og:image
      content: /social/blog/how-eryxon-flow-supports-qrm-in-high-mix-low-volume-shops/og.svg
  - tag: meta
    attrs:
      name: twitter:image
      content: /social/blog/how-eryxon-flow-supports-qrm-in-high-mix-low-volume-shops/linkedin.svg
---

High-mix shops rarely lose lead time in one dramatic failure. They lose it a little at a time between cells.

A part finishes at laser, but brake is already stacked. Welding starts what it can see, not what should move next. Assembly waits on work that is technically in progress but practically stuck in a queue somewhere upstream. Everyone is busy, yet jobs still feel late.

That is the kind of problem **Quick Response Manufacturing (QRM)** is meant to attack. The goal is not to keep every machine maximally occupied. The goal is to reduce the time work spends waiting, especially in the handoff between one cell and the next.

Eryxon Flow supports that approach with shop-floor signals that are already documented publicly: cell-based kanban queues, visible routing, WIP limits, next-cell capacity checks, and a capacity matrix that helps planners spot bottlenecks before they hit the floor.

## QRM starts with the handoff between cells

In a high-mix, low-volume environment, work does not follow one simple route. One job might go laser to brake to weld. Another might skip welding entirely. Another may split into multiple parts and rejoin later at assembly.

That is why queue control matters more than a perfect master schedule. If operators cannot quickly see what is ready, what comes next, and whether the downstream cell can absorb more work, the shop starts pushing work forward blindly. That is where lead time stretches.

Eryxon Flow is built around **cells** and **production stages** rather than generic task lists. The public introduction already describes a kanban-style work queue where operators pull work by stage, not by reading through office-oriented screens. That matters for QRM because the route through the shop has to stay visible where pickup happens.

## What operators see at pickup

The QRM & Flow Control documentation shows a simple rule at the center of Eryxon Flow's operator workflow: before releasing more work downstream, check whether the next cell has room to take it.

On each operation row, Eryxon Flow can show a next-cell signal:

- **GO** when the downstream cell has room
- **PAUSE** when that cell is already at capacity

That is not abstract planning theory. It is a practical pickup signal an operator or lead can act on in the queue.

The same QRM page also documents three queue sections on the terminal:

- **Process** for work currently being run in the cell
- **Buffer** for work ready to start in that cell
- **Expected** for work still upstream that is likely to arrive next

For a high-mix shop, that is important because the question is not only "what is on my machine now?" It is also "what is about to land here next?" and "should I finish this operation if the next cell is already stacked?" Eryxon Flow puts that context into the queue itself instead of leaving it to floor walking or verbal coordination.

## How Eryxon controls WIP without pretending to be an APS system

QRM falls apart when every cell is allowed to build an unlimited local queue. Eryxon Flow addresses that with **WIP limits per cell**.

The admin manual documents cell settings for:

- warning thresholds as a cell approaches its WIP limit
- enforced WIP rules that can block a previous operation from completing when the next cell is full
- daily capacity hours per cell for planning

This is the practical layer behind the operator-facing GO or PAUSE signal. The shop can decide how much work a cell should realistically absorb, then make that limit visible in execution.

Just as important, the public docs are careful about the boundary. Eryxon Flow includes a **simple capacity-based scheduler** and a **capacity matrix**, not a full APS optimizer. Scheduling is based on due dates, operation sequence, working days, and daily cell capacity. The product does not claim complex what-if simulation or full optimization logic.

That restraint is useful. For many fabrication shops, the immediate problem is not the lack of a mathematically perfect schedule. It is the lack of a clear flow-control layer between cells.

## The planning view that supports the floor

QRM needs more than good operator intent. Planners and supervisors need a view that shows where queue pressure is building before the shop feels it.

Eryxon Flow's Capacity Matrix is the planning-side proof point. The public scheduling and admin docs describe a color-coded cell-by-day view that shows where a cell is underloaded, near capacity, or overloaded. Planners can click into a cell and date to see allocated work, then decide whether to move work, add hours, adjust due dates, or change priorities.

That is the right level of support for a QRM workflow:

- operators can see whether the next cell can take the work
- leads can see what is buffered and expected in each cell
- planners can see bottlenecks before they become piles on the floor

The point is not to centralize every decision. The point is to make flow problems visible early enough that the shop can respond.

## What this helps a high-mix shop improve

Eryxon Flow does not guarantee shorter lead times on its own. Shops still need sensible cell definitions, realistic WIP limits, and disciplined handling of rush work.

What the product does provide is a tighter operating loop for QRM-style execution:

- routing remains visible across cells
- operators get a direct signal about downstream capacity
- queues are organized around process, buffer, and expected work
- planners get a live capacity overview instead of waiting for backlog to become obvious

That is a practical fit for custom fabrication teams trying to reduce waiting time between steps without rolling out a heavyweight planning program first.

## Proof

Every claim above is grounded in public product docs already on the site:

- [Introduction](/introduction/) for stage-based queues and built-in QRM framing
- [QRM & Flow Control](/features/qrm-flow/) for GO or PAUSE signals, queue sections, and WIP behavior
- [Admin Manual](/guides/admin-manual/) for cell settings, warning thresholds, enforced WIP limits, and daily capacity hours
- [Scheduling & Capacity](/features/scheduling/) for the capacity matrix and the product's explicit scheduling boundaries

## Where to go next

If you want to see how your own cells, queues, and bottlenecks would map into this flow, start with a [Managed Rollout](/managed-rollout/). That is the fastest way to test whether QRM-style control in Eryxon Flow fits the way your shop already runs.
