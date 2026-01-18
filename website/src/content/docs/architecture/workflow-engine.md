---
title: "Workflow Engine"
description: "Core manufacturing workflows and production execution logic."
---

Core production workflows from job creation through completion.

See also: [Database Schema](/architecture/database/), [3D Viewer](/guides/3d-viewer/), [Operator Manual](/guides/operator-manual/)

## Manufacturing Job Lifecycle

### Phase 1: Job Creation

**Process:** `/admin/jobs/new` (Admin only)

1. **Job Details**: Job number, customer, due date, notes, custom metadata.
2. **Add Parts**: Part number, material, quantity, parent part (for assemblies), images/drawings.
3. **Add Operations**: Operation name, cell/stage, estimated time, sequence, notes.

### Phase 2: Work Assignment

**Process:** `/admin/assignments` (Admin only)

Admin assigns parts to operators. Operator now sees this part's operations in their Work Queue.

### Phase 3: Production Execution

**Process:** `/work-queue` (Operator)

1. **View Operation**: Details, notes, drawings.
2. **Start Work**: Click "Start Timing". Timer begins, status → `in_progress`.
3. **During Work**: Pause/resume, report issues, view 3D CAD, check substeps.
4. **Complete Work**: Stop timing, duration recorded. Mark complete.

### Phase 4: Job Completion

When the last operation on a part completes, the part status automatically becomes `completed`. When all parts in a job complete, the job status becomes `completed`.

---

## Operations & Time Tracking

### Time Tracking System

1. **time_entries**: `start_time`, `end_time`, `duration`, `operator_id`, `operation_id`.
2. **time_entry_pauses**: `paused_at`, `resumed_at`, `duration`.

### Starting Time Tracking

When an operator starts timing, the system:
1. Stops any existing active time entry for that operator.
2. Creates a new `time_entry` record.
3. Updates operation, part, and job statuses.
4. Sets part's `current_cell_id`.

### Stopping Time Tracking

The system calculates total duration minus pause time and updates the operation's `actual_time`.

---

## QRM Capacity Management

**Quick Response Manufacturing (QRM)** helps prevent bottlenecks by limiting work-in-progress (WIP) at each cell.

### Configuration

Each cell/stage has:
- **WIP Limit**: Max jobs allowed.
- **WIP Warning Threshold**: When to show warnings.
- **Enforce Limit**: If enabled, blocks completion if the next cell is full.

### Visual Indicators

- 🟢 **Green**: Available capacity.
- 🟡 **Yellow**: Approaching limit.
- 🔴 **Red**: At capacity.

---

## Issue Management

- **Operator**: Reports issues (severity: low to critical) with optional photos.
- **Admin**: Reviews, approves, rejects, or closes issues.
- **Visuals**: Issue badges show status on operation cards and part details.

---

## Assembly Management

**Purpose**: Track multi-level part hierarchies (Parent/Child relationships).

- **Validation**: Prevents circular references and cross-job assemblies.
- **Operations**: Each part (parent or child) can have its own routing.

---

## Production Quantity & Scrap Tracking

Track actual production (good vs. scrap) with categorized scrap reasons:
1. **Material**
2. **Process**
3. **Equipment**
4. **Operator**
5. **Design**
6. **Other**

---

## Substeps & Templates

Break complex operations into smaller tasks.
- **Templates**: Reusable checklists (e.g., "Laser Cutting Checklist").
- **Checklist**: Operators must complete all substeps before finishing an operation.

---

## Operator Terminal

A streamlined, tablet-optimized interface (`/operator/terminal`) that provides:
- **Job List**: Grouped by In Process, In Buffer, and Expected.
- **QRM Integration**: Real-time capacity visibility for the next cell.
- **Visual Routing**: Flowchart showing the production path.
- **Media**: Integrated 3D CAD viewer and PDF drawing viewer.
