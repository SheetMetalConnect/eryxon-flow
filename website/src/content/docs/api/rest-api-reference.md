---
title: "REST API Reference"
description: "Supported ERP and production integration reference for Eryxon Flow."
---

## Overview

The Eryxon Flow REST API lets an ERP or integration create and update jobs, parts and operations. Eryxon emits committed production changes through signed webhooks. The optional MCP server exposes supported production and configuration actions to approved automation.

Most integration endpoints use Eryxon API keys (`ery_live_...` or `ery_test_...`). Admin browser endpoints such as `api-export` use the signed-in Supabase user session token.

---

## HTTP Status Codes

All API endpoints use proper REST status codes:

### Success Codes (2xx)

| Code | Meaning | Usage |
|------|---------|-------|
| **200 OK** | Success | GET requests, successful PATCH/DELETE |
| **201 Created** | Resource created | Successful POST requests |
| **204 No Content** | Success with no body | Alternative for DELETE (not currently used) |

### Client Error Codes (4xx)

| Code | Meaning | Usage | Example |
|------|---------|-------|---------|
| **400 Bad Request** | Malformed request | Invalid JSON, malformed query params | `{"error": "Invalid JSON in request body"}` |
| **401 Unauthorized** | Authentication failed | Invalid/missing API key | `{"error": "Invalid or missing API key"}` |
| **402 Payment Required** | Quota exceeded | Plan limits reached | `{"error": "Job limit exceeded (50/50)"}` |
| **403 Forbidden** | Access denied | Tenant isolation violation | `{"error": "Access denied to this resource"}` |
| **404 Not Found** | Resource doesn't exist | Job/part/operation ID not found | `{"error": "Job with ID xxx not found"}` |
| **409 Conflict** | Resource conflict or refused transition | Duplicate job_number; a production rule refused the change (message is the rule text) | `{"error": {"code": "CONFLICT", "message": "Stop active work before starting another operation"}}` |
| **422 Unprocessable Entity** | **Validation error** | Well-formed but invalid data | See [Validation Errors](#validation-error-format) below |
| **429 Too Many Requests** | Rate limit exceeded | Too many API calls | `{"error": "Rate limit exceeded"}` |

### Server Error Codes (5xx)

| Code | Meaning | Usage |
|------|---------|-------|
| **500 Internal Server Error** | Server error | Unexpected errors, database failures |

---

## Response Formats

### Success Response

All successful API responses follow this structure:

```json
{
  "success": true,
  "data": {
    "records": [ ... ],
    "pagination": {
      "limit": 100,
      "offset": 0,
      "total": 250
    }
  }
}
```

**Fields:**
- `success` - Always `true` for successful responses
- `data` - The response payload. List endpoints put pagination next to the returned records inside this object.

### Error Response

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "job_number",
        "message": "Job number is required",
        "constraint": "NOT_NULL",
        "entityType": "job",
        "entityIndex": 0
      }
    ],
    "statusCode": 422
  }
}
```

**Fields:**
- `success` - Always `false` for errors
- `error.code` - Machine-readable error code
- `error.message` - Human-readable summary
- `error.details` - Array of specific errors (for validation)
- `error.statusCode` - HTTP status code

---

## Error Handling Reference

### Validation Error Format

When validation fails (422), you'll receive detailed field-level errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "✗ 3 validation error(s) in job",
    "details": [
      {
        "field": "job_number",
        "message": "Missing required field: job_number",
        "value": null,
        "constraint": "NOT_NULL",
        "entityType": "job",
        "entityIndex": 0
      },
      {
        "field": "parts[0].quantity",
        "message": "Part quantity must be >= 1",
        "value": 0,
        "constraint": "MIN_VALUE",
        "entityType": "part",
        "entityIndex": 0
      },
      {
        "field": "parts[0].operations[0].cell_id",
        "message": "Foreign key cell_id references non-existent record: abc-123",
        "value": "abc-123",
        "constraint": "FK_CONSTRAINT",
        "entityType": "operation",
        "entityIndex": 0
      }
    ],
    "statusCode": 422
  }
}
```

### Validation Constraint Types

| Constraint | Meaning | Example |
|------------|---------|---------|
| `NOT_NULL` | Required field missing | `job_number` is required |
| `FK_CONSTRAINT` | Foreign key violation | `cell_id` references non-existent cell |
| `FK_REQUIRED` | Required foreign key missing | `part_id` is required |
| `UUID_FORMAT` | Invalid UUID format | `id` must be a valid UUID |
| `TYPE_MISMATCH` | Wrong data type | Expected number, got string |
| `MIN_VALUE` | Value too small | `quantity` must be >= 1 |
| `MAX_VALUE` | Value too large | A numeric field exceeds its maximum |
| `MIN_LENGTH` | String too short | `job_number` must be at least 1 character |
| `MAX_LENGTH` | String too long | `job_number` must be at most 255 characters |
| `PATTERN_MISMATCH` | Doesn't match pattern | Invalid format |
| `ENUM_CONSTRAINT` | Invalid enum value | `status` must be one of: not_started, in_progress, completed |
| `DATE_FORMAT` | Invalid date format | `due_date` must be ISO 8601 format |
| `UNIQUE_CONSTRAINT` | Duplicate value | Duplicate part numbers found |
| `CIRCULAR_REFERENCE` | Self-referential FK | Part cannot be its own parent |

### Common Error Codes

| Code | HTTP | Description | Example |
|------|------|-------------|---------|
| `VALIDATION_ERROR` | 422 | Field validation failed | Missing required field |
| `UNAUTHORIZED` | 401 | Authentication failed | Invalid API key |
| `NOT_FOUND` | 404 | Resource doesn't exist in your workshop | `Operation not found` |
| `CONFLICT` | 409 | Duplicate record or a production rule refused the transition | `Previous operation must be completed first` |
| `QUOTA_EXCEEDED` | 402 | Plan limit reached | Job limit: 50/50 |
| `BAD_REQUEST` | 400 | Malformed request | Invalid JSON |
| `FORBIDDEN` | 403 | Access denied | Wrong tenant |
| `METHOD_NOT_ALLOWED` | 405 | HTTP method not supported | POST to GET-only endpoint |
| `INTERNAL_ERROR` | 500 | Server error | Database connection failed |

---

## Writable fields and validation

The [payload reference](/api/payload-reference/) lists the current writable fields and copy-paste request bodies. Unknown write fields are rejected. UUID references are checked against the authenticated workshop before a service-role write reaches the database.

---

## Authentication

Most integration endpoints require an API key passed as a Bearer token:

**Required header**
```
Authorization: Bearer ery_live_xxxxxxxxxx
```

API keys are managed through the admin interface and come in two types:
- `ery_live_*` - Production keys
- `ery_test_*` - Testing keys

**Security:** API keys are verified using SHA-256 hashing against the `api_keys` table and compared with constant-time matching in the edge auth helper. Never expose your API keys in client-side code or public repositories.

Admin-only endpoints used from the web app, such as `api-export`, use the signed-in Supabase user session token instead of an Eryxon API key.

---

## Core REST APIs

### Jobs API
**Base URL:** `/functions/v1/api-jobs`

#### GET - List Jobs
```bash
GET /api-jobs?status=in_progress&customer=Example&limit=100&offset=0
```

**Query Parameters:**
- `status` - Filter by status: `not_started`, `in_progress`, `completed`, `on_hold`
- `customer` - Filter by customer name (partial match)
- `job_number` - Filter by job number (partial match)
- `limit` - Results per page (default: 100, max: 1000)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "job_number": "JOB-2026-001",
        "customer": "Example Fabrication",
        "status": "in_progress",
        "due_date": "2026-12-31",
        "started_at": "2026-01-15T10:00:00Z",
        "notes": "Rush order",
        "parts": [...]
      }
    ],
    "pagination": {
      "limit": 100,
      "offset": 0,
      "total": 150
    }
  }
}
```

#### POST - Create Job
```bash
POST /api-jobs
Content-Type: application/json

{
  "job_number": "JOB-2026-001",
  "customer": "Example Fabrication",
  "due_date": "2026-12-31",
  "notes": "Rush order",
  "metadata": {"po_number": "PO-12345"},
  "parts": [
    {
      "part_number": "PART-001",
      "material": "Aluminum 6061",
      "quantity": 10,
      "file_paths": ["tenant-id/jobs/JOB-2026-001/part-001.pdf"],
      "operations": [
        {
          "operation_name": "CNC Milling",
          "cell_id": "uuid",
          "estimated_time": 120,
          "sequence": 1,
          "notes": "Use 0.5\" end mill"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job": {
      "id": "uuid",
      "job_number": "JOB-2026-001",
      "parts": [
        {
          "id": "uuid",
          "part_number": "PART-001",
          "operations": [
            {
              "id": "uuid",
              "operation_name": "CNC Milling"
            }
          ]
        }
      ]
    }
  }
}
```

**Webhook Triggered:** `job.created`

#### PATCH - Update Job
```bash
PATCH /api-jobs?id=<job-id>
Content-Type: application/json

{
  "status": "completed",
  "notes": "Finished ahead of schedule"
}
```

**Allowed Fields:** `status`, `customer`, `due_date`, `due_date_override`, `notes`, `metadata`

#### DELETE - Delete Job
```bash
DELETE /api-jobs?id=<job-id>
```

---

### Parts API
**Base URL:** `/functions/v1/api-parts`

#### GET - List Parts
```bash
GET /api-parts?job_id=<uuid>&status=in_progress&material=Aluminum
```

**Query Parameters:**
- `job_id` - Filter by job
- `part_number` - Filter by part number (partial match)
- `material` - Filter by material
- `status` - Filter by status
- `limit`, `offset` - Pagination

#### POST - Create Part
```bash
POST /api-parts
{
  "job_id": "uuid",
  "part_number": "PART-002",
  "material": "Steel 4140",
  "quantity": 5,
  "parent_part_number": "PART-001",
  "notes": "Sub-assembly"
}
```

---

### Operations API
**Base URL:** `/functions/v1/api-operations`

#### GET - List Operations
```bash
GET /api-operations?part_id=<uuid>&status=in_progress&cell_id=<uuid>&search=Mill
```

**Query Parameters:**
- `part_id` - Filter by part
- `cell_id` - Filter by cell
- `status` - Filter by status
- `search` - Search operation names
- `sort` - Sort field: `sequence`, `operation_name`, `created_at`, or `status`
- `order` - `asc` or `desc`
- `limit`, `offset` - Pagination

#### POST - Create Operation
```bash
POST /api-operations
{
  "part_id": "uuid",
  "cell_id": "uuid",
  "operation_name": "Welding",
  "estimated_time": 60,
  "sequence": 2,
  "notes": "TIG weld only"
}
```

---

## Job and part status

Job and part status (`not_started`, `in_progress`, `completed`) and their current cell are derived from the operations by the database (`refresh_production_job`) after every operation transition. There is no endpoint that sets them; drive the operations below and read the job back.

---

## Operation Lifecycle APIs

**Base URL:** `/functions/v1/api-operation-lifecycle`

### Start Operation
```bash
POST /api-operation-lifecycle/start?id=<operation-id>&user_id=<user-id>
```

**What it does:**
- Changes status to `in_progress`
- Sets `started_at` timestamp
- **Creates time entry** with `start_time`
- Triggers `operation.started` webhook

### Pause Operation
```bash
POST /api-operation-lifecycle/pause?id=<operation-id>
```

**What it does:**
- Changes status to `on_hold`
- Sets `paused_at` timestamp
- **Ends active time entries** (calculates duration)
- Updates `actual_time` with cumulative time
- Triggers `operation.paused` webhook

### Resume Operation
```bash
POST /api-operation-lifecycle/resume?id=<operation-id>&user_id=<user-id>
```

**What it does:**
- Changes status to `in_progress`
- Sets `resumed_at` timestamp
- **Creates new time entry**
- Triggers `operation.resumed` webhook

### Complete Operation
```bash
POST /api-operation-lifecycle/complete?id=<operation-id>
```

**What it does:**
- Changes status to `completed`
- Sets `completed_at` timestamp
- Sets `completion_percentage` to 100
- **Ends all active time entries**
- Calculates final `actual_time`
- Triggers `operation.completed` webhook

**Rules** (enforced by `transition_operation`; a refusal is `409 CONFLICT` with the rule as `error.message`):
- An operator can run one timer at a time: `Stop active work before starting another operation`.
- An open standstill issue blocks a start: `Resolve the active standstill before restarting`.
- With the workshop setting *Sequential release* on: `Previous operation must be completed first`.
- `complete` requires the operation to be started and its timers stopped; `pause` needs an operation in progress; `resume` needs a paused one.
- Unknown operation: `404 NOT_FOUND`.

Every response carries `previous_status` and `new_status`; the operation object reflects the committed state.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "operation": {
      "id": "uuid",
      "operation_name": "CNC Milling",
      "status": "completed",
      "estimated_time": 120,
      "actual_time": 135,
      "completion_percentage": 100,
      "part": {
        "part_number": "PART-001",
        "job": {
          "job_number": "JOB-2026-001"
        }
      }
    },
    "operation_type": "complete",
    "previous_status": "in_progress",
    "new_status": "completed",
    "time_entry_ended": true
  }
}
```

---

## Batch APIs

### Batches API
**Base URL:** `/functions/v1/api-batches`

#### GET - List Batches
```bash
GET /api-batches?status=ready&batch_type=laser_nesting&limit=50
```

**Query Parameters:**
- `status` - Filter by `draft`, `ready`, `in_progress`, `completed`, or `cancelled`
- `batch_type` - Filter by `laser_nesting`, `tube_batch`, `saw_batch`, `finishing_batch`, or `general`
- `cell_id` - Filter by production cell
- `material` - Filter by material label
- `search` - Search `batch_number` and `material`

#### POST - Create Batch
```bash
POST /api-batches
{
  "batch_number": "NEST-2026-001",
  "batch_type": "laser_nesting",
  "cell_id": "uuid",
  "material": "SS304",
  "thickness_mm": 2,
  "operation_ids": ["uuid", "uuid"]
}
```

`cell_id`, `parent_batch_id`, and `operation_ids` are validated against the authenticated tenant. Operations must not already be assigned to another batch.

#### PATCH - Update Batch
```bash
PATCH /api-batches?id=<batch-id>
{
  "notes": "Updated nesting notes",
  "material": "SS304"
}
```

Use `api-batch-lifecycle/add-operations` to append operations.

### Batch Lifecycle API
**Base URL:** `/functions/v1/api-batch-lifecycle`

```bash
POST /api-batch-lifecycle/start?id=<batch-id>
POST /api-batch-lifecycle/stop?id=<batch-id>
POST /api-batch-lifecycle/add-operations?id=<batch-id>
```

Start moves a draft or ready batch to `in_progress`. Stop completes the batch and distributes active tracked time across operations. Add-operations appends tenant-validated operations while the batch is still `draft` or `ready`.

**Webhook Triggered:** `batch.started`, `batch.completed`

---

## NCR APIs

### Create NCR (Non-Conformance Report)
```bash
POST /api-issues
Content-Type: application/json

{
  "operation_id": "uuid",
  "title": "Dimensional Out of Tolerance",
  "description": "Part hole diameter measured 0.505\", spec is 0.500\" ±0.002\"",
  "severity": "high",
  "issue_type": "ncr",
  "ncr_category": "process_error",
  "affected_quantity": 5,
  "disposition": "rework",
  "root_cause": "Tool wear - end mill exceeded replacement interval",
  "corrective_action": "Replaced tool, re-machined 5 parts",
  "preventive_action": "Implemented tool life tracking in system",
  "verification_required": true,
  "reported_by_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "issue": {
      "id": "uuid",
      "title": "Dimensional Out of Tolerance",
      "severity": "high",
      "status": "pending",
      "issue_type": "ncr",
      "ncr_category": "process_error",
      "disposition": "rework",
      "created_at": "2026-01-15T14:30:00Z"
    }
  }
}
```

**Webhook Triggered:** `ncr.created`

### NCR Fields

**Required:**
- `operation_id` - Where the non-conformance occurred
- `title` - Short summary
- `description` - What was observed
- `severity` - `low`, `medium`, `high`, `critical`

**NCR-Specific:**
- `issue_type` - Set to `"ncr"`
- `ncr_category` - `material_defect`, `dimensional`, `surface_finish`, `process_error`, `other`
- `affected_quantity` - Number of parts affected
- `disposition` - `scrap`, `rework`, `use_as_is`, `return_to_supplier`
- `root_cause` - Root cause analysis
- `corrective_action` - Immediate action taken
- `preventive_action` - Long-term prevention
- `verification_required` - Whether a follow-up verification is required

### Update NCR
```bash
PATCH /api-issues?id=<ncr-id>
{
  "status": "closed",
  "resolution_notes": "All parts re-machined and inspected. Tool tracking implemented."
}
```

### List NCRs
```bash
GET /api-issues?issue_type=ncr&severity=high&status=pending
```

---

## Substeps API

**Base URL:** `/functions/v1/api-substeps`

### Add Substep
```bash
POST /api-substeps
{
  "operation_id": "uuid",
  "name": "Measure hole diameter with caliper",
  "sequence": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "substep": {
      "id": "uuid",
      "operation_id": "uuid",
      "name": "Measure hole diameter with caliper",
      "sequence": 1,
      "status": "not_started"
    }
  }
}
```

**Webhook Triggered:** `step.added`

### Complete Substep
```bash
PATCH /api-substeps?id=<substep-id>
{
  "status": "completed",
  "completed_at": "2026-09-19T10:30:00Z",
  "completed_by": "uuid"
}
```

**Webhook Triggered:** `step.completed`

---

## Webhook Events

Webhooks are configured with `api-webhooks` (`name`, HTTPS `url`, `events`, `secret_key`, `active`). Events are named `<entity>.<action>` and derived in the database: `job`, `part`, `operation`, `batch`, `issue` × `created` / `updated` / `started` / `paused` / `resumed` / `completed` / `resolved` / `deleted` where applicable, plus `production.reported`, `production.deleted` and `sync.*.completed`. Every delivery carries `X-Eryxon-Event` and `X-Eryxon-Signature: t=<unix>,v1=<hmac>` (HMAC-SHA256 of `<t>.<body>` with the secret). Delivery records are readable through `api-webhook-deliveries`.

The full catalogue, payload shape, signature verification and retry behaviour are on [Webhooks](/architecture/connectivity-webhooks/).

---

## MCP Server Integration

The MCP server covers the REST resources and production actions for approved automation. Lifecycle tools use the same database functions as the terminal, while all access is pinned to one workshop. See the [MCP Server Reference](/api/mcp-server-reference/) for the tool list and the [MCP Server Setup Guide](/guides/mcp-setup/) for deployment.

---

## Rate Limits

**Self-hosted:** The application does not impose hosted API quotas. You control the infrastructure.

**Hosted trial (eryxon.eu):** API requests have a daily limit. The current
allowance and usage are shown in the app; commercial hosting terms are agreed
separately.

When you exceed your rate limit, the API returns `429 Too Many Requests`.
