---
title: "CSV Import"
description: "Batch import data from spreadsheets or ERP exports"
---

CSV import wizard for batch data migration from spreadsheets or ERP exports.

See also: [ERP Integration](/features/erp-integration/), [API Sync Endpoints](/api/api_sync/)

## Accessing the Import Wizard

1. Navigate to **Admin → Data Import**
2. Or directly visit `/admin/data-import`

## Import Process

### Step 1: Select Entity

Choose the type of data you want to import:

| Entity | Description |
|--------|-------------|
| **Jobs** | Sales orders and manufacturing jobs |
| **Parts** | Parts, components, and assemblies |
| **Operations** | Manufacturing operations and routing steps |
| **Cells** | Manufacturing cells and work centers |
| **Resources** | Tools, fixtures, molds, and equipment |

### Step 2: Upload CSV File

- Drag and drop your CSV file or click to browse
- Download a template if you need the correct column format
- File must be in CSV format (comma-separated values)

### Step 3: Map Fields

Match your CSV columns to Eryxon fields:

- Required fields are marked with an asterisk (*)
- Columns can be mapped to "-- Ignore --" to skip them
- Auto-mapping attempts to match columns by name

### Step 4: Preview & Validate

Review validation results before importing:

- **Valid Records** - Ready to import
- **Invalid Records** - Have errors that need fixing

Common validation errors:
- Missing required fields
- Invalid date formats (use YYYY-MM-DD)
- Reference not found (e.g., job_external_id doesn't exist)

### Step 5: Import

Click "Start Import" to process your data.

- Records are processed in batches of 100
- Progress is shown in real-time
- Each record shows created/updated/error status

### Step 6: Review Results

See a summary of your import:

- Total records processed
- Created count
- Updated count
- Error count with details

## Field Reference

### Jobs

| Field | Required | Description |
|-------|----------|-------------|
| `job_number` | Yes | Unique job identifier |
| `customer` | No | Customer name |
| `due_date` | No | Due date (YYYY-MM-DD) |
| `priority` | No | Priority (0-10) |
| `notes` | No | Additional notes |
| `external_id` | No | ERP identifier for sync |
| `external_source` | No | Source system name |

### Parts

| Field | Required | Description |
|-------|----------|-------------|
| `part_number` | Yes | Part number |
| `job_external_id` | Yes | External ID of parent job |
| `material` | No | Material type |
| `quantity` | No | Quantity to produce |
| `notes` | No | Additional notes |
| `external_id` | No | ERP identifier for sync |
| `external_source` | No | Source system name |

### Operations

| Field | Required | Description |
|-------|----------|-------------|
| `operation_name` | Yes | Operation name |
| `part_external_id` | Yes | External ID of parent part |
| `cell_name` | Yes | Name of the cell/work center |
| `sequence` | No | Order in routing |
| `estimated_time_minutes` | No | Estimated time |
| `notes` | No | Instructions or notes |
| `external_id` | No | ERP identifier for sync |
| `external_source` | No | Source system name |

### Cells

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Cell/work center name |
| `color` | No | Hex color (e.g., #3b82f6) |
| `sequence` | No | Display order |
| `active` | No | true/false |
| `external_id` | No | ERP identifier for sync |
| `external_source` | No | Source system name |

### Resources

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Resource name |
| `type` | Yes | tooling, fixture, mold, material, equipment |
| `description` | No | Description |
| `identifier` | No | Asset tag or identifier |
| `location` | No | Physical location |
| `status` | No | available, in_use, maintenance |
| `external_id` | No | ERP identifier for sync |
| `external_source` | No | Source system name |

## Sample CSV Templates

### Jobs Template

```csv
job_number,customer,due_date,priority,notes,external_id,external_source
JOB-2024-001,Acme Corp,2024-12-31,5,Rush order,SO-12345,SAP
JOB-2024-002,TechCo,2025-01-15,3,,SO-12346,SAP
```

### Parts Template

```csv
part_number,job_external_id,material,quantity,notes,external_id,external_source
BRACKET-A,SO-12345,Steel 304,25,,SO-12345-10,SAP
PLATE-B,SO-12345,Aluminum 6061,50,,SO-12345-20,SAP
```

### Operations Template

```csv
operation_name,part_external_id,cell_name,sequence,estimated_time_minutes,notes,external_id,external_source
Laser Cut,SO-12345-10,Cutting,1,30,Use 1000W laser,SO-12345-10-010,SAP
Bend 90°,SO-12345-10,Bending,2,15,,SO-12345-10-020,SAP
```

## Import Order

For a complete data migration, import in this order:

1. **Cells** - Must exist before operations reference them
2. **Resources** - No dependencies
3. **Jobs** - No dependencies
4. **Parts** - Requires jobs to exist (via job_external_id)
5. **Operations** - Requires parts and cells to exist

## Upsert Behavior

When `external_id` is provided:

- **New record**: If external_id doesn't exist, creates new record
- **Existing record**: If external_id exists, updates the record

This allows re-running imports without creating duplicates.

## Troubleshooting

### "Reference not found" Error

The parent record doesn't exist yet. Check:
- For Parts: job_external_id must match an existing job's external_id
- For Operations: part_external_id and cell_name must exist

### "Invalid date format" Error

Use ISO date format: `YYYY-MM-DD` (e.g., 2024-12-31)

### "Required field missing" Error

Ensure all required fields have values. Empty cells for required fields will fail validation.

## Related Documentation

- [ERP Integration Overview](/features/erp-integration/)
- [API Sync Reference](/api/api_sync/)
