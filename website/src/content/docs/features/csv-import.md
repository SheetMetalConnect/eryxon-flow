---
title: CSV Import
description: Import your existing data into Eryxon Flow using CSV files.
---

Eryxon Flow includes a CSV import wizard for batch data import from spreadsheets or ERP exports.

## Import Order

Import in this order to satisfy dependencies:

1. **Cells** — production cells and work centers
2. **Resources** — machines, tooling, fixtures
3. **Jobs** — customer orders and work orders
4. **Parts** — parts within jobs (references jobs via `job_external_id`)
5. **Operations** — routing steps (references parts via `part_external_id`, cells via `cell_name`)

## How To Import

1. Navigate to **Data Import** in the admin sidebar
2. Select the entity type (Jobs, Parts, Operations, Cells, or Resources)
3. Upload your CSV file — drag and drop or click to browse
4. Map CSV columns to Eryxon fields — auto-mapping matches by column name
5. Preview and validate — fix any errors before importing
6. Import — records are processed in batches with real-time progress
7. Review results — see created, updated, and error counts

## Templates

Ready-to-use CSV templates are included in the repository. Download, fill in your own data, and import.

| Template | Download |
|----------|----------|
| Cells | [cells.csv](https://raw.githubusercontent.com/SheetMetalConnect/eryxon-flow/main/templates/csv/cells.csv) |
| Jobs | [jobs.csv](https://raw.githubusercontent.com/SheetMetalConnect/eryxon-flow/main/templates/csv/jobs.csv) |
| Parts | [parts.csv](https://raw.githubusercontent.com/SheetMetalConnect/eryxon-flow/main/templates/csv/parts.csv) |
| Operations | [operations.csv](https://raw.githubusercontent.com/SheetMetalConnect/eryxon-flow/main/templates/csv/operations.csv) |
| Resources | [resources.csv](https://raw.githubusercontent.com/SheetMetalConnect/eryxon-flow/main/templates/csv/resources.csv) |

### cells.csv

```csv
external_id,external_source,name,sequence,color,capacity_hours_per_day,wip_limit
CELL-LASER,ERP,Lasersnijden,1,#ef4444,8,15
CELL-KANT,ERP,CNC Kantbank,2,#f59e0b,8,10
CELL-LAS,ERP,Lassen,3,#3b82f6,8,8
CELL-MONT,ERP,Montage,4,#8b5cf6,8,6
CELL-AFW,ERP,Afwerking,5,#10b981,8,12
```

### jobs.csv

```csv
external_id,external_source,job_number,customer,due_date,status,notes
JOB-2026-001,ERP,WO-2026-0501,Hygienisch Staal BV,2026-05-15,not_started,Foodgrade RVS constructie
JOB-2026-002,ERP,WO-2026-0502,Metaalbewerking NL,2026-04-30,not_started,Chassis onderdelen
JOB-2026-003,ERP,WO-2026-0503,Constructiewerk Van Dam,2026-06-01,not_started,Staalconstructie hal 3
```

### parts.csv

```csv
external_id,external_source,part_number,job_external_id,material,quantity,notes
PART-001,ERP,PLAAT-S235-001,JOB-2026-001,S235,4,Bodemplaat 1200x800x6
PART-002,ERP,RVS-304-DEKSEL,JOB-2026-001,RVS 304,8,Deksel met uitsparing
PART-003,ERP,RVS-316L-FRAME,JOB-2026-001,RVS 316L,2,Draagframe foodgrade
PART-004,ERP,S355-CHASSIS-L,JOB-2026-002,S355J2,4,Langsligger 3000mm
```

### operations.csv

```csv
external_id,external_source,operation_name,part_external_id,cell_name,sequence,estimated_time_minutes,notes
OP-001,ERP,Lasersnijden,PART-001,Lasersnijden,1,120,6mm S235 N2
OP-002,ERP,Kanten,PART-001,CNC Kantbank,2,90,4x 90deg
OP-003,ERP,Lasersnijden,PART-002,Lasersnijden,1,60,3mm RVS 304 N2
OP-004,ERP,Kanten,PART-002,CNC Kantbank,2,45,2x 90deg + 1x 135deg
OP-005,ERP,Lassen,PART-002,Lassen,3,180,TIG RVS
```

### resources.csv

```csv
external_id,external_source,name,type,identifier,location,notes
RES-001,ERP,Trumpf TruLaser 3030,machine,TL-3030-01,Hal 1,6kW fiberlaser
RES-002,ERP,Trumpf TruBend 5130,machine,TB-5130-01,Hal 1,130 ton kantpers
RES-003,ERP,Fronius TPS 500i,machine,FR-500i-01,Hal 2,TIG/MIG lasapparaat
RES-004,ERP,Matrijs V16-88,tooling,V16-88,Gereedschapskast A3,Kantpers matrijs
```

## Field Reference

### Jobs

| Field | Required | Description |
|-------|----------|-------------|
| `job_number` | Yes | Unique job identifier |
| `customer` | No | Customer name |
| `due_date` | No | Due date (YYYY-MM-DD) |
| `status` | No | `not_started`, `in_progress`, `completed` |
| `notes` | No | Additional notes |
| `external_id` | Yes | ERP identifier for upsert |
| `external_source` | Yes | Source system name |

### Parts

| Field | Required | Description |
|-------|----------|-------------|
| `part_number` | Yes | Part number |
| `job_external_id` | Yes | External ID of parent job |
| `material` | No | Material type (e.g. S235, RVS 304) |
| `quantity` | No | Quantity to produce |
| `external_id` | Yes | ERP identifier for upsert |
| `external_source` | Yes | Source system name |

### Operations

| Field | Required | Description |
|-------|----------|-------------|
| `operation_name` | Yes | Operation name (e.g. Lasersnijden, Kanten) |
| `part_external_id` | Yes | External ID of parent part |
| `cell_name` | Yes | Name of the cell (must match exactly) |
| `sequence` | No | Order in routing (1, 2, 3...) |
| `estimated_time_minutes` | No | Estimated time in minutes |
| `external_id` | Yes | ERP identifier for upsert |
| `external_source` | Yes | Source system name |

### Cells

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Cell name |
| `sequence` | No | Display order |
| `color` | No | Hex color (e.g. #ef4444) |
| `capacity_hours_per_day` | No | Daily capacity in hours |
| `wip_limit` | No | Max concurrent operations |
| `external_id` | Yes | ERP identifier for upsert |
| `external_source` | Yes | Source system name |

### Resources

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Resource name |
| `type` | Yes | `machine`, `tooling`, `fixture`, `mold`, `material`, `equipment` |
| `identifier` | No | Asset tag or serial number |
| `location` | No | Physical location |
| `external_id` | Yes | ERP identifier for upsert |
| `external_source` | Yes | Source system name |

## Upsert Behavior

Records are matched by `external_id` + `external_source` within your tenant. Importing the same file twice updates existing records instead of creating duplicates.

## Troubleshooting

**"Reference not found"** — The parent record does not exist yet. Import cells before operations, jobs before parts.

**"Invalid date format"** — Use `YYYY-MM-DD` (e.g. 2026-05-15).

**"Required field missing"** — Every record needs `external_id` and `external_source` for the sync to work.
