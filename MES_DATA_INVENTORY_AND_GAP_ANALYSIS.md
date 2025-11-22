# MES Data Inventory & Gap Analysis - Eryxon Flow
**Date:** 2025-11-22
**Focus:** Metal Fabrication Shopfloor MES

---

## Executive Summary

Eryxon Flow currently has **strong foundation** for:
- ✅ Time tracking (planned vs actual, detailed time entries)
- ✅ Production routing and workflow
- ✅ Quality/NCR management
- ✅ WIP control (QRM)
- ✅ Operator assignments

**Critical Gaps** for complete MES coverage:
- ❌ **Production quantity tracking** (produced, scrap, rework per operation)
- ❌ **Scrap reason codes and tracking**
- ❌ **Material lot traceability**
- ❌ **Setup vs Run time split**
- ❌ **Yield metrics**

---

## 1. Current MES Data Coverage

### 1.1 Production Planning & Execution ✅ (Partial)

| Field | Table | Status | Notes |
|-------|-------|--------|-------|
| Order Quantity (Planned) | `parts.quantity` | ✅ TRACKED | Integer field |
| Quantity Produced | - | ❌ MISSING | **CRITICAL GAP** |
| Good Quantity | - | ❌ MISSING | **CRITICAL GAP** |
| Scrap Quantity | - | ❌ MISSING | **CRITICAL GAP** |
| Rework Quantity | - | ❌ MISSING | **GAP** |
| Operation Completion % | `operations.completion_percentage` | ✅ TRACKED | 0-100 integer |
| Production Status | `operations.status` | ✅ TRACKED | Enum: not_started, in_progress, completed, on_hold |

**API Support:**
- ✅ Parts CRUD: `/api/parts`
- ✅ Operations CRUD: `/api/operations`
- ❌ Quantity tracking endpoints: NOT IMPLEMENTED

---

### 1.2 Time Tracking ✅ (Strong)

| Field | Table | Status | Notes |
|-------|-------|--------|-------|
| Scheduled/Estimated Time | `operations.estimated_time` | ✅ TRACKED | Minutes (integer) |
| Actual Time (Total) | `operations.actual_time` | ✅ TRACKED | Minutes (integer) |
| Time Entry Start | `time_entries.start_time` | ✅ TRACKED | Timestamp |
| Time Entry End | `time_entries.end_time` | ✅ TRACKED | Timestamp (null if active) |
| Time Entry Duration | `time_entries.duration` | ✅ TRACKED | Seconds (integer) |
| Pause Tracking | `time_entry_pauses` | ✅ TRACKED | Start/end/duration |
| Setup Time | - | ❌ MISSING | **GAP** |
| Run Time | - | ❌ MISSING | **GAP** |

**API Support:**
- ✅ Time entries CRUD: `/api/time-entries`
- ✅ Start/stop/pause: `/api/time-entries/start`, `/api/time-entries/{id}/stop`, `/api/time-entries/{id}/pause`
- ❌ Setup vs Run time split: NOT IMPLEMENTED

**Recommendation:** Add `time_type` field to time_entries (setup, run, rework, wait)

---

### 1.3 Quality & Scrap ⚠️ (Partial)

| Field | Table | Status | Notes |
|-------|-------|--------|-------|
| Issue Description | `issues.description` | ✅ TRACKED | Text field |
| Issue Severity | `issues.severity` | ✅ TRACKED | Enum: low, medium, high, critical |
| NCR Affected Quantity | `issues.metadata` | ⚠️ API ONLY | Via API field, not in base schema |
| NCR Disposition | `issues.metadata` | ⚠️ API ONLY | use_as_is, rework, repair, scrap, return_to_supplier |
| Scrap Quantity by Operation | - | ❌ MISSING | **CRITICAL GAP** |
| Scrap Reason Code | - | ❌ MISSING | **CRITICAL GAP** |
| Rework Reason | - | ❌ MISSING | **GAP** |
| Root Cause | `issues.metadata` | ⚠️ API ONLY | Text field |
| Corrective Action | `issues.metadata` | ⚠️ API ONLY | Text field |
| First Pass Yield | - | ❌ MISSING | Calculated metric |

**API Support:**
- ✅ Issues CRUD: `/api/issues`
- ✅ NCR creation: `/api/issues` (with issue_type: "ncr")
- ❌ Scrap tracking endpoints: NOT IMPLEMENTED
- ❌ Yield metrics: NOT IMPLEMENTED

**Recommendation:**
1. Add scrap tracking table: `operation_quantities`
2. Add scrap reason codes table: `scrap_reasons`
3. Promote NCR fields from API-only to schema columns

---

### 1.4 Material & Inventory ❌ (Major Gap)

| Field | Table | Status | Notes |
|-------|-------|--------|-------|
| Part Material Spec | `parts.material` | ✅ TRACKED | Text description |
| Material Master Data | `materials.name` | ✅ TRACKED | Basic material types |
| Material Lot Number | - | ❌ MISSING | **CRITICAL for traceability** |
| Material Consumed | - | ❌ MISSING | **GAP** |
| Material Stock Level | - | ❌ MISSING | Out of scope? |
| Material Location | - | ❌ MISSING | Out of scope? |
| Material Certification | `resources.metadata` | ⚠️ PARTIAL | For resource materials only |

**API Support:**
- ✅ Materials CRUD: `/api/materials`
- ❌ Lot tracking: NOT IMPLEMENTED
- ❌ Consumption tracking: NOT IMPLEMENTED

**Recommendation for Simple MES:**
1. Add `material_lot` field to parts table
2. Add `material_consumed` to operation_quantities (if tracking raw material per op)
3. Keep full inventory out of scope (use ERP integration instead)

---

### 1.5 Work Centers & Capacity ✅ (Strong)

| Field | Table | Status | Notes |
|-------|-------|--------|-------|
| Cell/Work Center Name | `cells.name` | ✅ TRACKED | Text field |
| WIP Limit | `cells.wip_limit` | ✅ TRACKED | Integer |
| WIP Warning Threshold | `cells.wip_warning_threshold` | ✅ TRACKED | Integer |
| Enforce WIP Limit | `cells.enforce_wip_limit` | ✅ TRACKED | Boolean |
| Current WIP Count | Calculated | ✅ TRACKED | Via RPC function `get_cell_wip_status` |
| Cell Color/Icon | `cells.color`, `cells.icon_name` | ✅ TRACKED | Visual indicators |

**API Support:**
- ✅ Cells CRUD: `/api/cells`
- ✅ WIP status: RPC `get_cell_wip_status`

---

### 1.6 Orders & References ✅ (Strong)

| Field | Table | Status | Notes |
|-------|-------|--------|-------|
| Job Number | `jobs.job_number` | ✅ TRACKED | Unique identifier |
| Customer | `jobs.customer` | ✅ TRACKED | Text field |
| Customer PO | `jobs.metadata.poNumber` | ✅ TRACKED | JSONB metadata |
| Due Date | `jobs.due_date` | ✅ TRACKED | Timestamp |
| Due Date Override | `jobs.due_date_override` | ✅ TRACKED | Timestamp |
| Job Notes | `jobs.notes` | ✅ TRACKED | Text field |
| Part Number | `parts.part_number` | ✅ TRACKED | Text field |
| Part Revision | `parts.metadata.revision` | ✅ TRACKED | JSONB metadata |
| Drawing Number | `parts.metadata.drawingNumber` | ✅ TRACKED | JSONB metadata |
| Project Name | `jobs.metadata.projectName` | ✅ TRACKED | JSONB metadata |
| Priority | `jobs.metadata.priority` | ✅ TRACKED | low, normal, high, urgent |
| Special Instructions | `jobs.metadata.specialInstructions` | ✅ TRACKED | JSONB metadata |

**API Support:**
- ✅ Jobs CRUD: `/api/jobs`
- ✅ Full metadata access via API

---

### 1.7 Operator & Labor ✅ (Strong)

| Field | Table | Status | Notes |
|-------|-------|--------|-------|
| Operator Name | `profiles.full_name` | ✅ TRACKED | Text field |
| Operator Username | `profiles.username` | ✅ TRACKED | Text field |
| Operator Role | `profiles.role` | ✅ TRACKED | Enum: operator, admin |
| Assignment Status | `assignments.status` | ✅ TRACKED | assigned, accepted, in_progress, completed |
| Labor Time per Operation | `time_entries` | ✅ TRACKED | Detailed time tracking |
| Labor Cost | - | ❌ MISSING | Optional enhancement |

**API Support:**
- ✅ Profiles: `/api/profiles`
- ✅ Assignments: `/api/assignments`
- ✅ Time tracking: `/api/time-entries`

---

### 1.8 Process & Routing ✅ (Excellent)

| Field | Table | Status | Notes |
|-------|-------|--------|-------|
| Operation Name | `operations.operation_name` | ✅ TRACKED | Text description |
| Operation Sequence | `operations.sequence` | ✅ TRACKED | Integer for routing order |
| Operation Type/Icon | `operations.icon_name` | ✅ TRACKED | Visual indicator |
| Cell Assignment | `operations.cell_id` | ✅ TRACKED | FK to cells |
| Process Parameters | `operations.metadata` | ✅ TRACKED | Extensive JSONB for all process types |
| Setup Instructions | `operations.metadata.setupInstructions` | ✅ TRACKED | JSONB |
| Safety Notes | `operations.metadata.safetyNotes` | ✅ TRACKED | JSONB |
| Quality Checks | `operations.metadata.qualityChecks` | ✅ TRACKED | JSONB |
| Substeps/Checklist | `substeps` | ✅ TRACKED | Granular task breakdown |

**Process Metadata Coverage:**
- ✅ Bending (angles, radius, tooling, sequence, spring-back)
- ✅ Welding (type, amperage, voltage, wire speed, gas, joint type)
- ✅ Laser Cutting (power, speed, frequency, gas, focus height)
- ✅ CNC Machining (program, feed rate, spindle speed, depth, coolant)
- ✅ Assembly (components, fasteners, adhesives, sequence)
- ✅ Inspection (type, checkpoints, criteria, sampling)

**API Support:**
- ✅ Operations CRUD: `/api/operations`
- ✅ Full metadata CRUD support
- ✅ Substeps: `/api/substeps`

---

## 2. Critical MES Gaps for Metal Fabrication

### 2.1 Production Quantity Tracking ❌ **CRITICAL**

**Missing:**
- Quantity produced (good parts) per operation
- Scrap quantity per operation
- Rework quantity
- Yield calculation (good / total produced)

**Business Impact:**
- Cannot track actual production output
- Cannot measure scrap rates or costs
- Cannot calculate OEE (Overall Equipment Effectiveness)
- Cannot identify problem operations

**Proposed Solution:**
Create new table: `operation_quantities`

```sql
CREATE TABLE operation_quantities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES profiles(id),

  -- Quantity tracking
  quantity_produced INTEGER NOT NULL DEFAULT 0,  -- Total pieces produced
  quantity_good INTEGER NOT NULL DEFAULT 0,      -- Good/accepted pieces
  quantity_scrap INTEGER NOT NULL DEFAULT 0,     -- Scrapped pieces
  quantity_rework INTEGER NOT NULL DEFAULT 0,    -- Pieces sent to rework

  -- Traceability
  material_lot TEXT,                              -- Material lot/heat number

  -- Timing
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Notes
  notes TEXT,

  -- Metadata for extensibility
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**API Endpoints:**
- `POST /api/operation-quantities` - Record production quantities
- `GET /api/operation-quantities?operation_id={id}` - Get quantities for operation
- `PUT /api/operation-quantities/{id}` - Update quantity record
- `DELETE /api/operation-quantities/{id}` - Delete quantity record

---

### 2.2 Scrap Reason Codes ❌ **CRITICAL**

**Missing:**
- Standardized scrap reason codes
- Scrap categorization (material, process, equipment, operator, design)

**Business Impact:**
- Cannot identify root causes of scrap
- Cannot drive continuous improvement
- Cannot assign scrap costs correctly

**Proposed Solution:**
Create new table: `scrap_reasons`

```sql
CREATE TABLE scrap_reasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  code TEXT NOT NULL,                             -- e.g., "MATL-001", "PROC-002"
  description TEXT NOT NULL,                       -- Human-readable description
  category TEXT NOT NULL,                          -- material, process, equipment, operator, design, other

  -- Active flag
  active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, code)
);
```

**Link to Quantity Tracking:**
Add to `operation_quantities`:
```sql
ALTER TABLE operation_quantities
  ADD COLUMN scrap_reason_id UUID REFERENCES scrap_reasons(id);
```

**API Endpoints:**
- `GET /api/scrap-reasons` - List scrap reason codes
- `POST /api/scrap-reasons` - Create new scrap reason
- `PUT /api/scrap-reasons/{id}` - Update scrap reason
- `DELETE /api/scrap-reasons/{id}` - Soft delete (set active=false)

---

### 2.3 Setup vs Run Time Split ⚠️ **IMPORTANT**

**Current:** Only total time tracked
**Missing:** Distinguish between setup time and run time

**Business Impact:**
- Cannot calculate setup reduction opportunities
- Cannot accurately estimate job costs
- Cannot optimize batch sizes based on setup/run ratios

**Proposed Solution:**
Add `time_type` to existing `time_entries` table:

```sql
ALTER TABLE time_entries
  ADD COLUMN time_type TEXT NOT NULL DEFAULT 'run'
  CHECK (time_type IN ('setup', 'run', 'rework', 'wait', 'breakdown'));
```

**API Enhancement:**
- `POST /api/time-entries/start` - Add `time_type` parameter
- `GET /api/time-entries?operation_id={id}&time_type=setup` - Filter by type

---

### 2.4 Material Lot Traceability ⚠️ **IMPORTANT**

**Missing:**
- Material lot/heat number tracking
- Link from parts to material lots consumed

**Business Impact:**
- Cannot trace material genealogy (required for aerospace/medical)
- Cannot perform lot recalls
- Cannot correlate material batches to quality issues

**Proposed Solution:**
Add fields to `parts` table:

```sql
ALTER TABLE parts
  ADD COLUMN material_lot TEXT,                   -- Primary material lot/heat number
  ADD COLUMN material_supplier TEXT,              -- Material supplier
  ADD COLUMN material_cert_number TEXT;           -- Material certification number
```

For operations consuming materials, use `operation_quantities.material_lot`

**API Enhancement:**
- Parts CRUD already supports new fields via JSONB metadata
- Promote to explicit columns for queryability

---

### 2.5 Order Description & Reference Fields ✅ (Mostly Complete)

**Current Coverage:**
- ✅ Job notes
- ✅ Part notes
- ✅ Operation notes
- ✅ Customer PO in metadata
- ✅ Project name in metadata
- ✅ Special instructions in metadata
- ✅ Drawing number in metadata
- ✅ Revision in metadata

**Minor Enhancement:**
Consider promoting frequently-used metadata fields to explicit columns:

```sql
ALTER TABLE jobs
  ADD COLUMN customer_po TEXT,                    -- Promote from metadata
  ADD COLUMN project_name TEXT,                   -- Promote from metadata
  ADD COLUMN shipping_method TEXT;                -- Promote from metadata

ALTER TABLE parts
  ADD COLUMN revision TEXT,                       -- Promote from metadata
  ADD COLUMN drawing_number TEXT;                 -- Promote from metadata
```

**Trade-off:** Metadata is more flexible, but explicit columns are more queryable

---

## 3. Recommended Implementation Plan

### Phase 1: Critical Production Tracking (Priority 1)
**Goal:** Enable basic quantity and scrap tracking

1. **Create `operation_quantities` table**
   - Fields: quantity_produced, quantity_good, quantity_scrap, material_lot
   - API endpoints: Full CRUD
   - UI: Add quantity input to operator terminal

2. **Create `scrap_reasons` table**
   - Seed with standard metal fabrication scrap codes
   - API endpoints: Full CRUD
   - UI: Scrap reason dropdown when recording scrap

3. **Add time_type to time_entries**
   - Enable setup vs run time tracking
   - API: Add time_type parameter to start endpoint
   - UI: Allow operator to select time type when starting timer

**SQL Migration:** `20251122_add_production_quantity_tracking.sql`

---

### Phase 2: Material Traceability (Priority 2)
**Goal:** Enable lot tracking for compliance

1. **Add material lot fields to parts**
   - Fields: material_lot, material_supplier, material_cert_number
   - API: Already supported via parts CRUD
   - UI: Add material lot input to part form

2. **Enhance operation_quantities with lot tracking**
   - Already included in Phase 1 schema
   - UI: Material lot displayed/editable when recording quantities

**SQL Migration:** Included in Phase 1 migration

---

### Phase 3: Metadata Promotion (Priority 3)
**Goal:** Improve queryability of common fields

1. **Promote NCR fields from API-only to schema**
   - Add explicit columns to `issues` table for NCR data
   - Migrate existing API-only data to new columns
   - Update API to use new columns

2. **Consider promoting common job/part metadata**
   - customer_po, project_name, revision, drawing_number
   - Evaluate based on query patterns

**SQL Migration:** `20251122_promote_ncr_fields.sql`

---

## 4. API-First Compliance Checklist

All proposed fields must meet these requirements:

### ✅ CRUD Operations
- [ ] Create: POST endpoint
- [ ] Read: GET endpoint (single + list)
- [ ] Update: PUT/PATCH endpoint
- [ ] Delete: DELETE endpoint (soft delete preferred)

### ✅ Filtering & Querying
- [ ] Filter by tenant_id (multi-tenancy)
- [ ] Filter by foreign keys (e.g., operation_id, part_id)
- [ ] Filter by status/active flags
- [ ] Filter by date ranges

### ✅ Metadata Support
- [ ] JSONB metadata column for extensibility
- [ ] Metadata fully accessible via API
- [ ] Validation for known metadata schemas
- [ ] Documentation of metadata fields

### ✅ Workflow Integration
- [ ] Status transitions enforced (if applicable)
- [ ] Audit fields: created_at, updated_at, created_by
- [ ] Soft deletes where appropriate (active flag)
- [ ] Cascade deletes where appropriate

### ✅ MCP/External Access
- [ ] All endpoints documented in API_DOCUMENTATION.md
- [ ] TypeScript types exported in src/integrations/supabase/types.ts
- [ ] Row Level Security (RLS) policies for multi-tenancy
- [ ] Proper indexes for performance

---

## 5. Standard MES Data Fields - Coverage Matrix

| Category | Field | Current Status | Proposed |
|----------|-------|----------------|----------|
| **Production Planning** | | | |
| | Order Quantity | ✅ parts.quantity | Keep |
| | Quantity Produced | ❌ Missing | ✅ operation_quantities.quantity_produced |
| | Quantity Good | ❌ Missing | ✅ operation_quantities.quantity_good |
| | Quantity Scrap | ❌ Missing | ✅ operation_quantities.quantity_scrap |
| | Quantity Rework | ❌ Missing | ✅ operation_quantities.quantity_rework |
| | Due Date | ✅ jobs.due_date | Keep |
| | Priority | ✅ jobs.metadata.priority | Keep |
| **Time Tracking** | | | |
| | Time Scheduled | ✅ operations.estimated_time | Keep |
| | Time Actual | ✅ operations.actual_time | Keep |
| | Time Setup | ❌ Missing | ✅ time_entries (time_type='setup') |
| | Time Run | ⚠️ Implicit | ✅ time_entries (time_type='run') |
| | Time Rework | ❌ Missing | ✅ time_entries (time_type='rework') |
| | Time Wait | ❌ Missing | ✅ time_entries (time_type='wait') |
| **Quality** | | | |
| | Issue Description | ✅ issues.description | Keep |
| | Issue Severity | ✅ issues.severity | Keep |
| | Scrap Reason | ❌ Missing | ✅ scrap_reasons table |
| | Root Cause | ⚠️ API only | ✅ Promote to column |
| | Corrective Action | ⚠️ API only | ✅ Promote to column |
| | NCR Number | ⚠️ API only | ✅ Promote to column |
| **Material** | | | |
| | Material Type | ✅ parts.material | Keep |
| | Material Lot | ❌ Missing | ✅ parts.material_lot |
| | Material Cert | ❌ Missing | ✅ parts.material_cert_number |
| | Material Supplier | ❌ Missing | ✅ parts.material_supplier |
| **References** | | | |
| | Job Number | ✅ jobs.job_number | Keep |
| | Part Number | ✅ parts.part_number | Keep |
| | Customer | ✅ jobs.customer | Keep |
| | Customer PO | ✅ jobs.metadata.poNumber | Optional: Promote |
| | Drawing Number | ✅ parts.metadata.drawingNumber | Optional: Promote |
| | Revision | ✅ parts.metadata.revision | Optional: Promote |
| | Notes/Memos | ✅ jobs/parts/operations.notes | Keep |
| | Special Instructions | ✅ jobs.metadata | Keep |

---

## 6. Summary & Next Steps

### Current State
- **Strong:** Time tracking, routing, quality issues, work center management
- **Gaps:** Production quantities, scrap tracking, material lots, setup/run split

### Recommended Actions

1. **Immediate (Phase 1):**
   - Create `operation_quantities` table for production tracking
   - Create `scrap_reasons` table for scrap categorization
   - Add `time_type` to `time_entries` for setup/run split
   - **Estimated effort:** 1 migration script + API updates

2. **Near-term (Phase 2):**
   - Add material lot fields to `parts` table
   - Update operator terminal UI to capture quantities/scrap
   - **Estimated effort:** Schema updates + UI enhancements

3. **Future (Phase 3):**
   - Promote NCR fields from API-only to schema columns
   - Consider promoting common metadata fields
   - Add calculated views for yield/OEE metrics
   - **Estimated effort:** Data migration + schema refactor

### API Compliance
All proposed changes follow API-first principles:
- ✅ Full CRUD via REST endpoints
- ✅ JSONB metadata for extensibility
- ✅ Proper multi-tenancy via RLS
- ✅ Audit trails (created_at, updated_at)
- ✅ MCP-compatible (standard REST + TypeScript types)

---

## Appendix A: Example Scrap Reason Codes

```sql
-- Material defects
MATL-001: Raw material defect/damage
MATL-002: Wrong material used
MATL-003: Material thickness out of tolerance
MATL-004: Material hardness issue

-- Process defects
PROC-001: Incorrect dimensions
PROC-002: Surface finish defect
PROC-003: Burrs/sharp edges
PROC-004: Weld defect
PROC-005: Bend angle out of tolerance
PROC-006: Hole position incorrect

-- Equipment issues
EQUIP-001: Machine malfunction
EQUIP-002: Tool wear/breakage
EQUIP-003: Equipment calibration error

-- Operator errors
OPER-001: Setup error
OPER-002: Programming error
OPER-003: Handling damage

-- Design issues
DESIGN-001: Drawing error
DESIGN-002: Design cannot be manufactured
DESIGN-003: Tolerance too tight
```

---

## Appendix B: Sample API Requests

### Record Production Quantity
```http
POST /api/operation-quantities
Content-Type: application/json

{
  "operation_id": "uuid-here",
  "quantity_produced": 25,
  "quantity_good": 23,
  "quantity_scrap": 2,
  "quantity_rework": 0,
  "material_lot": "LOT-2024-1234",
  "scrap_reason_id": "uuid-of-proc-001",
  "notes": "2 parts scrapped due to incorrect bend angle"
}
```

### Start Setup Time
```http
POST /api/time-entries/start
Content-Type: application/json

{
  "operation_id": "uuid-here",
  "operator_id": "uuid-here",
  "time_type": "setup"
}
```

### Query Scrap by Reason
```http
GET /api/operation-quantities?scrap_reason_id={uuid}&from_date=2025-11-01
```
