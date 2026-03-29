---
title: Core Concepts
description: Jobs, parts, operations, batches — what they are and how they connect.
---

Eryxon Flow tracks work through a simple hierarchy: **Job > Parts > Operations**. Everything in the system hangs off this structure.

## Job

A job is the top-level container. Every part must belong to a job — this is a hard requirement in the data model.

A job does not have to be a customer order. It can be anything that groups parts together:

- A customer order (most common in job shops)
- An internal production run
- A stock replenishment batch
- A prototype or R&D project
- A maintenance or rework order

The `customer` field is optional. The only required field is `job_number`.

| Field | Required | Example |
|-------|----------|---------|
| Job number | yes | WO-2026-0142 |
| Customer | no | Hygienisch Staal BV |
| Due date | no | 2026-05-15 |
| Status | auto | not_started, in_progress, completed |

A job has one or more parts. Rush priority is set at the part level, not the job level.

## Part

A part is a physical item to produce. Each part belongs to one job.

| Field | Example |
|-------|---------|
| Part number | FRAME-RVS-316L |
| Material | RVS 316L 3mm |
| Quantity | 4 |
| Rush (bullet card) | yes/no |
| Parent part | (for assemblies) |

Parts can have:

- **Files** — STEP models (shown in 3D viewer), PDF drawings, other attachments. Files attach to parts, not operations.
- **Child parts** — for assemblies, parts reference a parent part. The system shows assembly dependencies and warns operators when child parts are not yet complete.
- **Drawing number** and **CNC program name** — quick reference fields for the shop floor.
- **Dimensions** — length, width, height in mm, weight in kg.

## Operation

An operation is a single production step on a part. It is where actual work happens.

| Field | Example |
|-------|---------|
| Name | Lasersnijden |
| Cell | Laser 1 |
| Sequence | 1 (first step) |
| Estimated time | 120 minutes |
| Actual time | 95 minutes (tracked via start/stop) |
| Remaining | 25 minutes (estimated minus actual) |
| Status | not_started, in_progress, on_hold, completed |

Operations can have:

- **Metadata** — laser power, speed, gas type, CNC program name, bend angles
- **Substeps** — breakdown of the operation into smaller tasks (e.g. "load sheet", "run program", "deburr edges")
- **Time tracking** — operators start/stop a timer, actual time is recorded
- **Issues** — operators report problems with severity, description, and photos
- **Resources** — linked tooling, fixtures, molds needed for this step
- **On hold** — paused without losing queue position

When all operations on a part are completed, the part is done. When all parts in a job are done, the job is done.

## Batch

A batch groups operations from different parts that are processed together. The most common use: **laser nesting** — multiple parts cut from the same sheet.

| Field | Example |
|-------|---------|
| Batch number | NEST-2026-0301 |
| Type | laser_nesting |
| Material | S235 6mm |
| Sheet count | 2 |
| Cell | Lasersnijden |

Batches can have:

- **Nesting metadata** — sheet size (1500x3000), utilization percentage, CAM program reference
- **Nesting image** — upload of the nesting layout from the CAM software
- **Lifecycle** — draft > in_progress > completed. Start and stop can be triggered by an operator or by a machine (CAD/CAM integration via API).
- **Time distribution** — when a batch is completed, total production time is distributed across all included operations proportional to their estimated time.

## What can hold what

| Capability | Job | Part | Operation | Batch |
|------------|-----|------|-----------|-------|
| Status tracking | yes | yes | yes | yes |
| Due date | yes | — | planned start/end | — |
| Files (STEP, PDF) | — | yes | — | nesting image |
| Custom metadata (JSON) | yes | — | yes | nesting metadata |
| Notes | yes | — | yes | yes |
| Time tracking (est/actual) | — | — | yes | yes (distributed) |
| Rush priority | — | yes | — | — |
| On hold | — | — | yes | — |
| Substeps | — | — | yes | — |
| Issues / NCR | — | — | yes | — |
| Linked resources | — | — | yes | — |
| Parent-child (assembly) | — | yes | — | parent batch |
| ERP sync (external_id) | yes | yes | yes | — |
| Assigned operator | — | — | yes | — |
| Dimensions / weight | — | yes | — | — |
| Material / thickness | — | yes | — | yes |
| Drawing number | — | yes | — | — |
| CNC program name | — | yes | — | — |

Files (STEP models, PDF drawings) attach to **parts**, not jobs or operations. An operation inherits its files from the parent part. The 3D viewer and PDF viewer in the terminal show the files from the part the operation belongs to.

## Rush and On Hold

These are the two priority controls available to foremen and planners.

### Rush (bullet card)

Rush is set on a **part**. It propagates upward and outward:

- The part sorts first in every table and queue
- All operations on that part inherit the rush indicator
- If any part in a job is rush, the entire job shows as rush in the Jobs table
- The operator terminal highlights rush rows with a red border
- The operator status bar switches to a red-to-green stripe pattern when an operator is clocked on a rush operation
- Work queue kanban columns show a rush count badge

Toggle rush from the operation detail panel (the button sets it on the parent part) or from the Parts admin table.

Rush is a visual and sorting signal. It does not block or change scheduling logic — it tells humans "do this first."

### On Hold

On hold is set on an **operation**. It affects only that specific operation:

- The operation stays visible in queues but shows a hold badge
- Operators know not to start work on it
- The operation can still be edited and updated while on hold
- Resume the operation to return it to `not_started` status

On hold does not cascade. Putting one operation on hold does not affect other operations on the same part or job. Other operations continue normally.

Toggle on hold from the operation detail panel.

## Example: Welded Assembly with Nesting

A stainless steel food-grade cabinet. Two levels of sub-assemblies, with laser-cut parts nested across shared sheets.

**Job** — WO-2026-0142, customer: Precision Steel Ltd, due: 2026-05-15

**Parts and routing:**

| Part | Material | Qty | Parent | Operations |
|------|----------|-----|--------|------------|
| CABINET-ASSY | — | 1 | — | Assembly (180 min), QC (30 min) |
| FRAME-ASSY | — | 1 | CABINET-ASSY | TIG Weld (240 min), Pickling (90 min) |
| UPRIGHT-L | SS 316L 3mm | 2 | FRAME-ASSY | Laser cut (30 min), Bend (45 min) |
| UPRIGHT-R | SS 316L 3mm | 2 | FRAME-ASSY | Laser cut (30 min), Bend (45 min) |
| CROSS-BEAM | SS 316L 3mm | 4 | FRAME-ASSY | Laser cut (20 min), Bend (25 min) |
| LID | SS 304 2mm | 1 | CABINET-ASSY | Laser cut (15 min), Bend (20 min), Grind (30 min) |
| BASE-PLATE | S235 6mm | 1 | CABINET-ASSY | Laser cut (10 min) |

**Nesting batch** — NEST-0301: all seven laser cut operations grouped on two sheets (1500x3000, 87% utilization). One cut run, time distributed back to each operation.

**Assembly flow:**

1. Laser cuts all parts in one batch. Parts sorted after cutting.
2. Uprights and cross-beams go to bending, then to welding where FRAME-ASSY is built.
3. Operator starts FRAME-ASSY weld — system warns if child parts are incomplete. Operator can override.
4. After FRAME-ASSY, LID, and BASE-PLATE are done, CABINET-ASSY assembly starts. Same dependency check.
5. Quality inspection completes the job.

**Files:** STEP model and PDF drawing on each part. Assembly drawings on CABINET-ASSY and FRAME-ASSY.

**Metadata on operations:**

| Operation | Metadata |
|-----------|----------|
| Laser cut | `{"power": 4000, "speed": 12000, "gas": "N2", "program": "NEST-0301"}` |
| Bend | `{"bends": [90, 90, 135], "tool": "V16-88"}` |
| TIG Weld | `{"process": "TIG", "wire": "316L 1.0mm", "gas": "Argon", "cert_required": true}` |
| Assembly | `{"torque_specs": {"M8": 25, "M10": 45}}` |

## Querying via API

Every entity is accessible through the REST API. All requests use Bearer token auth:

```bash
AUTH="Authorization: Bearer ery_live_xxxxx"
BASE="https://your-project.supabase.co/functions/v1"
```

### List jobs with filters

```bash
# All jobs
curl "$BASE/api-jobs" -H "$AUTH"

# Search by customer or job number
curl "$BASE/api-jobs?search=Hygienisch" -H "$AUTH"

# Filter by status
curl "$BASE/api-jobs?status=in_progress" -H "$AUTH"

# Sort by due date, paginate
curl "$BASE/api-jobs?sort=due_date&order=asc&limit=20&offset=0" -H "$AUTH"
```

### Get parts for a job

```bash
curl "$BASE/api-parts?job_id=<uuid>" -H "$AUTH"

# Search by part number or material
curl "$BASE/api-parts?search=RVS-316" -H "$AUTH"
```

### Get operations for a part

```bash
curl "$BASE/api-operations?part_id=<uuid>&sort=sequence&order=asc" -H "$AUTH"

# Filter by cell or status
curl "$BASE/api-operations?cell_id=<uuid>&status=not_started" -H "$AUTH"
```

### Create a job with nested parts and operations

```bash
curl -X POST "$BASE/api-jobs" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "job_number": "WO-2026-0200",
  "customer": "Staalconstructie BV",
  "due_date": "2026-06-01",
  "parts": [
    {
      "part_number": "FRAME-001",
      "material": "S355J2",
      "quantity": 2,
      "operations": [
        {"operation_name": "Lasersnijden", "cell_id": "<uuid>", "sequence": 1, "estimated_time": 120},
        {"operation_name": "Kanten", "cell_id": "<uuid>", "sequence": 2, "estimated_time": 90}
      ]
    }
  ]
}'
```

### Update metadata on an operation

```bash
curl -X PATCH "$BASE/api-operations?id=<uuid>" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "metadata": {"power": 4000, "speed": 12000, "gas": "N2"}
}'
```

### Bulk sync (CSV import uses this)

```bash
curl -X POST "$BASE/api-jobs/bulk-sync" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "items": [
    {"external_id": "ERP-001", "external_source": "SAP", "job_number": "WO-001", "customer": "Klant BV"}
  ]
}'
```

Records are upserted by `external_id` + `external_source`. Re-importing updates existing records.

### Batch lifecycle (CAD/CAM integration)

```bash
# Create batch with operations
curl -X POST "$BASE/api-batches" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "batch_number": "NEST-001",
  "batch_type": "laser_nesting",
  "cell_id": "<uuid>",
  "material": "S235",
  "thickness_mm": 6,
  "operation_ids": ["<op-uuid-1>", "<op-uuid-2>"]
}'

# Machine reports start
curl -X POST "$BASE/api-batch-lifecycle/start?id=<batch-uuid>" -H "$AUTH" -H "Content-Type: application/json" -d '{}'

# Machine reports done
curl -X POST "$BASE/api-batch-lifecycle/stop?id=<batch-uuid>" -H "$AUTH" -H "Content-Type: application/json" -d '{}'
```

### Operation lifecycle

```bash
# Operator starts work
curl -X POST "$BASE/api-operation-lifecycle/start?id=<uuid>" -H "$AUTH" -d '{}'

# Operator completes work
curl -X POST "$BASE/api-operation-lifecycle/complete?id=<uuid>" -H "$AUTH" -d '{}'
```

### Webhooks (push events to your systems)

```bash
# Create a webhook
curl -X POST "$BASE/api-webhooks" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "url": "https://your-erp.com/webhook",
  "events": ["operation.started", "operation.completed", "batch.started", "batch.completed"],
  "secret_key": "your-hmac-secret",
  "active": true
}'
```

Events are POSTed to your URL with HMAC SHA-256 signature in the `X-Eryxon-Signature` header.

For full field reference, see [REST API Reference](/api/rest-api-reference/) and [Payload Reference](/api/payload-reference/).
