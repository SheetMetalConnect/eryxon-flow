---
title: "Database Schema"
description: "PostgreSQL schema reference for Eryxon MES"
---

Database schema for Eryxon MES. Uses Supabase PostgreSQL with Row-Level Security (RLS).

See also: [API Sync Endpoints](/api/api_sync/), [Workflow Engine](/architecture/workflow-engine/), [ERP Integration](/features/erp-integration/)

## Core Concepts

### Multi-Tenancy

All tables include a `tenant_id` column referencing the `tenants` table. Row-Level Security (RLS) policies enforce tenant isolation. Always include `tenant_id` in queries.

### Soft Delete

Core tables support soft delete via:
- `deleted_at` - Timestamp when record was deleted (NULL = active)
- `deleted_by` - UUID of user who performed deletion

### External ID Tracking (ERP Sync)

Tables supporting ERP integration include:
- `external_id` - Unique identifier from external system
- `external_source` - Source system name (e.g., 'SAP', 'NetSuite')
- `synced_at` - Last sync timestamp
- `sync_hash` - MD5 hash for change detection

---

## Entity Relationship Diagram

```
┌──────────────┐
│   tenants    │
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────┐     ┌──────────────┐
│    jobs      │────►│   shipments  │
└──────┬───────┘     └──────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐     ┌──────────────┐
│    parts     │────►│  assignments │
└──────┬───────┘     └──────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  operations  │────►│    issues    │     │  time_entries│
└──────┬───────┘     └──────────────┘     └──────────────┘
       │
       │ N:N
       ▼
┌──────────────┐     ┌──────────────┐
│  resources   │◄────│operation_res │
└──────────────┘     └──────────────┘

┌──────────────┐
│    cells     │ (Work Centers / Stages)
└──────────────┘
```

---

## Core Tables

### tenants

Root table for multi-tenant isolation. Contains subscription and billing info.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Tenant name |
| `company_name` | TEXT | Company display name |
| `plan` | subscription_plan | free, pro, premium, enterprise |
| `status` | subscription_status | active, cancelled, suspended, trial |
| `max_jobs` | INTEGER | Job limit for plan |
| `max_parts_per_month` | INTEGER | Monthly parts limit |
| `current_jobs` | INTEGER | Current job count |
| `current_parts_this_month` | INTEGER | Parts created this month |
| `demo_mode_enabled` | BOOLEAN | Demo data active |
| `timezone` | TEXT | Factory timezone |
| `factory_opening_time` | TIME | Daily start time |
| `factory_closing_time` | TIME | Daily end time |

### jobs

Sales orders / production orders. Parent of parts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | FK to tenants |
| `job_number` | TEXT | Unique job identifier |
| `customer` | TEXT | Customer name |
| `status` | job_status | not_started, in_progress, completed, on_hold |
| `due_date` | TIMESTAMPTZ | Original due date |
| `due_date_override` | TIMESTAMPTZ | Manual override |
| `current_cell_id` | UUID | FK to cells (current work center) |
| `notes` | TEXT | Job notes |
| `metadata` | JSONB | Custom fields |
| `external_id` | TEXT | ERP external ID |
| `external_source` | TEXT | ERP source system |
| `sync_hash` | TEXT | Change detection hash |
| `synced_at` | TIMESTAMPTZ | Last sync time |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

**Indexes:**
- `idx_jobs_external_sync` - Unique on (tenant_id, external_source, external_id) WHERE external_id IS NOT NULL
- `idx_jobs_active` - Partial on (tenant_id, created_at DESC) WHERE deleted_at IS NULL

### parts

Work orders / line items within jobs. Parent of operations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | FK to tenants |
| `job_id` | UUID | FK to jobs |
| `part_number` | TEXT | Part identifier |
| `material` | TEXT | Material type |
| `quantity` | INTEGER | Order quantity |
| `status` | job_status | not_started, in_progress, completed, on_hold |
| `current_cell_id` | UUID | FK to cells |
| `drawing_no` | TEXT | Drawing reference |
| `cnc_program_name` | TEXT | CNC program reference |
| `parent_part_id` | UUID | Self-reference for sub-assemblies |
| `length_mm` | NUMERIC | Dimensions |
| `width_mm` | NUMERIC | Dimensions |
| `height_mm` | NUMERIC | Dimensions |
| `weight_kg` | NUMERIC | Weight |
| `material_lot` | TEXT | Material traceability |
| `material_supplier` | TEXT | Supplier info |
| `material_cert_number` | TEXT | Certificate number |
| `image_paths` | TEXT[] | Part images |
| `file_paths` | TEXT[] | Attached files |
| `is_bullet_card` | BOOLEAN | Bullet card flag |
| `external_id` | TEXT | ERP external ID |
| `external_source` | TEXT | ERP source system |
| `sync_hash` | TEXT | Change detection hash |
| `synced_at` | TIMESTAMPTZ | Last sync time |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

**Indexes:**
- `idx_parts_external_sync` - Unique on (tenant_id, external_source, external_id) WHERE external_id IS NOT NULL
- `idx_parts_active` - Partial on (tenant_id, job_id) WHERE deleted_at IS NULL

### operations

Routing steps / manufacturing operations within parts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | FK to tenants |
| `part_id` | UUID | FK to parts |
| `cell_id` | UUID | FK to cells (work center) |
| `operation_name` | TEXT | Operation description |
| `sequence` | INTEGER | Order in routing |
| `status` | task_status | not_started, in_progress, completed, on_hold |
| `estimated_time` | NUMERIC | Estimated hours |
| `actual_time` | NUMERIC | Recorded hours |
| `setup_time` | NUMERIC | Setup time in hours |
| `run_time_per_unit` | NUMERIC | Per-piece runtime |
| `changeover_time` | NUMERIC | Changeover time |
| `wait_time` | NUMERIC | Queue time |
| `planned_start` | TIMESTAMPTZ | Scheduled start |
| `planned_end` | TIMESTAMPTZ | Scheduled end |
| `completed_at` | TIMESTAMPTZ | Actual completion |
| `completion_percentage` | INTEGER | Progress 0-100 |
| `assigned_operator_id` | UUID | FK to profiles |
| `icon_name` | TEXT | Display icon |
| `external_id` | TEXT | ERP external ID |
| `external_source` | TEXT | ERP source system |
| `synced_at` | TIMESTAMPTZ | Last sync time |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

**Indexes:**
- `idx_operations_external_sync` - Unique on (tenant_id, external_source, external_id) WHERE external_id IS NOT NULL
- `idx_operations_active` - Partial on (tenant_id, part_id) WHERE deleted_at IS NULL

### cells

Work centers / manufacturing stages. Operations are performed at cells.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | FK to tenants |
| `name` | TEXT | Cell/stage name |
| `description` | TEXT | Description |
| `sequence` | INTEGER | Display order |
| `color` | TEXT | Display color |
| `icon_name` | TEXT | Display icon |
| `image_url` | TEXT | Cell image |
| `active` | BOOLEAN | Is active |
| `wip_limit` | INTEGER | Work-in-progress limit |
| `wip_warning_threshold` | INTEGER | Warning threshold |
| `enforce_wip_limit` | BOOLEAN | Block at limit |
| `show_capacity_warning` | BOOLEAN | Show warnings |
| `capacity_hours_per_day` | NUMERIC | Daily capacity |
| `external_id` | TEXT | ERP external ID |
| `external_source` | TEXT | ERP source system |
| `synced_at` | TIMESTAMPTZ | Last sync time |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

### resources

Equipment, tooling, and other resources.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | FK to tenants |
| `name` | TEXT | Resource name |
| `type` | TEXT | Resource type (equipment, tool, fixture, etc.) |
| `identifier` | TEXT | Asset tag / serial number |
| `description` | TEXT | Description |
| `location` | TEXT | Physical location |
| `status` | TEXT | available, in_use, maintenance, etc. |
| `active` | BOOLEAN | Is active |
| `metadata` | JSONB | Custom fields |
| `external_id` | TEXT | ERP external ID |
| `external_source` | TEXT | ERP source system |
| `synced_at` | TIMESTAMPTZ | Last sync time |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

### operation_resources

Many-to-many link between operations and resources.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `operation_id` | UUID | FK to operations |
| `resource_id` | UUID | FK to resources |
| `quantity` | INTEGER | Quantity required |
| `notes` | TEXT | Notes |

### profiles

User accounts. Linked to Supabase auth.users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (matches auth.users.id) |
| `tenant_id` | UUID | FK to tenants |
| `email` | TEXT | Email address |
| `username` | TEXT | Display username |
| `full_name` | TEXT | Full name |
| `role` | app_role | operator, admin |
| `active` | BOOLEAN | Is active |
| `employee_id` | TEXT | Employee ID for operators |
| `pin_hash` | TEXT | Hashed PIN for terminal login |
| `has_email_login` | BOOLEAN | Can login via email |
| `is_machine` | BOOLEAN | Machine account flag |
| `is_root_admin` | BOOLEAN | Root admin flag |
| `onboarding_completed` | BOOLEAN | Completed onboarding |

---

## ERP Sync Fields

### Sync Columns on Core Tables

| Table | Columns |
|-------|---------|
| jobs | external_id, external_source, synced_at, sync_hash |
| parts | external_id, external_source, synced_at, sync_hash |
| operations | external_id, external_source, synced_at |
| resources | external_id, external_source, synced_at |
| cells | external_id, external_source, synced_at |

### sync_imports Table

Tracks batch import operations for audit.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | FK to tenants |
| `source` | TEXT | 'csv', 'api', 'erp_sap', etc. |
| `entity_type` | TEXT | 'jobs', 'parts', 'operations', etc. |
| `status` | TEXT | pending, processing, completed, failed |
| `total_records` | INTEGER | Total records in batch |
| `created_count` | INTEGER | New records created |
| `updated_count` | INTEGER | Existing records updated |
| `skipped_count` | INTEGER | Unchanged records skipped |
| `error_count` | INTEGER | Records with errors |
| `errors` | JSONB | Error details array |
| `file_name` | TEXT | Original filename for CSV |
| `started_at` | TIMESTAMPTZ | Processing start |
| `completed_at` | TIMESTAMPTZ | Processing end |
| `created_by` | UUID | User who initiated |

### Sync Hash Function

```sql
-- Generate MD5 hash for change detection
SELECT generate_sync_hash('{"job_number": "J001", "customer": "ACME"}'::jsonb);
```

---

## Status Enums

### job_status / task_status

```sql
'not_started' | 'in_progress' | 'completed' | 'on_hold'
```

### issue_status

```sql
'pending' | 'approved' | 'rejected' | 'closed'
```

### issue_severity

```sql
'low' | 'medium' | 'high' | 'critical'
```

### app_role

```sql
'operator' | 'admin'
```

### subscription_plan

```sql
'free' | 'pro' | 'premium' | 'enterprise'
```

### subscription_status

```sql
'active' | 'cancelled' | 'suspended' | 'trial'
```

### shipment_status

```sql
'draft' | 'planned' | 'loading' | 'in_transit' | 'delivered' | 'cancelled'
```

---

## Key Functions

### Tenant Context

```sql
-- Get current user's tenant ID (from JWT)
SELECT get_user_tenant_id();

-- Get current user's role
SELECT get_user_role();

-- Check if user is root admin
SELECT is_root_admin();
```

### Quota Functions

```sql
-- Check if can create a job
SELECT can_create_job(p_tenant_id);

-- Check if can create parts
SELECT can_create_parts(p_tenant_id, p_quantity);

-- Get tenant quota info
SELECT * FROM get_tenant_quota(p_tenant_id);
```

### Activity Logging

```sql
-- Log activity and dispatch webhooks
SELECT log_activity_and_webhook(
  p_tenant_id,
  p_user_id,
  p_action,        -- 'create', 'update', 'delete'
  p_entity_type,   -- 'job', 'part', 'operation'
  p_entity_id,
  p_entity_name,
  p_description,
  p_changes,       -- JSONB of changes
  p_metadata       -- Additional metadata
);
```

### Sync Hash Generation

```sql
-- Generate hash for change detection
SELECT generate_sync_hash(
  '{"job_number": "J001", "customer": "ACME"}'::jsonb
);
```

---

## Integration Tables

### api_keys

REST API authentication keys.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | FK to tenants |
| `name` | TEXT | Key name |
| `key_hash` | TEXT | bcrypt hash of full key |
| `key_prefix` | TEXT | First 8 chars for lookup |
| `active` | BOOLEAN | Is active |
| `created_by` | UUID | User who created |
| `last_used_at` | TIMESTAMPTZ | Last usage time |

### webhooks

Outbound webhook configurations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | FK to tenants |
| `url` | TEXT | Webhook endpoint URL |
| `secret_key` | TEXT | HMAC signing key |
| `events` | TEXT[] | Subscribed events |
| `active` | BOOLEAN | Is active |

**Webhook Events:**
- `job.created`, `job.updated`, `job.deleted`
- `part.created`, `part.updated`, `part.deleted`
- `operation.started`, `operation.completed`
- `issue.created`, `issue.resolved`
- `sync.jobs.completed`, `sync.parts.completed`, `sync.batch.completed`

### mqtt_publishers

MQTT publisher configurations for industrial integration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | FK to tenants |
| `name` | TEXT | Publisher name |
| `broker_url` | TEXT | MQTT broker URL |
| `port` | INTEGER | Broker port (default 1883) |
| `username` | TEXT | Auth username |
| `password` | TEXT | Auth password |
| `use_tls` | BOOLEAN | Use TLS/SSL |
| `topic_pattern` | TEXT | Topic pattern with placeholders |
| `events` | TEXT[] | Subscribed events |
| `active` | BOOLEAN | Is active |
| `default_enterprise` | TEXT | ISA-95 enterprise |
| `default_site` | TEXT | ISA-95 site |
| `default_area` | TEXT | ISA-95 area |

### mcp_authentication_keys

MCP server authentication keys.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | FK to tenants |
| `name` | TEXT | Key name |
| `key_hash` | TEXT | bcrypt hash |
| `key_prefix` | TEXT | Lookup prefix |
| `environment` | TEXT | development, staging, production |
| `enabled` | BOOLEAN | Is enabled |
| `allowed_tools` | JSONB | Tool whitelist (null = all) |
| `rate_limit` | INTEGER | Requests per minute |
| `usage_count` | INTEGER | Total usage count |

---

## Useful Queries

### Get Active Jobs with Parts Count

```sql
SELECT
  j.id,
  j.job_number,
  j.customer,
  j.status,
  j.due_date,
  COUNT(p.id) as parts_count,
  SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed_parts
FROM jobs j
LEFT JOIN parts p ON j.id = p.job_id AND p.deleted_at IS NULL
WHERE j.tenant_id = :tenant_id
  AND j.deleted_at IS NULL
GROUP BY j.id
ORDER BY j.due_date;
```

### Get Part Routing (Operations)

```sql
SELECT
  o.id,
  o.sequence,
  o.operation_name,
  o.status,
  c.name as cell_name,
  o.estimated_time,
  o.actual_time,
  p.full_name as assigned_operator
FROM operations o
JOIN cells c ON o.cell_id = c.id
LEFT JOIN profiles p ON o.assigned_operator_id = p.id
WHERE o.part_id = :part_id
  AND o.deleted_at IS NULL
ORDER BY o.sequence;
```

### Look Up by External ID

```sql
-- Find job by external ID
SELECT * FROM jobs
WHERE tenant_id = :tenant_id
  AND external_source = :source
  AND external_id = :external_id
  AND deleted_at IS NULL;

-- Find part by external ID
SELECT * FROM parts
WHERE tenant_id = :tenant_id
  AND external_source = :source
  AND external_id = :external_id
  AND deleted_at IS NULL;
```

### Get Cell WIP Count

```sql
SELECT get_cell_wip_count(:cell_id, :tenant_id);
```

### Get Operations in Cell

```sql
SELECT
  o.*,
  p.part_number,
  j.job_number,
  j.customer
FROM operations o
JOIN parts p ON o.part_id = p.id
JOIN jobs j ON p.job_id = j.id
WHERE o.cell_id = :cell_id
  AND o.tenant_id = :tenant_id
  AND o.status IN ('not_started', 'in_progress')
  AND o.deleted_at IS NULL
ORDER BY j.due_date, o.sequence;
```

### Check Sync Status

```sql
SELECT
  entity_type,
  status,
  total_records,
  created_count,
  updated_count,
  skipped_count,
  error_count,
  completed_at
FROM sync_imports
WHERE tenant_id = :tenant_id
ORDER BY created_at DESC
LIMIT 10;
```

---

## MCP Tool Interactions

### jobs Module

| Tool | Tables Used |
|------|-------------|
| `list_jobs` | jobs, parts |
| `get_job_details` | jobs, parts, operations |
| `create_job` | jobs |
| `update_job_status` | jobs |

### parts Module

| Tool | Tables Used |
|------|-------------|
| `list_parts` | parts, jobs, operations |
| `get_part_details` | parts, operations, cells |
| `create_part` | parts, jobs |
| `update_part_status` | parts |

### operations Module

| Tool | Tables Used |
|------|-------------|
| `list_operations` | operations, parts, cells |
| `start_operation` | operations, time_entries |
| `complete_operation` | operations, time_entries |
| `get_operation_details` | operations, substeps, resources |

### erp_sync Module

| Tool | Tables Used |
|------|-------------|
| `erp_sync_diff` | jobs, parts, resources |
| `erp_sync_execute` | jobs, parts, resources, sync_imports |
| `erp_lookup_external_id` | jobs, parts, operations, resources |
| `erp_sync_status` | sync_imports |
| `erp_batch_lookup` | jobs, parts, resources |
| `erp_resolve_ids` | jobs, parts, cells |

---

## Best Practices

### Always Include tenant_id

```sql
-- Good
SELECT * FROM jobs WHERE tenant_id = :tenant_id AND id = :job_id;

-- Bad - RLS will filter but explicit is better
SELECT * FROM jobs WHERE id = :job_id;
```

### Check Soft Deletes

```sql
-- Good - exclude deleted records
SELECT * FROM jobs WHERE deleted_at IS NULL;

-- Explicit include for admin views
SELECT * FROM jobs WHERE deleted_at IS NOT NULL;
```

### Use Sync Hash for Updates

```sql
-- Calculate hash before update
WITH new_hash AS (
  SELECT generate_sync_hash(:payload::jsonb) as hash
)
UPDATE jobs
SET
  customer = :customer,
  sync_hash = (SELECT hash FROM new_hash),
  synced_at = NOW()
WHERE id = :id
  AND (sync_hash IS NULL OR sync_hash != (SELECT hash FROM new_hash));
```

### Batch Operations with Prefetch

```sql
-- Prefetch existing records by external_id
SELECT id, external_id, sync_hash
FROM jobs
WHERE tenant_id = :tenant_id
  AND external_source = :source
  AND external_id = ANY(:external_ids)
  AND deleted_at IS NULL;
```

---

## Schema Version

Last updated: 2024-12-06

Migration: `20251204000000_add_erp_sync_columns.sql`
