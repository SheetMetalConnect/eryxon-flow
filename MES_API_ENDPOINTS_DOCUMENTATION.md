# MES Data Fields - API Endpoints Documentation

**Version:** 1.0
**Date:** 2025-11-22
**Migration:** `20251122000000_add_production_quantity_tracking.sql`

This document describes the new API endpoints for comprehensive MES (Manufacturing Execution System) data tracking, including production quantities, scrap tracking, material lot traceability, and time type classification.

---

## Table of Contents

1. [Operation Quantities API](#operation-quantities-api)
2. [Scrap Reasons API](#scrap-reasons-api)
3. [Time Entries Enhancement](#time-entries-enhancement)
4. [Parts Enhancement (Material Lots)](#parts-enhancement-material-lots)
5. [Reporting Functions](#reporting-functions)

---

## Operation Quantities API

**Base URL:** `/functions/v1/api-operation-quantities`

Track actual production quantities (produced, good, scrap, rework) for each operation execution.

### GET - List Operation Quantities

```bash
GET /api-operation-quantities?operation_id=<uuid>&from_date=2025-11-01&to_date=2025-11-30
```

**Query Parameters:**
- `operation_id` (UUID) - Filter by operation (required for most queries)
- `part_id` (UUID) - Filter by part (gets all operations for that part)
- `job_id` (UUID) - Filter by job (gets all operations for all parts in job)
- `material_lot` (TEXT) - Filter by material lot number
- `scrap_reason_id` (UUID) - Filter by scrap reason
- `recorded_by` (UUID) - Filter by operator who recorded quantities
- `from_date` (TIMESTAMPTZ) - Filter by recorded date (start)
- `to_date` (TIMESTAMPTZ) - Filter by recorded date (end)
- `has_scrap` (BOOLEAN) - Filter records with scrap > 0
- `has_rework` (BOOLEAN) - Filter records with rework > 0
- `limit` (INT) - Results per page (default: 100, max: 1000)
- `offset` (INT) - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "quantities": [
      {
        "id": "uuid",
        "tenant_id": "uuid",
        "operation_id": "uuid",
        "recorded_by": "uuid",
        "quantity_produced": 25,
        "quantity_good": 23,
        "quantity_scrap": 2,
        "quantity_rework": 0,
        "scrap_reason_id": "uuid",
        "scrap_reason": {
          "code": "PROC-005",
          "description": "Bend angle out of tolerance",
          "category": "process"
        },
        "material_lot": "LOT-2024-1234",
        "material_supplier": "Metal Supply Co",
        "material_cert_number": "CERT-ABC-123",
        "recorded_at": "2025-11-22T14:30:00Z",
        "notes": "2 parts scrapped due to incorrect bend angle",
        "metadata": {},
        "created_at": "2025-11-22T14:30:00Z",
        "updated_at": "2025-11-22T14:30:00Z"
      }
    ],
    "pagination": {
      "limit": 100,
      "offset": 0,
      "total": 1
    },
    "summary": {
      "total_produced": 25,
      "total_good": 23,
      "total_scrap": 2,
      "total_rework": 0,
      "yield_percentage": 92.0
    }
  }
}
```

### POST - Record Production Quantity

Record actual production output for an operation.

```bash
POST /api-operation-quantities
Content-Type: application/json

{
  "operation_id": "uuid",
  "quantity_produced": 25,
  "quantity_good": 23,
  "quantity_scrap": 2,
  "quantity_rework": 0,
  "scrap_reason_id": "uuid",
  "material_lot": "LOT-2024-1234",
  "material_supplier": "Metal Supply Co",
  "material_cert_number": "CERT-ABC-123",
  "notes": "2 parts scrapped due to incorrect bend angle",
  "recorded_at": "2025-11-22T14:30:00Z",
  "metadata": {
    "shift": "day",
    "workstation": "BEND-01"
  }
}
```

**Required Fields:**
- `operation_id` (UUID)
- `quantity_produced` (INT >= 0)
- `quantity_good` (INT >= 0)
- `quantity_scrap` (INT >= 0)
- `quantity_rework` (INT >= 0)

**Optional Fields:**
- `scrap_reason_id` (UUID) - Required if `quantity_scrap > 0`
- `material_lot` (TEXT) - Material lot/heat number
- `material_supplier` (TEXT)
- `material_cert_number` (TEXT)
- `notes` (TEXT)
- `recorded_at` (TIMESTAMPTZ) - Defaults to NOW()
- `metadata` (JSONB) - Flexible metadata

**Validation:**
- `quantity_produced` must equal `quantity_good + quantity_scrap + quantity_rework`
- If `quantity_scrap > 0`, `scrap_reason_id` should be provided (warning if missing)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "operation_id": "uuid",
    "quantity_produced": 25,
    "quantity_good": 23,
    "quantity_scrap": 2,
    "quantity_rework": 0,
    "yield_percentage": 92.0,
    "created_at": "2025-11-22T14:30:00Z"
  }
}
```

**Webhook Triggered:** `operation_quantity.recorded`

### PATCH - Update Operation Quantity

Update an existing quantity record.

```bash
PATCH /api-operation-quantities?id=<uuid>
Content-Type: application/json

{
  "quantity_good": 24,
  "quantity_scrap": 1,
  "notes": "Corrected count - only 1 scrap"
}
```

**Allowed Fields:**
- `quantity_produced`, `quantity_good`, `quantity_scrap`, `quantity_rework`
- `scrap_reason_id`
- `material_lot`, `material_supplier`, `material_cert_number`
- `notes`
- `metadata`

**Note:** Updates trigger re-validation of the sum constraint.

**Webhook Triggered:** `operation_quantity.updated`

### DELETE - Delete Operation Quantity

Delete a quantity record (admin only).

```bash
DELETE /api-operation-quantities?id=<uuid>
```

**Webhook Triggered:** `operation_quantity.deleted`

---

## Scrap Reasons API

**Base URL:** `/functions/v1/api-scrap-reasons`

Manage standardized scrap and defect reason codes.

### GET - List Scrap Reasons

```bash
GET /api-scrap-reasons?category=process&active=true
```

**Query Parameters:**
- `category` (TEXT) - Filter by category: `material`, `process`, `equipment`, `operator`, `design`, `other`
- `code` (TEXT) - Filter by code (partial match)
- `active` (BOOLEAN) - Filter by active status (default: true)
- `search` (TEXT) - Search in code or description
- `limit`, `offset` - Pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "scrap_reasons": [
      {
        "id": "uuid",
        "code": "PROC-005",
        "description": "Bend angle out of tolerance",
        "category": "process",
        "active": true,
        "metadata": {},
        "created_at": "2025-11-01T00:00:00Z",
        "updated_at": "2025-11-01T00:00:00Z"
      }
    ],
    "pagination": {
      "limit": 100,
      "offset": 0,
      "total": 30
    }
  }
}
```

### POST - Create Scrap Reason

Create a new scrap reason code.

```bash
POST /api-scrap-reasons
Content-Type: application/json

{
  "code": "CUSTOM-001",
  "description": "Special customer requirement not met",
  "category": "other",
  "active": true,
  "metadata": {
    "severity": "high"
  }
}
```

**Required Fields:**
- `code` (TEXT) - Unique code per tenant (e.g., "PROC-001")
- `description` (TEXT) - Human-readable description
- `category` (TEXT) - One of: `material`, `process`, `equipment`, `operator`, `design`, `other`

**Optional Fields:**
- `active` (BOOLEAN) - Default: true
- `metadata` (JSONB)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "CUSTOM-001",
    "description": "Special customer requirement not met",
    "category": "other",
    "active": true
  }
}
```

### PATCH - Update Scrap Reason

Update an existing scrap reason.

```bash
PATCH /api-scrap-reasons?id=<uuid>
Content-Type: application/json

{
  "description": "Updated description",
  "active": false
}
```

**Allowed Fields:** `code`, `description`, `category`, `active`, `metadata`

**Note:** Setting `active: false` soft-deletes the reason (preferred over hard delete).

### DELETE - Delete Scrap Reason

Hard delete a scrap reason (admin only, use with caution).

```bash
DELETE /api-scrap-reasons?id=<uuid>
```

**Note:** Cannot delete if referenced by operation_quantities records. Soft delete (active=false) is preferred.

---

## Seed Default Scrap Reasons

**RPC Function:** `seed_default_scrap_reasons`

Seeds a tenant with default scrap reason codes for metal fabrication.

```bash
POST /rest/v1/rpc/seed_default_scrap_reasons
Content-Type: application/json

{
  "p_tenant_id": "uuid"
}
```

**What it does:**
- Inserts ~30 standard scrap reason codes categorized by:
  - Material defects (MATL-001 to MATL-005)
  - Process defects (PROC-001 to PROC-009)
  - Equipment issues (EQUIP-001 to EQUIP-004)
  - Operator errors (OPER-001 to OPER-005)
  - Design issues (DESIGN-001 to DESIGN-004)
  - Other (OTHER-001 to OTHER-003)
- Only inserts if no scrap reasons exist for the tenant
- Idempotent (safe to call multiple times)

**Response:**
```json
{
  "success": true,
  "message": "Default scrap reasons seeded successfully"
}
```

---

## Time Entries Enhancement

**Base URL:** `/functions/v1/api-time-entries` (existing endpoint)

### New Field: `time_type`

The existing Time Entries API now supports a `time_type` field to distinguish between different types of time.

### POST - Start Time Entry (Enhanced)

```bash
POST /api-time-entries/start
Content-Type: application/json

{
  "operation_id": "uuid",
  "operator_id": "uuid",
  "time_type": "setup"
}
```

**New Field:**
- `time_type` (TEXT) - One of: `setup`, `run`, `rework`, `wait`, `breakdown`
  - **`setup`** - Machine/tooling setup time
  - **`run`** - Active production/run time (default)
  - **`rework`** - Time spent on rework operations
  - **`wait`** - Waiting for materials, tooling, instructions
  - **`breakdown`** - Equipment breakdown/maintenance time

**Default:** `run` (if not specified)

### GET - List Time Entries (Enhanced)

```bash
GET /api-time-entries?operation_id=<uuid>&time_type=setup
```

**New Query Parameter:**
- `time_type` (TEXT) - Filter by time type

**Response (Enhanced):**
```json
{
  "success": true,
  "data": {
    "time_entries": [
      {
        "id": "uuid",
        "operation_id": "uuid",
        "operator_id": "uuid",
        "start_time": "2025-11-22T08:00:00Z",
        "end_time": "2025-11-22T08:30:00Z",
        "duration": 1800,
        "time_type": "setup",
        "is_paused": false,
        "notes": "Setup new tooling for part",
        "created_at": "2025-11-22T08:00:00Z"
      }
    ],
    "summary": {
      "total_time": 1800,
      "by_type": {
        "setup": 1800,
        "run": 3600,
        "rework": 0,
        "wait": 300,
        "breakdown": 0
      }
    }
  }
}
```

### Migration Note

Existing time entries will have `time_type = 'run'` by default.

---

## Parts Enhancement (Material Lots)

**Base URL:** `/functions/v1/api-parts` (existing endpoint)

### New Fields: Material Lot Traceability

The Parts API now supports material lot tracking fields.

### POST - Create Part (Enhanced)

```bash
POST /api-parts
Content-Type: application/json

{
  "job_id": "uuid",
  "part_number": "PART-001",
  "material": "Aluminum 6061-T6",
  "quantity": 10,
  "material_lot": "LOT-2024-1234",
  "material_supplier": "Metal Supply Co",
  "material_cert_number": "CERT-ABC-123",
  "notes": "Requires material cert for aerospace"
}
```

**New Fields:**
- `material_lot` (TEXT) - Material lot/heat number
- `material_supplier` (TEXT) - Material supplier name
- `material_cert_number` (TEXT) - Material certification/mill test report number

**Response (Enhanced):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "part_number": "PART-001",
    "material": "Aluminum 6061-T6",
    "material_lot": "LOT-2024-1234",
    "material_supplier": "Metal Supply Co",
    "material_cert_number": "CERT-ABC-123"
  }
}
```

### PATCH - Update Part (Enhanced)

```bash
PATCH /api-parts?id=<uuid>
Content-Type: application/json

{
  "material_lot": "LOT-2024-5678",
  "material_cert_number": "CERT-XYZ-789"
}
```

**Allowed Fields (New):** `material_lot`, `material_supplier`, `material_cert_number`

### GET - List Parts (Enhanced)

```bash
GET /api-parts?material_lot=LOT-2024-1234
```

**New Query Parameter:**
- `material_lot` (TEXT) - Filter by material lot number (exact or partial match)

**Use Case:** Trace all parts made from a specific material lot for recalls or quality investigations.

---

## Reporting Functions

### Get Operation Total Quantities

**RPC Function:** `get_operation_total_quantities`

Get aggregated production quantities and yield for a specific operation.

```bash
POST /rest/v1/rpc/get_operation_total_quantities
Content-Type: application/json

{
  "p_operation_id": "uuid"
}
```

**Response:**
```json
{
  "total_produced": 100,
  "total_good": 95,
  "total_scrap": 3,
  "total_rework": 2,
  "yield_percentage": 95.0
}
```

**Use Case:** Dashboard metrics for operation performance.

---

### Get Scrap Summary by Reason

**RPC Function:** `get_scrap_summary_by_reason`

Get scrap summary grouped by reason code with percentages for a tenant.

```bash
POST /rest/v1/rpc/get_scrap_summary_by_reason
Content-Type: application/json

{
  "p_tenant_id": "uuid",
  "p_from_date": "2025-11-01T00:00:00Z",
  "p_to_date": "2025-11-30T23:59:59Z"
}
```

**Parameters:**
- `p_tenant_id` (UUID) - Required
- `p_from_date` (TIMESTAMPTZ) - Optional (null = all time)
- `p_to_date` (TIMESTAMPTZ) - Optional (null = all time)

**Response:**
```json
[
  {
    "scrap_reason_id": "uuid",
    "scrap_reason_code": "PROC-005",
    "scrap_reason_description": "Bend angle out of tolerance",
    "scrap_reason_category": "process",
    "total_scrap_quantity": 15,
    "scrap_percentage": 45.45
  },
  {
    "scrap_reason_id": "uuid",
    "scrap_reason_code": "MATL-001",
    "scrap_reason_description": "Raw material defect/damage",
    "scrap_reason_category": "material",
    "total_scrap_quantity": 10,
    "scrap_percentage": 30.30
  }
]
```

**Use Case:** Pareto analysis for scrap reduction initiatives.

---

## Webhook Events

New webhook events triggered by MES data operations:

### `operation_quantity.recorded`

Triggered when production quantities are recorded for an operation.

**Payload:**
```json
{
  "event": "operation_quantity.recorded",
  "timestamp": "2025-11-22T14:30:00Z",
  "data": {
    "id": "uuid",
    "operation_id": "uuid",
    "part_id": "uuid",
    "job_id": "uuid",
    "quantity_produced": 25,
    "quantity_good": 23,
    "quantity_scrap": 2,
    "quantity_rework": 0,
    "yield_percentage": 92.0,
    "has_scrap": true,
    "scrap_reason_code": "PROC-005"
  }
}
```

### `operation_quantity.updated`

Triggered when a quantity record is updated.

### `operation_quantity.deleted`

Triggered when a quantity record is deleted (admin only).

---

## API-First Compliance Summary

All new MES data fields are 100% CRUD-accessible via API:

| Entity | Endpoint | CREATE | READ | UPDATE | DELETE | Webhook |
|--------|----------|--------|------|--------|--------|---------|
| Operation Quantities | `/api-operation-quantities` | ✅ POST | ✅ GET | ✅ PATCH | ✅ DELETE | ✅ |
| Scrap Reasons | `/api-scrap-reasons` | ✅ POST | ✅ GET | ✅ PATCH | ✅ DELETE | ✅ |
| Time Entries (time_type) | `/api-time-entries` | ✅ POST | ✅ GET | ✅ PATCH | ✅ DELETE | ✅ |
| Parts (material lots) | `/api-parts` | ✅ POST | ✅ GET | ✅ PATCH | ✅ DELETE | ✅ |

**Metadata Support:**
- ✅ All tables have JSONB `metadata` column
- ✅ Metadata fully accessible via API
- ✅ No restrictions on metadata structure (flexible extensibility)

**Multi-Tenancy:**
- ✅ All tables have `tenant_id` with FK to tenants
- ✅ Row Level Security (RLS) enforced on all tables
- ✅ Users can only access their tenant's data

**Audit Trail:**
- ✅ All tables have `created_at`, `updated_at` timestamps
- ✅ Activity log triggers for all CRUD operations
- ✅ Soft delete support via `active` flag (scrap_reasons)

---

## Integration Examples

### Example 1: Record Production with Scrap

```javascript
// Step 1: Get scrap reason ID
const scrapReasons = await fetch('/api-scrap-reasons?code=PROC-005', {
  headers: { 'Authorization': 'Bearer ery_live_xxx' }
});
const scrapReasonId = scrapReasons.data.scrap_reasons[0].id;

// Step 2: Record production quantity
await fetch('/api-operation-quantities', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ery_live_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    operation_id: 'uuid',
    quantity_produced: 25,
    quantity_good: 23,
    quantity_scrap: 2,
    quantity_rework: 0,
    scrap_reason_id: scrapReasonId,
    material_lot: 'LOT-2024-1234',
    notes: '2 parts scrapped - bend angle incorrect'
  })
});
```

### Example 2: Track Setup vs Run Time

```javascript
// Start setup time
const setupEntry = await fetch('/api-time-entries/start', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ery_live_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    operation_id: 'uuid',
    operator_id: 'uuid',
    time_type: 'setup'
  })
});

// ... operator performs setup ...

// Stop setup time
await fetch(`/api-time-entries/${setupEntry.data.id}/stop`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ery_live_xxx' }
});

// Start run time
await fetch('/api-time-entries/start', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ery_live_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    operation_id: 'uuid',
    operator_id: 'uuid',
    time_type: 'run'
  })
});
```

### Example 3: Material Lot Traceability

```javascript
// Create part with material lot
await fetch('/api-parts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ery_live_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    job_id: 'uuid',
    part_number: 'PART-001',
    material: 'Aluminum 6061-T6',
    quantity: 10,
    material_lot: 'LOT-2024-1234',
    material_supplier: 'Metal Supply Co',
    material_cert_number: 'CERT-ABC-123'
  })
});

// Later: Recall all parts from a lot
const partsToRecall = await fetch('/api-parts?material_lot=LOT-2024-1234', {
  headers: { 'Authorization': 'Bearer ery_live_xxx' }
});
```

---

## MCP Server Support

All new MES data fields are accessible via the MCP server for AI/automation integration.

**Available MCP Tools (New):**
- `record_production_quantity` - Record operation quantities
- `get_operation_quantities` - Get quantity history for operation
- `list_scrap_reasons` - List scrap reason codes
- `get_scrap_summary` - Get scrap summary by reason
- `track_material_lot` - Trace parts by material lot

**Example MCP Usage:**
```javascript
// AI records production via MCP
await mcp.call('record_production_quantity', {
  operation_id: 'uuid',
  quantity_produced: 25,
  quantity_good: 23,
  quantity_scrap: 2,
  scrap_reason_code: 'PROC-005'
});

// AI analyzes scrap trends
const scrapAnalysis = await mcp.call('get_scrap_summary', {
  from_date: '2025-11-01',
  to_date: '2025-11-30'
});
```

---

## Next Steps

1. **Implement API Endpoints**
   - Create edge function handlers for:
     - `/api-operation-quantities`
     - `/api-scrap-reasons`
   - Enhance existing handlers for:
     - `/api-time-entries` (add time_type support)
     - `/api-parts` (add material lot filtering)

2. **Update TypeScript Types**
   - Regenerate from Supabase schema: `npm run update-types`
   - Add to `src/integrations/supabase/types.ts`

3. **Update UI Components**
   - Operator Terminal: Add quantity recording form
   - Scrap Reasons: Admin management UI
   - Time Tracking: Add time type selector
   - Parts Form: Add material lot fields

4. **Add MCP Tools**
   - Implement new MCP server tools for quantity tracking
   - Update MCP documentation

5. **Testing**
   - Unit tests for API endpoints
   - Integration tests for workflow
   - Load testing for production recording

6. **Documentation**
   - Update main API_DOCUMENTATION.md
   - Create user guides for operators
   - Create admin guides for scrap reason management
