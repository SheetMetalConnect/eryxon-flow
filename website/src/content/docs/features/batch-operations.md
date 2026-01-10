---
title: "Batch/Nesting Operations"
description: "Documentation for Batch Operations and Nesting management in metalworking MES"
---

Eryxon MES includes a batch/nesting operations module designed for high-mix, low-volume metalworking environments. This feature allows grouping multiple operations that will be processed together - essential for laser nesting, tube cutting batches, saw programs, and finishing batches.

---

## Table of Contents

1. [Overview & Use Case](#overview--use-case)
2. [Data Model](#data-model)
3. [Workflow](#workflow)
4. [User Interface](#user-interface)
5. [Operator Guide](#operator-guide)
6. [Admin Configuration](#admin-configuration)
7. [API Integration](#api-integration)
8. [Database Schema](#database-schema)

---

## Overview & Use Case

### What are Batch Operations?

In metalworking manufacturing, many processes require grouping multiple parts together:

1. **Laser Nesting** - Multiple flat parts cut from the same sheet
2. **Tube Batching** - Multiple tube parts processed on the same tube laser
3. **Saw Programs** - Multiple cuts from the same bar stock
4. **Finishing Batches** - Parts grouped for the same paint/coating batch

### Core Value Proposition

```
┌─────────────────────────────────────────────────────────────────┐
│                    BATCH OPERATIONS FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Individual Ops] → [Group by Material] → [Create Batch]        │
│         ↓                    ↓                    ↓              │
│  Same material          Same thickness        Same cell         │
│  Different jobs          auto-grouped       assigned together    │
│                              ↓                    ↓              │
│                    [Start Batch] → [Complete Batch]              │
│                         ↓                    ↓                   │
│              All ops → in_progress    All ops → completed        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Material grouping** | Operations automatically grouped by material and thickness |
| **Mixed orders** | Batch can contain operations from different jobs/orders |
| **Atomic completion** | Completing a batch completes all operations at once |
| **Operator tracking** | Records who started and completed each batch |
| **Quick creation** | One-click batch creation from terminal view |
| **Nesting metadata** | Track efficiency percentages from nesting software |

### Batch Types

| Type | Use Case |
|------|----------|
| **Laser Nesting** | 2D flat parts cut from sheet metal (SigmaNest, Lantek, etc.) |
| **Tube Batch** | Tube laser cutting programs |
| **Saw Batch** | Bar stock cutting programs |
| **Finishing Batch** | Painting, coating, or surface treatment batches |
| **General** | Any other grouping of operations |

### What This Is NOT

- ❌ Individual operation tracking (use Operations for that)
- ❌ CAM/nesting software (integrates with external tools)
- ❌ Material inventory management
- ❌ Machine programming

This module focuses on **grouping operations** that will be processed together and tracking them as a single unit through production.

---

## Data Model

### Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATA HIERARCHY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Batch (operation_batches)                                      │
│  ├── batch_number (auto-generated: "BATCH-2024-0001")          │
│  ├── batch_type (laser_nesting, tube_batch, etc.)              │
│  ├── status (draft → ready → in_progress → completed)          │
│  ├── cell_id (which production cell)                           │
│  ├── material, thickness_mm (for grouping)                     │
│  ├── nesting_metadata (efficiency%, sheet dimensions, etc.)    │
│  │                                                              │
│  └── BatchOperations[] (junction table)                         │
│      ├── operation_id → Operation                               │
│      │       └── Part → Job                                     │
│      ├── sequence_in_batch                                      │
│      └── nested_quantity                                        │
│                                                                 │
│  When batch starts → all operations → in_progress               │
│  When batch completes → all operations → completed              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Relationships

1. **Batch ↔ Operations**: Many-to-many via `batch_operations` table
2. **Operations ↔ Part ↔ Job**: Existing hierarchy remains intact
3. **Batch ↔ Cell**: Each batch is assigned to a production cell
4. **Material Grouping**: Batches typically contain same material/thickness

### Operator Tracking

The system tracks who performed batch actions:

```
started_by    → user ID who started the batch
started_at    → timestamp when started
completed_by  → user ID who completed the batch
completed_at  → timestamp when completed
```

This works with both terminal operators (shared login) and admin users.

---

## Workflow

### Batch Lifecycle

```
┌─────────┐     ┌─────────┐     ┌───────────┐     ┌───────────┐
│  DRAFT  │────▶│  READY  │────▶│IN PROGRESS│────▶│ COMPLETED │
└─────────┘     └─────────┘     └───────────┘     └───────────┘
     │               │                                   │
     │               │                                   │
     └───────────────┴──────── CANCELLED ◀──────────────┘
```

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| **Draft** | Initial state. Operations can be added/removed. | Add/remove ops, edit details, delete batch |
| **Ready** | Batch is prepared, waiting to start. | Start batch, edit operations |
| **In Progress** | Batch is being processed. All operations marked in_progress. | Complete batch, cancel |
| **Completed** | All operations completed atomically. | View only |
| **Cancelled** | Batch was cancelled. Operations return to pending. | View only |

### Typical Flow

1. **Nesting software creates batch** → Via API with operation IDs and efficiency data
2. **OR Admin creates batch** → Manual grouping in admin UI
3. **OR Operator creates batch** → Quick creation from terminal
4. **Operator starts batch** → All operations go to in_progress
5. **Batch processing occurs** → Parts are cut/processed together
6. **Operator completes batch** → All operations marked completed atomically

### Atomic Completion

When a batch is completed:

```sql
-- All operations in batch are updated together
UPDATE operations SET status = 'completed', completed_at = NOW()
WHERE id IN (SELECT operation_id FROM batch_operations WHERE batch_id = $1)
```

This ensures all parts from a nesting are completed together, maintaining data integrity.

---

## User Interface

### Navigation

- **Admin**: Sidebar → Batches (layers icon)
- **Operator**: Work Queue → Each cell column shows batches

### Admin Batches Page

Full management interface with:

- **Stats row**: Total, Draft, Ready, In Progress, Completed counts
- **Filters**: Status, Type, Cell, Search
- **Batches table**: All batches with quick actions
- **Create modal**: Multi-step batch creation wizard

### Admin Create Batch Modal

Four-step wizard:

1. **Select Type**: Choose batch type (laser_nesting, tube_batch, etc.)
2. **Select Cell**: Pick production cell
3. **Select Operations**: Browse operations grouped by material/thickness
4. **Details**: Add notes, efficiency percentage (for nesting)

Operations are automatically grouped by material and thickness for easy selection.

### Operator Work Queue

The terminal view shows batches alongside individual operations:

```
┌─────────────────────────────────────────────────────────────────┐
│  CELL: Laser Cutting                                    [+]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ 📦 BATCH-2024-0001                          [Start] │       │
│  │ Laser Nesting • DC01 2mm • 5 operations              │       │
│  │ Efficiency: 78%                                      │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ PART-001 - Bracket Assembly          [Start]        │       │
│  │ JOB-2024-001 • ACME Corp                            │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

The `[+]` button opens Quick Batch Modal for fast batch creation.

### Quick Batch Modal (Operator)

Simplified batch creation for terminal operators:

1. Select batch type from dropdown
2. Browse operations grouped by material
3. Check operations to include
4. Click "Create Batch"

### Batch Detail Modal (Admin)

Shows complete batch information:

- Batch number, type, status
- Operations count, material, thickness
- Timeline: created → started → completed (with operator names)
- Operations table with part numbers, quantities, status
- Remove operation buttons (draft only)
- Action buttons: Start, Complete, Cancel

### Batch Operator Modal (Terminal)

Simplified modal for operators:

- Batch info and status
- Progress bar (completed ops / total ops)
- Operations list with status badges
- Start/Complete buttons

---

## Operator Guide

### For Terminal Operators

**Your role:** Start and complete batches on the shop floor.

#### Starting a Batch

1. Open Work Queue
2. Find your cell column
3. Locate the batch card (shows batch number and type)
4. Click **Start** button
5. All operations in batch go to "In Progress"
6. Your name is recorded as the operator who started

#### Completing a Batch

1. When all parts are processed
2. Click **Complete** button on the batch card
3. OR open batch modal and click Complete
4. All operations are marked completed together
5. Your name is recorded

#### Quick Create a Batch

If operations aren't batched yet:

1. Click **[+]** button on cell column header
2. Select batch type (usually laser_nesting)
3. Check operations to include (grouped by material)
4. Click "Create Batch"
5. New batch appears in the column

### For Production Planners

**Your role:** Pre-create batches from nesting software output.

#### Using API Integration

Most efficient workflow:

1. Create nesting in external software (SigmaNest, Lantek, etc.)
2. Software sends batch to Eryxon via API
3. Include operation IDs and efficiency percentage
4. Batch appears ready for operators

#### Manual Batch Creation

1. Go to Admin → Batches
2. Click "Create Batch"
3. Follow 4-step wizard
4. Batch is created in Draft status
5. Ready for operator to start

---

## Admin Configuration

### Batch Type Descriptions

Configure batch type labels in translations:

```json
// src/i18n/locales/en/jobs.json
{
  "batches": {
    "types": {
      "laser_nesting": "Laser Nesting",
      "tube_batch": "Tube Batch",
      "saw_batch": "Saw Batch",
      "finishing_batch": "Finishing Batch",
      "general": "General Batch"
    },
    "typeDescriptions": {
      "laser_nesting": "2D parts nested on sheet metal",
      "tube_batch": "Tube laser cutting program",
      "saw_batch": "Saw cutting program",
      "finishing_batch": "Painting/coating batch",
      "general": "General operation grouping"
    }
  }
}
```

### Cells Setup

Batches are assigned to cells. Ensure cells are configured:

1. Go to Admin → Configuration → Cells
2. Create cells for batch-processing workstations
3. Each cell appears as a column in Work Queue

---

## API Integration

### Create Batch

```bash
POST /api-batches
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "batch_type": "laser_nesting",
  "cell_id": "uuid-of-cell",
  "material": "DC01",
  "thickness_mm": 2.0,
  "operation_ids": [
    "uuid-of-operation-1",
    "uuid-of-operation-2",
    "uuid-of-operation-3"
  ],
  "nesting_metadata": {
    "efficiency_percent": 78.5,
    "sheet_width_mm": 1500,
    "sheet_height_mm": 3000,
    "sheets_count": 1,
    "nest_id": "NEST-2024-001"
  },
  "external_id": "external-system-id",
  "external_source": "SigmaNest",
  "notes": "Rush order - priority"
}
```

**Response:**

```json
{
  "id": "uuid",
  "batch_number": "BATCH-2024-0001",
  "status": "ready",
  "operations_count": 3,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Get Batch Details

```bash
GET /api-batches?id={batch-id}
Authorization: Bearer <api-key>
```

### Start Batch

```bash
POST /api-batch-lifecycle/start
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "batch_id": "uuid"
}
```

### Complete Batch

```bash
POST /api-batch-lifecycle/complete
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "batch_id": "uuid"
}
```

### List Groupable Operations

Get operations available for batching:

```bash
GET /api-batches/groupable?cell_id={cell-id}
Authorization: Bearer <api-key>
```

**Response:**

```json
{
  "operations": [...],
  "materialGroups": [
    {
      "material": "DC01",
      "thickness_mm": 2.0,
      "cell_id": "uuid",
      "operations": [...]
    }
  ]
}
```

---

## Database Schema

### operation_batches

```sql
CREATE TABLE operation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,

  -- Identification
  batch_number TEXT NOT NULL,
  batch_type batch_type NOT NULL DEFAULT 'general',
  -- Values: laser_nesting, tube_batch, saw_batch, finishing_batch, general

  -- Status
  status batch_status DEFAULT 'draft',
  -- Values: draft, ready, in_progress, completed, cancelled

  -- Assignment
  cell_id UUID REFERENCES cells(id),

  -- Material (for grouping)
  material TEXT,
  thickness_mm DECIMAL(10,2),

  -- Counts (computed)
  operations_count INTEGER DEFAULT 0,

  -- Timing
  estimated_time INTEGER, -- minutes
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Operators
  created_by UUID REFERENCES auth.users(id),
  started_by UUID REFERENCES auth.users(id),
  completed_by UUID REFERENCES auth.users(id),

  -- External Integration
  external_id TEXT,
  external_source TEXT,

  -- Metadata
  nesting_metadata JSONB DEFAULT '{}',
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, batch_number)
);
```

### batch_operations

```sql
CREATE TABLE batch_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  batch_id UUID REFERENCES operation_batches(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,

  -- Ordering within batch
  sequence_in_batch INTEGER,

  -- Quantity (may differ from operation quantity for nesting)
  nested_quantity INTEGER,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(batch_id, operation_id)
);
```

### Enums

```sql
CREATE TYPE batch_type AS ENUM (
  'laser_nesting',
  'tube_batch',
  'saw_batch',
  'finishing_batch',
  'general'
);

CREATE TYPE batch_status AS ENUM (
  'draft',
  'ready',
  'in_progress',
  'completed',
  'cancelled'
);
```

### Nesting Metadata Structure

```json
{
  "efficiency_percent": 78.5,
  "sheet_width_mm": 1500,
  "sheet_height_mm": 3000,
  "sheets_count": 1,
  "nest_id": "NEST-2024-001",
  "program_name": "PROG_001.NC",
  "machine_name": "Trumpf 3030"
}
```

---

## Integration with Nesting Software

### SigmaNest Integration

Example webhook from SigmaNest when a nest is approved:

```json
{
  "event": "nest_approved",
  "nest_id": "SN-2024-001",
  "material": "DC01",
  "thickness": 2.0,
  "efficiency": 78.5,
  "parts": [
    { "part_number": "PART-001", "quantity": 5 },
    { "part_number": "PART-002", "quantity": 10 }
  ]
}
```

Your integration should:
1. Look up operation IDs by part numbers
2. Create batch via API with operation IDs
3. Include nesting metadata

### Lantek Integration

Similar pattern - when a program is created, send batch data to Eryxon API.

---

## Related Documentation

- [API Documentation](/api/api_documentation/) - Full API reference
- [Operator Manual](/guides/operator-manual/) - Terminal operation guide
- [Admin Manual](/guides/admin-manual/) - Administrative functions
- [ERP Integration](/features/erp-integration/) - Syncing operations from ERP
