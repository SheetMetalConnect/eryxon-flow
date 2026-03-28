---
title: Admin Manual
description: How to manage production in Eryxon Flow — jobs, cells, scheduling, quality.
---

This guide covers everything a production manager or planner needs to run day-to-day operations in Eryxon Flow. It assumes your account has admin access.

## Dashboard

The dashboard is your starting screen. It shows:

- **Active operators** — who is logged in and working right now.
- **Pending issues** — quality problems reported from the shop floor, waiting for your review.
- **WIP per cell** — how many operations are active in each production cell, against the cell's WIP limit.
- **Due dates** — upcoming deadlines across all active jobs, sorted by urgency.

All data updates in real time. When an operator scans a start or finish on the terminal, the dashboard reflects it within seconds.

## Managing Jobs

### Job hierarchy

Every job follows the same structure: **Job > Parts > Operations**.

- A **job** represents a customer order or internal project. It holds the customer name, job number, and due date.
- A **part** is a physical item to produce. Each part has a material, quantity, and drawing reference.
- An **operation** is a single production step on a part — cutting, bending, welding, painting, etc. Operations are linked to a production cell and have an estimated time.

### Creating a job

1. Go to **Jobs** and click **Create New Job**.
2. Fill in the job number, customer, and due date.
3. Add one or more parts. For each part, set the part number, material, and quantity.
4. Add operations to each part. For each operation, select the cell, set the estimated time, and define the sequence order.

You can also use `Cmd/Ctrl + N` from anywhere to open the quick-create menu.

### Rush orders (bullet card)

When a part needs to jump the queue, mark it as a **bullet card** (rush). This does three things globally:

- The part moves to the top of every table and work queue, across all cells.
- Operators see a clear rush indicator on their terminal.
- The part stays prioritized until you remove the rush flag.

Use this sparingly. If everything is rush, nothing is.

### Putting operations on hold

You can place any operation on hold from the operation detail panel. A held operation stays visible in the work queue but is marked with a hold badge so operators know not to start it. Resume it when the block is cleared.

## Production Cells (Stages)

Cells represent your physical workstations or departments — laser cutting, press brake, welding, assembly, shipping.

### Configuring a cell

Go to **Stages & Cells** in the admin sidebar. For each cell, you can set:

- **Name** — what operators see on the terminal (e.g., "Laser 1", "Kantbank").
- **Color** — used throughout the interface for visual identification.
- **Icon** — appears on the terminal and in the capacity matrix.
- **Sequence** — the default order cells appear in views and scheduling.

### WIP limits

Each cell has a WIP (Work In Progress) limit. This controls how many operations can be active simultaneously.

- **Warning threshold** — the interface highlights the cell when it approaches the limit.
- **Enforce limit** — when enabled, the system blocks the previous operation from completing if the next cell is at capacity. This prevents work from piling up at a bottleneck.

Set WIP limits based on your actual station capacity. Start conservative and adjust based on what you observe.

### Capacity hours

Define how many production hours each cell has per day. The scheduler uses this to calculate load and flag overcommitted days.

## Scheduling and Capacity

### Auto-scheduler

The auto-scheduler allocates operations to time slots based on:

- Operation sequence within each part.
- Estimated hours per operation.
- Cell capacity per day.
- Job due dates.

Run the scheduler after adding new jobs or when priorities change. It recalculates the full schedule and updates the capacity matrix.

### Capacity matrix

The capacity matrix gives you a bird's eye view of load per cell per day. Each cell shows as a row, each day as a column. Color coding indicates available, loaded, and overcommitted states.

Use this to spot bottlenecks before they hit the shop floor. If a cell shows red three days out, you know to act now — move work, add a shift, or adjust due dates.

### Due date overrides

When a customer changes their deadline, update the due date on the job. The scheduler picks up the change on its next run.

### Factory calendar

The factory calendar defines working days and holidays. The scheduler skips non-working days automatically. Configure this in **Settings** before running your first schedule.

## Batch Management

Batches group operations for nesting or combined processing — common in laser cutting where multiple parts share the same sheet.

### Working with batches

1. Create a batch and give it a name or number.
2. Assign operations from different parts to the batch.
3. Track material allocation for the batch.

When an operator processes a batch, all included operations progress together.

## Assignments and Users

### Assigning work

Go to the **Assignments** page to assign specific operations to operators. Select the part, choose the operator, and confirm. The assignment appears in the operator's work queue immediately.

You can also let operators self-assign from available work in their cell.

### Roles

- **Admin** — full access to all settings, jobs, scheduling, data, and user management.
- **Operator** — access to their work queue, the terminal, and issue reporting. Operators cannot modify jobs, change schedules, or access settings.

Manage users in **Settings > Users**.

## Quality and Issues

Operators report issues directly from the terminal — wrong material, damaged parts, missing drawings, machine problems.

### Reviewing issues

1. Go to the **Issues** page.
2. Each issue shows the part, operation, operator, and description.
3. Choose an action:
   - **Approve** — confirms it is a valid issue. Logs it for quality tracking.
   - **Reject** — not actually an issue. Add a note explaining why.
   - **Close** — the issue has been resolved. Add resolution notes.

Respond to issues quickly. Unresolved issues block operators and slow production.

### Scrap reasons

Configure scrap reason codes in **Scrap Reasons** settings. Each reason has a code, description, and category (Material, Process, Equipment, Operator, Design). The page shows usage statistics so you can see which problems occur most often.

## Data and Integration

### CSV import

Import jobs, parts, and operations from CSV files. This is useful for migrating from spreadsheets or receiving structured data from your ERP. The import screen validates data before committing.

### API keys

Generate API keys in **Settings > API Keys** for external system integration. Each key is scoped to your tenant and can be revoked at any time.

### Webhooks

Configure webhooks in **Settings > Webhooks** to push events to external systems. Available events include:

- `operation.started` — an operator began work.
- `operation.completed` — an operator finished work.
- `issue.created` — a quality issue was reported.

### Data export

Go to **Data Export** in the admin sidebar. You can export all records as JSON or CSV. CSV is typically faster for large datasets. Exports include all database records and metadata but exclude file attachments (only paths) and API secrets (only prefixes).

Large exports can take 30-60 seconds. Run them during quiet hours if possible.
