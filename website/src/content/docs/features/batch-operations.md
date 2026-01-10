---
title: "Batch/Nesting Operations"
description: "Group operations for laser nesting, tube batching, and finishing"
---

:::caution[Work in Progress]
This feature is under active development and **not production-ready**. Schema and APIs may change.
:::

Batch operations group multiple parts processed together - laser nesting, tube cutting, saw programs, finishing batches.

## Batch Types

| Type | Use Case |
|------|----------|
| `laser_nesting` | 2D parts cut from sheet metal |
| `tube_batch` | Tube laser cutting programs |
| `saw_batch` | Bar stock cutting programs |
| `finishing_batch` | Painting/coating batches |
| `general` | Any other grouping |

**Key behaviors:**
- Operations grouped by material/thickness
- Can mix operations from different jobs
- Starting batch → all ops go to `in_progress`
- Completing batch → all ops go to `completed` atomically

## Data Model

```
Batch (operation_batches)
├── batch_number (auto: "BATCH-2024-0001")
├── batch_type, status, cell_id
├── material, thickness_mm
├── nesting_metadata (JSON)
└── BatchOperations[] (junction)
    ├── operation_id → Operation → Part → Job
    └── sequence_in_batch, nested_quantity
```

**Relationships:** Many-to-many between batches and operations. Each batch assigned to one cell.

**Tracking:** `started_by`/`started_at` and `completed_by`/`completed_at` record who performed actions.

## Workflow

**Status flow:** `draft` → `ready` → `in_progress` → `completed` (or `cancelled` from any state)

| Status | Description |
|--------|-------------|
| `draft` | Initial. Add/remove operations. |
| `ready` | Prepared, waiting to start. |
| `in_progress` | Being processed. All ops marked in_progress. |
| `completed` | Done. All ops completed atomically. |
| `cancelled` | Operations return to pending. |

**Typical flow:**
1. Nesting software (or admin/operator) creates batch
2. Operator starts batch → all ops go to `in_progress`
3. Parts processed together
4. Operator completes batch → all ops completed atomically

## Usage

**Admin:** Sidebar → Batches. Create via 4-step wizard (type → cell → operations → details). Operations auto-grouped by material/thickness.

**Operator:** Work Queue shows batches per cell. Click Start/Complete on batch card. Use `[+]` button for quick batch creation from available operations.

**Planners:** Best workflow is API integration with nesting software (SigmaNest, Lantek). Batch appears ready for operators automatically.

### Setup

Ensure cells are configured first: Admin → Configuration → Cells

## API

### Create Batch

```bash
POST /api-batches
Authorization: Bearer <api-key>

{
  "batch_type": "laser_nesting",
  "cell_id": "uuid",
  "material": "DC01",
  "thickness_mm": 2.0,
  "operation_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "nesting_metadata": {
    "efficiency_percent": 78.5,
    "sheet_width_mm": 1500,
    "sheet_height_mm": 3000
  },
  "external_id": "SN-2024-001",
  "external_source": "SigmaNest"
}
```

### Lifecycle

```bash
POST /api-batch-lifecycle/start    { "batch_id": "uuid" }
POST /api-batch-lifecycle/complete { "batch_id": "uuid" }
```

### Query

```bash
GET /api-batches?id={batch-id}
GET /api-batches/groupable?cell_id={cell-id}  # Operations available for batching
```

## Database Schema

**Tables:** `operation_batches` (main), `batch_operations` (junction)

**Key columns on `operation_batches`:**
- `batch_number` (auto-generated)
- `batch_type`, `status`, `cell_id`
- `material`, `thickness_mm`
- `nesting_metadata` (JSONB)
- `external_id`, `external_source`
- `started_by`, `completed_by` (user tracking)

**Nesting metadata example:**
```json
{
  "efficiency_percent": 78.5,
  "sheet_width_mm": 1500,
  "sheet_height_mm": 3000,
  "nest_id": "NEST-2024-001",
  "program_name": "PROG_001.NC"
}
```

## Nesting Software Integration

When your nesting software (SigmaNest, Lantek, etc.) approves a nest:

1. Look up Eryxon operation IDs by part numbers
2. POST to `/api-batches` with operation IDs and nesting metadata
3. Batch appears ready for operators

See [API Documentation](/api/api_documentation/) for full reference.
