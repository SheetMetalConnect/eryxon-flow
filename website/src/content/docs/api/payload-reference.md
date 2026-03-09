---
title: "API Payload Reference"
description: "Payload schemas, field constraints, and copy-paste examples for Eryxon Flow APIs."
---

# Eryxon Flow - API Payload Reference

This document provides exact payload schemas, field constraints, and copy-paste examples for every API endpoint. Use this as a quick reference when integrating with the Eryxon API.

---

## Table of Contents

1. [Jobs API](#jobs-api)
2. [Parts API](#parts-api)
3. [Operations API](#operations-api)
4. [Issues / NCR API](#issues--ncr-api)
5. [Substeps API](#substeps-api)
6. [Webhooks API](#webhooks-api)
7. [Job Lifecycle API](#job-lifecycle-api)
8. [Operation Lifecycle API](#operation-lifecycle-api)
9. [Other APIs](#other-apis)
10. [Common Patterns](#common-patterns)

---

## Jobs API

**Endpoint:** `POST /functions/v1/api-jobs`

### POST - Create Job (with nested parts & operations)

This is the primary endpoint for ERP integration. Creates a job with all parts and operations in a single call.

```json
{
  "job_number": "JOB-2024-001",
  "customer": "ACME Corp",
  "due_date": "2024-12-31",
  "priority": 1,
  "notes": "Rush order - customer priority",
  "metadata": {
    "po_number": "PO-12345",
    "erp_ref": "SAP-001"
  },
  "parts": [
    {
      "part_number": "PART-001",
      "material": "Aluminum 6061-T6",
      "quantity": 10,
      "description": "Main housing",
      "drawing_no": "DWG-001-A",
      "cnc_program_name": "HOUSING_V2",
      "operations": [
        {
          "operation_name": "CNC Milling",
          "sequence": 1,
          "estimated_time_minutes": 120,
          "setup_time_minutes": 15,
          "instructions": "Use 0.5 inch end mill, coolant on"
        },
        {
          "operation_name": "Deburr",
          "sequence": 2,
          "estimated_time_minutes": 30
        }
      ]
    },
    {
      "part_number": "PART-002",
      "material": "Steel 4140",
      "quantity": 5,
      "operations": [
        {
          "operation_name": "Turning",
          "sequence": 1,
          "estimated_time_minutes": 60
        }
      ]
    }
  ]
}
```

#### Field Reference

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `job_number` | string | **Yes** | 1-255 chars, unique per tenant | Primary identifier |
| `customer` | string | No | max 255 chars | Customer name |
| `due_date` | string | No | ISO 8601 date | e.g. `"2024-12-31"` |
| `priority` | integer | No | >= 0 | Higher = more urgent |
| `notes` | string | No | - | Free text |
| `status` | string | No | enum | `not_started` (default), `in_progress`, `on_hold`, `completed` |
| `metadata` | object | No | JSON object | Arbitrary key-value data |
| `current_cell_id` | UUID | No | must exist in cells | Current work cell |
| `parts` | array | **Yes** | min 1 item | See Parts fields below |

#### Nested Part Fields (within Job creation)

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `part_number` | string | **Yes** | 1-255 chars, unique within job |
| `quantity` | integer | **Yes** | >= 1 |
| `material` | string | No | - |
| `description` | string | No | - |
| `drawing_no` | string | No | max 255 chars |
| `cnc_program_name` | string | No | max 255 chars |
| `parent_part_id` | UUID | No | must exist, same job |
| `current_cell_id` | UUID | No | must exist in cells |
| `material_id` | UUID | No | must exist in materials |
| `operations` | array | **Yes** | min 1 item |

#### Nested Operation Fields (within Part creation)

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `operation_name` | string | **Yes** | 1-255 chars |
| `sequence` | integer | **Yes** | >= 1, unique within part |
| `cell_id` | UUID | No | must exist in cells |
| `assigned_operator_id` | UUID | No | must exist in profiles |
| `estimated_time_minutes` | number | No | >= 0 |
| `setup_time_minutes` | number | No | >= 0 |
| `instructions` | string | No | - |

#### Success Response (201)

```json
{
  "success": true,
  "data": {
    "job": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "job_number": "JOB-2024-001",
      "customer": "ACME Corp",
      "status": "not_started",
      "parts": [
        {
          "id": "...",
          "part_number": "PART-001",
          "operations": [
            {
              "id": "...",
              "operation_name": "CNC Milling"
            }
          ]
        }
      ]
    }
  }
}
```

### GET - List Jobs

```
GET /functions/v1/api-jobs?status=in_progress&customer=ACME&limit=50&offset=0&sort=due_date&order=asc
```

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | UUID | - | Get single job by ID |
| `status` | string | - | `not_started`, `in_progress`, `on_hold`, `completed` |
| `customer` | string | - | Fuzzy match (partial) |
| `job_number` | string | - | Fuzzy match (partial) |
| `priority` | integer | - | Exact match |
| `search` | string | - | Full-text across job_number, customer |
| `sort` | string | `created_at` | `job_number`, `customer`, `due_date`, `created_at`, `status`, `priority` |
| `order` | string | `desc` | `asc` or `desc` |
| `limit` | integer | 100 | 1-1000 |
| `offset` | integer | 0 | Pagination offset |

### PATCH - Update Job

```
PATCH /functions/v1/api-jobs?id=<job-id>
```

```json
{
  "status": "in_progress",
  "customer": "Updated Customer",
  "due_date": "2025-01-15",
  "notes": "Updated notes",
  "metadata": {"updated": true}
}
```

**Allowed update fields:** `status`, `customer`, `due_date`, `due_date_override`, `notes`, `metadata`

### DELETE - Delete Job (soft delete)

```
DELETE /functions/v1/api-jobs?id=<job-id>
```

Sets `deleted_at` timestamp. Job no longer appears in queries.

### PUT /sync - Sync single job by external ID

```
PUT /functions/v1/api-jobs/sync
```

```json
{
  "external_id": "SAP-JOB-001",
  "external_source": "sap",
  "job_number": "JOB-2024-001",
  "customer": "ACME Corp",
  "parts": [...]
}
```

**Required:** `external_id`, `external_source`

### POST /bulk-sync - Bulk sync jobs

```
POST /functions/v1/api-jobs/bulk-sync
```

```json
{
  "items": [
    {
      "external_id": "SAP-JOB-001",
      "external_source": "sap",
      "job_number": "JOB-2024-001",
      "customer": "ACME"
    },
    {
      "external_id": "SAP-JOB-002",
      "external_source": "sap",
      "job_number": "JOB-2024-002",
      "customer": "Widgets Inc"
    }
  ]
}
```

---

## Parts API

**Endpoint:** `/functions/v1/api-parts`

### POST - Create Part

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "part_number": "PART-003",
  "material": "Aluminum 6061",
  "quantity": 10,
  "description": "Bracket assembly",
  "drawing_no": "DWG-003",
  "cnc_program_name": "BRACKET_V1",
  "is_bullet_card": false,
  "material_lot": "LOT-2024-A1",
  "material_supplier": "MetalCo",
  "material_cert_number": "CERT-12345",
  "notes": "Heat treat required",
  "metadata": {"revision": "B"},
  "file_paths": ["drawings/bracket.pdf"]
}
```

#### Field Reference

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `job_id` | UUID | **Yes** | must exist in jobs |
| `part_number` | string | **Yes** | 1-255 chars, unique within job |
| `quantity` | integer | **Yes** | >= 1 |
| `material` | string | No | - |
| `description` | string | No | - |
| `drawing_no` | string | No | max 255 chars |
| `cnc_program_name` | string | No | max 255 chars |
| `is_bullet_card` | boolean | No | default `false` |
| `material_lot` | string | No | - |
| `material_supplier` | string | No | - |
| `material_cert_number` | string | No | - |
| `parent_part_id` | UUID | No | must exist, same job, not self |
| `current_cell_id` | UUID | No | must exist in cells |
| `material_id` | UUID | No | must exist in materials |
| `notes` | string | No | - |
| `metadata` | object | No | JSON object |
| `file_paths` | array | No | array of strings |

### GET - List Parts

```
GET /functions/v1/api-parts?job_id=<uuid>&status=in_progress&material=Aluminum&limit=50
```

| Param | Type | Notes |
|-------|------|-------|
| `id` | UUID | Get single part |
| `job_id` | UUID | Filter by job |
| `job_number` | string | Filter by job number (fuzzy, requires join) |
| `part_number` | string | Fuzzy match |
| `material` | string | Exact match |
| `material_lot` | string | Exact match |
| `status` | string | `not_started`, `in_progress`, `completed` |
| `search` | string | Full-text across part_number, notes |
| `sort` | string | `part_number`, `material`, `status`, `created_at`, `quantity` |
| `order` | string | `asc` or `desc` |
| `limit` | integer | 1-1000 (default 100) |
| `offset` | integer | Pagination offset |

### PATCH - Update Part

```
PATCH /functions/v1/api-parts?id=<part-id>
```

Standard CRUD update. Any field except `tenant_id`, `id`, `created_at`.

### DELETE - Delete Part (hard delete)

```
DELETE /functions/v1/api-parts?id=<part-id>
```

**Validation:** Cannot delete if part has child parts. Operations are cascade-deleted.

---

## Operations API

**Endpoint:** `/functions/v1/api-operations`

### POST - Create Operation

```json
{
  "part_id": "550e8400-e29b-41d4-a716-446655440000",
  "operation_name": "Welding",
  "sequence": 3,
  "cell_id": "550e8400-e29b-41d4-a716-446655440001",
  "assigned_operator_id": "550e8400-e29b-41d4-a716-446655440002",
  "estimated_time_minutes": 60,
  "setup_time_minutes": 10,
  "instructions": "TIG weld only, inspect after"
}
```

#### Field Reference

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `part_id` | UUID | **Yes** | must exist in parts |
| `operation_name` | string | **Yes** | 1-255 chars |
| `sequence` | integer | No | >= 1, auto-assigned if omitted |
| `cell_id` | UUID | No | must exist in cells |
| `assigned_operator_id` | UUID | No | must exist in profiles |
| `estimated_time_minutes` | number | No | >= 0 |
| `setup_time_minutes` | number | No | >= 0 |
| `instructions` | string | No | mapped to `notes` field |
| `status` | string | No | `not_started` (default), `in_progress`, `paused`, `completed` |

**Note:** If `sequence` is omitted, it is auto-calculated as max(existing) + 1.

### GET - List Operations

```
GET /functions/v1/api-operations?part_id=<uuid>&status=in_progress&sort=sequence&order=asc
```

| Param | Type | Notes |
|-------|------|-------|
| `id` | UUID | Get single operation |
| `part_id` | UUID | Filter by part |
| `job_id` | UUID | Filter by job (finds parts first) |
| `cell_id` | UUID | Exact match |
| `cell_name` | string | Fuzzy match (requires join) |
| `status` | string | `not_started`, `in_progress`, `paused`, `completed` |
| `assigned_operator_id` | UUID | Filter by operator |
| `operation_name` | string | Fuzzy match |
| `search` | string | Full-text across operation_name, notes |
| `sort` | string | `sequence`, `created_at`, `estimated_time`, `actual_time`, `status`, `completion_percentage` |
| `order` | string | `asc` or `desc` |
| `limit` | integer | 1-1000 (default 100) |
| `offset` | integer | Pagination offset |

### PATCH - Update Operation

```
PATCH /functions/v1/api-operations?id=<operation-id>
```

```json
{
  "status": "completed",
  "completion_percentage": 100,
  "notes": "Done, QA passed",
  "actual_time": 45,
  "cell_id": "...",
  "assigned_operator_id": "..."
}
```

**Allowed update fields:** `status`, `completion_percentage`, `notes`, `assigned_operator_id`, `actual_time`, `cell_id`

**Auto-behavior:** Setting `status` to `completed` auto-sets `completed_at` timestamp.

### DELETE - Delete Operation

```
DELETE /functions/v1/api-operations?id=<operation-id>
```

**Validation:** Cannot delete if operation has time entries.

---

## Issues / NCR API

**Endpoint:** `/functions/v1/api-issues`

### POST - Create Issue

```json
{
  "operation_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Surface finish out of spec",
  "description": "Ra measured 3.2, spec requires 1.6",
  "severity": "high",
  "status": "open"
}
```

### POST - Create NCR (Non-Conformance Report)

```json
{
  "operation_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Dimensional Out of Tolerance",
  "description": "Part hole diameter measured 0.505 inch, spec is 0.500 +/- 0.002",
  "severity": "high",
  "issue_type": "ncr",
  "ncr_category": "process",
  "affected_quantity": 5,
  "ncr_disposition": "rework",
  "root_cause": "Tool wear - end mill exceeded replacement interval",
  "corrective_action": "Replaced tool, re-machined 5 parts",
  "preventive_action": "Implemented tool life tracking in system",
  "verification_required": true,
  "reported_by_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

#### Field Reference

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `operation_id` | UUID | **Yes** | must exist in operations |
| `title` | string | **Yes** | 1-255 chars |
| `description` | string | **Yes** | min 1 char |
| `severity` | string | No | `low`, `medium`, `high`, `critical` |
| `status` | string | No | `open` (default), `in_progress`, `resolved`, `closed` |
| `issue_type` | string | No | `general` (default), `ncr` |
| `reported_by_id` | UUID | No | must exist in profiles |
| `resolved_by_id` | UUID | No | must exist in profiles |
| `verified_by_id` | UUID | No | must exist in profiles |

**NCR-specific fields** (when `issue_type` = `"ncr"`):

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `ncr_number` | string | No | max 50 chars, auto-generated if omitted |
| `ncr_category` | string | No | `material`, `process`, `equipment`, `design`, `supplier`, `documentation`, `other` |
| `ncr_disposition` | string | No | `use_as_is`, `rework`, `repair`, `scrap`, `return_to_supplier` |
| `root_cause` | string | No | - |
| `corrective_action` | string | No | - |
| `preventive_action` | string | No | - |
| `affected_quantity` | integer | No | - |
| `verification_required` | boolean | No | - |

### GET - List Issues

```
GET /functions/v1/api-issues?severity=high&status=open&issue_type=ncr
```

| Param | Type | Notes |
|-------|------|-------|
| `id` | UUID | Get single issue |
| `severity` | string | `low`, `medium`, `high`, `critical` |
| `status` | string | `open`, `in_progress`, `resolved`, `closed` |
| `reported_by` | UUID | Filter by reporter |
| `assigned_to` | UUID | Filter by assignee |
| `job_id` | UUID | Filter by job |
| `part_id` | UUID | Filter by part |
| `operation_id` | UUID | Filter by operation |
| `search` | string | Full-text across title, description |
| `sort` | string | `created_at`, `severity`, `status`, `resolved_at` |

### PATCH - Update Issue

```
PATCH /functions/v1/api-issues?id=<issue-id>
```

```json
{
  "status": "resolved",
  "resolution_notes": "Parts re-machined and verified"
}
```

---

## Substeps API

**Endpoint:** `/functions/v1/api-substeps`

### POST - Create Substep

```json
{
  "operation_id": "550e8400-e29b-41d4-a716-446655440000",
  "description": "Measure hole diameter with caliper",
  "sequence": 1
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `operation_id` | UUID | **Yes** | must exist |
| `description` | string | **Yes** | - |
| `sequence` | integer | **Yes** | >= 1 |
| `completed` | boolean | No | default `false` |

### PATCH - Complete Substep

```
PATCH /functions/v1/api-substeps?id=<substep-id>
```

```json
{
  "completed": true
}
```

### GET - List Substeps

```
GET /functions/v1/api-substeps?operation_id=<uuid>&completed=false
```

| Param | Type | Notes |
|-------|------|-------|
| `operation_id` | UUID | Filter by operation |
| `completed` | boolean | `true` or `false` |
| `sort` | string | `sequence`, `created_at`, `completed` |

---

## Webhooks API

**Endpoint:** `/functions/v1/api-webhooks`

### POST - Create Webhook

```json
{
  "url": "https://your-erp.com/webhooks/eryxon",
  "event_type": "job.completed",
  "active": true
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `url` | string | **Yes** | Valid URL |
| `event_type` | string | **Yes** | See webhook events list |
| `active` | boolean | No | default `true` |

**Available event types:**
`job.created`, `job.started`, `job.stopped`, `job.resumed`, `job.completed`, `job.updated`,
`part.created`, `part.updated`, `part.started`, `part.completed`,
`operation.started`, `operation.paused`, `operation.resumed`, `operation.completed`,
`issue.created`, `ncr.created`, `ncr.verified`,
`step.added`, `step.completed`

### GET - List Webhooks

```
GET /functions/v1/api-webhooks?event_type=job.completed&active=true
```

### PATCH - Update Webhook

```
PATCH /functions/v1/api-webhooks?id=<webhook-id>
```

```json
{
  "active": false
}
```

---

## Job Lifecycle API

**Endpoint:** `/functions/v1/api-job-lifecycle`

All lifecycle operations use POST with the operation as the URL path segment.

### Start Job

```
POST /functions/v1/api-job-lifecycle/start?id=<job-id>
```

**Precondition:** Status must be `not_started` or `on_hold`
**Result:** Status becomes `in_progress`, sets `started_at` (first time only)
**Webhook:** `job.started`

### Stop/Pause Job

```
POST /functions/v1/api-job-lifecycle/stop?id=<job-id>
```

**Precondition:** Status must be `in_progress`
**Result:** Status becomes `on_hold`, sets `paused_at`
**Webhook:** `job.stopped`

### Complete Job

```
POST /functions/v1/api-job-lifecycle/complete?id=<job-id>
```

**Precondition:** Status must be `in_progress`
**Result:** Status becomes `completed`, sets `completed_at`, calculates `actual_duration`
**Webhook:** `job.completed`

### Resume Job

```
POST /functions/v1/api-job-lifecycle/resume?id=<job-id>
```

**Precondition:** Status must be `on_hold`
**Result:** Status becomes `in_progress`, sets `resumed_at`, clears `paused_at`
**Webhook:** `job.resumed`

### State Transition Diagram

```
not_started ──start──> in_progress ──stop──> on_hold
                          │                     │
                          │                     │
                       complete              resume
                          │                     │
                          v                     v
                      completed            in_progress
```

### Error Response (Invalid Transition)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot complete job with status 'not_started'. Job must be 'in_progress'."
  }
}
```

---

## Operation Lifecycle API

**Endpoint:** `/functions/v1/api-operation-lifecycle`

### Start Operation

```
POST /functions/v1/api-operation-lifecycle/start?id=<operation-id>&user_id=<user-id>
```

**Precondition:** Status must be `not_started` or `on_hold`
**Result:** Status becomes `in_progress`, creates time entry if `user_id` provided
**Webhook:** `operation.started`

### Pause Operation

```
POST /functions/v1/api-operation-lifecycle/pause?id=<operation-id>
```

**Precondition:** Status must be `in_progress`
**Result:** Status becomes `on_hold`, ends active time entries, updates `actual_time`
**Webhook:** `operation.paused`

### Resume Operation

```
POST /functions/v1/api-operation-lifecycle/resume?id=<operation-id>&user_id=<user-id>
```

**Precondition:** Status must be `on_hold`
**Result:** Status becomes `in_progress`, creates new time entry
**Webhook:** `operation.resumed`

### Complete Operation

```
POST /functions/v1/api-operation-lifecycle/complete?id=<operation-id>
```

**Precondition:** Status must be `in_progress`
**Result:** Status becomes `completed`, `completion_percentage` set to 100, ends all time entries
**Webhook:** `operation.completed`

### State Transition Diagram

```
not_started ──start──> in_progress ──pause──> on_hold
                          │                      │
                          │                      │
                       complete               resume
                          │                      │
                          v                      v
                      completed             in_progress
```

---

## Other APIs

### Cells API

**Endpoint:** `/functions/v1/api-cells` - Standard CRUD for work cells.

### Materials API

**Endpoint:** `/functions/v1/api-materials` - Standard CRUD for materials.

### Resources API

**Endpoint:** `/functions/v1/api-resources` - Standard CRUD for resources.

### Assignments API

**Endpoint:** `/functions/v1/api-assignments` - Standard CRUD for operator assignments.

### Time Entries API

**Endpoint:** `/functions/v1/api-time-entries` - Standard CRUD for time entries.

### Scrap Reasons API

**Endpoint:** `/functions/v1/api-scrap-reasons` - Standard CRUD for scrap reasons.

### Templates API

**Endpoint:** `/functions/v1/api-templates` - Standard CRUD for job templates.

### Webhook Logs API

**Endpoint:** `/functions/v1/api-webhook-logs` - Read-only logs of webhook deliveries.

### Operation Quantities API

**Endpoint:** `/functions/v1/api-operation-quantities` - Track good/scrap quantities per operation.

### Parts Images API

**Endpoint:** `/functions/v1/api-parts-images` - Manage part image attachments.

### Upload URL API

**Endpoint:** `/functions/v1/api-upload-url` - Generate pre-signed upload URLs for file storage.

### Export API

**Endpoint:** `/functions/v1/api-export` - Export data in CSV/JSON format.

### ERP Sync API

**Endpoint:** `/functions/v1/api-erp-sync` - Bidirectional ERP synchronization.

### API Key Generate

**Endpoint:** `/functions/v1/api-key-generate` - Generate new API keys.

---

## Common Patterns

### Authentication

Every request must include an API key:

```bash
# Method 1: Bearer token (recommended)
curl -H "Authorization: Bearer ery_live_xxxxxxxxxx" ...

# Method 2: X-API-Key header
curl -H "X-API-Key: ery_live_xxxxxxxxxx" ...
```

### Pagination

All list endpoints support pagination:

```
?limit=50&offset=100
```

Response includes:
```json
{
  "success": true,
  "data": {
    "jobs": [...],
    "pagination": {
      "total": 250,
      "offset": 100,
      "limit": 50
    }
  }
}
```

### Sorting

```
?sort=created_at&order=desc
```

### Filtering

Exact match:
```
?status=in_progress
```

Fuzzy match (for text fields like customer, job_number, part_number):
```
?customer=ACME
```
Internally uses `ILIKE %value%`.

### Full-text Search

```
?search=milling
```

Searches across configured search fields for the endpoint.

### Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "statusCode": 422,
    "details": [...]
  }
}
```

### Validation Error Details

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "3 validation error(s) in job",
    "details": [
      {
        "field": "job_number",
        "message": "Missing required field: job_number",
        "value": null,
        "constraint": "NOT_NULL",
        "entityType": "job",
        "entityIndex": 0
      }
    ],
    "statusCode": 422
  }
}
```

### Constraint Types

| Constraint | Meaning |
|------------|---------|
| `NOT_NULL` | Required field is missing |
| `FK_CONSTRAINT` | Foreign key references non-existent record |
| `FK_REQUIRED` | Required foreign key is missing |
| `UUID_FORMAT` | Invalid UUID format |
| `TYPE_MISMATCH` | Wrong data type |
| `MIN_VALUE` | Number below minimum |
| `MAX_VALUE` | Number above maximum |
| `MIN_LENGTH` | String too short / Array too few items |
| `MAX_LENGTH` | String too long / Array too many items |
| `ENUM_CONSTRAINT` | Value not in allowed set |
| `DATE_FORMAT` | Invalid date format |
| `UNIQUE_CONSTRAINT` | Duplicate value |
| `CIRCULAR_REFERENCE` | Self-referential foreign key |

### Rate Limiting

Rate limit errors include retry information:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "statusCode": 429,
    "rateLimitInfo": {
      "remaining": 0,
      "resetAt": "2024-01-15T10:05:00Z",
      "retryAfter": 60
    }
  }
}
```

Headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`
