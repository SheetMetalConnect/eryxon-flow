# Eryxon Flow - Complete API & Integration Documentation

## Overview

Eryxon Flow is a **100% API-driven** manufacturing execution system. Your ERP system pushes jobs, parts, and tasks via REST API. Eryxon sends completion events back via webhooks. The MCP server enables AI/automation integration.

## Table of Contents

1. [REST Standards & Best Practices](#rest-standards--best-practices)
2. [HTTP Status Codes](#http-status-codes)
3. [Response Formats](#response-formats)
4. [Error Handling](#error-handling-reference)
5. [Validation Rules](#validation-rules)
6. [Authentication](#authentication)
7. [Core REST APIs](#core-rest-apis)
8. [Job Lifecycle APIs](#job-lifecycle-apis)
9. [Operation Lifecycle APIs](#operation-lifecycle-apis)
10. [NCR (Non-Conformance Report) APIs](#ncr-apis)
11. [Webhook Events](#webhook-events)
12. [MCP Server Integration](#mcp-server-integration)
13. [Database Indexing](#database-indexing)

---

## REST Standards & Best Practices

Eryxon Flow API follows REST best practices with comprehensive validation, clear error messages, and proper HTTP semantics.

### Key Principles

✅ **Proper HTTP Status Codes** - Meaningful status codes for every response
✅ **Standardized Responses** - Consistent success/error formats
✅ **Comprehensive Validation** - Field-level validation before database operations
✅ **Batch Operations** - Efficient foreign key validation
✅ **Clear Error Messages** - Actionable error details
✅ **Type Safety** - Schema validation for all requests

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
| **409 Conflict** | Resource conflict | Duplicate job_number, state violations | `{"error": "Job number JOB-001 already exists"}` |
| **422 Unprocessable Entity** | **Validation error** | Well-formed but invalid data | See [Validation Errors](#validation-error-format) below |
| **429 Too Many Requests** | Rate limit exceeded | Too many API calls | `{"error": "Rate limit exceeded"}` |

### Server Error Codes (5xx)

| Code | Meaning | Usage |
|------|---------|-------|
| **500 Internal Server Error** | Server error | Unexpected errors, database failures |

### Status Code Decision Tree

```
Request received
├─ Malformed JSON/query params? → 400 Bad Request
├─ Invalid/missing API key? → 401 Unauthorized
├─ Quota exceeded? → 402 Payment Required
├─ Wrong tenant? → 403 Forbidden
├─ Resource not found? → 404 Not Found
├─ Duplicate/conflict? → 409 Conflict
├─ Validation failed? → 422 Unprocessable Entity
├─ Rate limit hit? → 429 Too Many Requests
├─ Server error? → 500 Internal Server Error
└─ Success
   ├─ Created resource? → 201 Created
   └─ Otherwise → 200 OK
```

---

## Response Formats

### Success Response

All successful API responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
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
- `data` - The response payload (object or array)
- `meta` - Optional metadata (pagination, filters, etc.)

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
| `MAX_VALUE` | Value too large | `priority` must be <= 100 |
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
| `NOT_FOUND` | 404 | Resource doesn't exist | Job ID not found |
| `CONFLICT` | 409 | Resource conflict | Duplicate job_number |
| `QUOTA_EXCEEDED` | 402 | Plan limit reached | Job limit: 50/50 |
| `BAD_REQUEST` | 400 | Malformed request | Invalid JSON |
| `FORBIDDEN` | 403 | Access denied | Wrong tenant |
| `METHOD_NOT_ALLOWED` | 405 | HTTP method not supported | POST to GET-only endpoint |
| `INTERNAL_ERROR` | 500 | Server error | Database connection failed |

---

## Validation Rules

### Jobs

**Required Fields:**
- `job_number` (string, 1-255 chars, unique per tenant)
- `parts` (array, min 1 part)

**Optional Fields:**
- `customer_name` (string, max 255 chars)
- `due_date` (ISO 8601 date string)
- `priority` (integer, >= 0)
- `current_cell_id` (UUID, must exist in cells)
- `status` (enum: `not_started`, `in_progress`, `on_hold`, `completed`)
- `description` (string)
- `metadata` (JSON object)

**Business Rules:**
- Job number must be unique within tenant
- At least one part required
- Status transitions must be valid (not_started → in_progress → completed)
- All foreign keys must reference existing records in same tenant

### Parts

**Required Fields:**
- `job_id` (UUID, must exist)
- `part_number` (string, unique within job)
- `quantity` (integer, >= 1)
- `operations` (array, min 1 operation)

**Optional Fields:**
- `material` (string)
- `parent_part_id` (UUID, must exist in same job, cannot be self)
- `current_cell_id` (UUID, must exist)
- `material_id` (UUID, must exist)
- `description` (string)
- `drawing_url` (string)
- `step_file_url` (string)

**Business Rules:**
- Part number unique within job
- Parent part must belong to same job
- Cannot be own parent (circular reference check)
- Operations must have sequential sequence numbers (1, 2, 3...)

### Operations

**Required Fields:**
- `part_id` (UUID, must exist)
- `operation_name` (string, 1-255 chars)
- `sequence` (integer, >= 1, unique within part)

**Optional Fields:**
- `cell_id` (UUID, must exist)
- `assigned_operator_id` (UUID, must exist in profiles)
- `estimated_time_minutes` (number, >= 0)
- `setup_time_minutes` (number, >= 0)
- `instructions` (string)
- `status` (enum: `not_started`, `in_progress`, `paused`, `completed`)

**Business Rules:**
- Sequence must be positive integer
- Sequence unique within part
- All FKs must belong to same tenant

### Issues/NCRs

**Required Fields:**
- `operation_id` (UUID, must exist)
- `title` (string, 1-255 chars)
- `description` (string, min 1 char)

**Optional Fields:**
- `severity` (enum: `low`, `medium`, `high`, `critical`)
- `status` (enum: `open`, `in_progress`, `resolved`, `closed`)
- `issue_type` (enum: `general`, `ncr`)
- `reported_by_id` (UUID, must exist)
- `resolved_by_id` (UUID, must exist)
- `verified_by_id` (UUID, must exist)

**NCR-Specific Fields** (when `issue_type` = `"ncr"`):
- `ncr_number` (auto-generated if not provided)
- `ncr_category` (enum: `material`, `process`, `equipment`, `design`, `supplier`, `documentation`, `other`)
- `ncr_disposition` (enum: `use_as_is`, `rework`, `repair`, `scrap`, `return_to_supplier`)
- `root_cause` (string)
- `corrective_action` (string)
- `preventive_action` (string)
- `affected_quantity` (integer)
- `verification_required` (boolean)

---

## Authentication

All API endpoints require an API key in the `Authorization` header:

```
Authorization: Bearer ery_live_xxxxxxxxxx
```

API keys are managed through the admin interface and come in two types:
- `ery_live_*` - Production keys
- `ery_test_*` - Testing keys

---

## Core REST APIs

### Jobs API
**Base URL:** `/functions/v1/api-jobs`

#### GET - List Jobs
```bash
GET /api-jobs?status=in_progress&customer=ACME&limit=100&offset=0
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
        "job_number": "JOB-2024-001",
        "customer": "ACME Corp",
        "status": "in_progress",
        "due_date": "2024-12-31",
        "started_at": "2024-01-15T10:00:00Z",
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
  "job_number": "JOB-2024-001",
  "customer": "ACME Corp",
  "due_date": "2024-12-31",
  "notes": "Rush order",
  "metadata": {"po_number": "PO-12345"},
  "parts": [
    {
      "part_number": "PART-001",
      "material": "Aluminum 6061",
      "quantity": 10,
      "file_paths": ["s3://drawings/part-001.pdf"],
      "operations": [
        {
          "operation_name": "CNC Milling",
          "cell_name": "Mill-01",
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
    "job_id": "uuid",
    "job_number": "JOB-2024-001",
    "parts": [
      {
        "part_id": "uuid",
        "part_number": "PART-001",
        "operations": [
          {
            "operation_id": "uuid",
            "operation_name": "CNC Milling"
          }
        ]
      }
    ]
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
GET /api-operations?part_id=<uuid>&status=in_progress&cell_name=Mill
```

**Query Parameters:**
- `part_id` - Filter by part
- `job_id` - Filter by job (finds parts first, then operations)
- `cell_id` - Filter by cell
- `cell_name` - Filter by cell name (partial match)
- `status` - Filter by status
- `assigned_operator_id` - Filter by assigned operator
- `search` - Search operation names
- `sort_by` - Sort field: `sequence`, `created_at`, `estimated_time`, `actual_time`, `status`
- `sort_order` - `asc` or `desc`
- `include_count` - Include total count (true/false)

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

## Job Lifecycle APIs

**Base URL:** `/functions/v1/api-job-lifecycle`

### Start Job
```bash
POST /api-job-lifecycle/start?id=<job-id>
```

**What it does:**
- Changes status from `not_started` or `on_hold` → `in_progress`
- Sets `started_at` timestamp (first time only)
- Clears `paused_at`
- Triggers `job.started` webhook

### Stop/Pause Job
```bash
POST /api-job-lifecycle/stop?id=<job-id>
```

**What it does:**
- Changes status from `in_progress` → `on_hold`
- Sets `paused_at` timestamp
- Triggers `job.stopped` webhook

### Complete Job
```bash
POST /api-job-lifecycle/complete?id=<job-id>
```

**What it does:**
- Changes status from `in_progress` → `completed`
- Sets `completed_at` timestamp
- Calculates and stores `actual_duration` (in minutes)
- Triggers `job.completed` webhook

### Resume Job
```bash
POST /api-job-lifecycle/resume?id=<job-id>
```

**What it does:**
- Changes status from `on_hold` → `in_progress`
- Sets `resumed_at` timestamp
- Clears `paused_at`
- Triggers `job.resumed` webhook

**Example Response:**
```json
{
  "success": true,
  "data": {
    "job": {
      "id": "uuid",
      "job_number": "JOB-2024-001",
      "status": "in_progress",
      "started_at": "2024-01-15T10:00:00Z",
      "completed_at": null
    },
    "operation": "start",
    "previous_status": "not_started",
    "new_status": "in_progress"
  }
}
```

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
          "job_number": "JOB-2024-001"
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
  "ncr_category": "process",
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
      "ncr_number": "NCR-2024-0001",
      "title": "Dimensional Out of Tolerance",
      "severity": "high",
      "status": "open",
      "issue_type": "ncr",
      "ncr_category": "process",
      "disposition": "rework",
      "created_at": "2024-01-15T14:30:00Z"
    }
  }
}
```

**Webhook Triggered:** `ncr.created`

### NCR Fields

**Required:**
- `operation_id` - Where the non-conformance occurred
- `title` - Short summary
- `severity` - `low`, `medium`, `high`, `critical`

**NCR-Specific:**
- `issue_type` - Set to `"ncr"` (auto-generates NCR number)
- `ncr_category` - `material`, `process`, `equipment`, `design`, `supplier`, `documentation`, `other`
- `affected_quantity` - Number of parts affected
- `disposition` - `use_as_is`, `rework`, `repair`, `scrap`, `return_to_supplier`
- `root_cause` - Root cause analysis
- `corrective_action` - Immediate action taken
- `preventive_action` - Long-term prevention
- `verification_required` - Requires verification after corrective action
- `verified_by_id` - User who verified (auto-sets `verified_at`)

### Update NCR
```bash
PATCH /api-issues?id=<ncr-id>
{
  "status": "resolved",
  "resolution_notes": "All parts re-machined and inspected. Tool tracking implemented.",
  "verified_by_id": "uuid"
}
```

### List NCRs
```bash
GET /api-issues?issue_type=ncr&severity=high&status=open
```

---

## Substeps API

**Base URL:** `/functions/v1/api-substeps`

### Add Substep
```bash
POST /api-substeps
{
  "operation_id": "uuid",
  "description": "Measure hole diameter with caliper",
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
      "description": "Measure hole diameter with caliper",
      "sequence": 1,
      "completed": false
    }
  }
}
```

**Webhook Triggered:** `step.added`

### Complete Substep
```bash
PATCH /api-substeps?id=<substep-id>
{
  "completed": true
}
```

**Webhook Triggered:** `step.completed`

---

## Webhook Events

Eryxon automatically sends webhooks to registered endpoints for the following events:

### Job Events
- `job.created` - New job created via API
- `job.started` - Job started
- `job.stopped` - Job paused/stopped
- `job.resumed` - Job resumed from pause
- `job.completed` - Job completed
- `job.updated` - Job fields updated

### Part Events
- `part.created` - New part created
- `part.updated` - Part fields updated
- `part.started` - Work started on part
- `part.completed` - Part completed

### Operation Events
- `operation.started` - Operation started (operator begins work)
- `operation.paused` - Operation paused
- `operation.resumed` - Operation resumed
- `operation.completed` - Operation completed

### Issue/NCR Events
- `issue.created` - General issue created
- `ncr.created` - NCR (Non-Conformance Report) created
- `ncr.verified` - NCR corrective action verified

### Step Events
- `step.added` - Substep added to operation
- `step.completed` - Substep marked as completed

### Webhook Payload Example

```json
{
  "event_type": "job.completed",
  "timestamp": "2024-01-15T16:30:00Z",
  "tenant_id": "uuid",
  "data": {
    "job_id": "uuid",
    "job_number": "JOB-2024-001",
    "customer": "ACME Corp",
    "previous_status": "in_progress",
    "new_status": "completed",
    "started_at": "2024-01-15T10:00:00Z",
    "completed_at": "2024-01-15T16:30:00Z",
    "actual_duration": 390
  }
}
```

### Webhook Security

All webhooks include HMAC-SHA256 signatures for authenticity verification:

**Headers:**
- `X-Eryxon-Signature` - HMAC-SHA256 signature of the payload
- `X-Eryxon-Event` - Event type (e.g., `job.completed`)
- `Content-Type: application/json`

**Verification (Node.js example):**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

### Managing Webhooks

**Create Webhook:**
```bash
POST /api-webhooks
{
  "url": "https://your-erp.com/webhooks/eryxon",
  "events": ["job.created", "job.completed", "ncr.created"],
  "active": true
}
```

**List Webhooks:**
```bash
GET /api-webhooks?event_type=job.completed&active=true
```

**Update Webhook:**
```bash
PATCH /api-webhooks?id=<webhook-id>
{
  "active": false
}
```

---

## MCP Server Integration

The Model Context Protocol (MCP) server enables AI assistants and automation tools to interact with Eryxon Flow.

### Available MCP Tools

#### Fetch Operations
- `fetch_jobs` - List jobs with filters
- `fetch_parts` - List parts with filters
- `fetch_tasks` - List tasks with filters
- `fetch_issues` - List issues with filters
- `fetch_ncrs` - List NCRs with filters
- `get_dashboard_stats` - Get aggregated statistics

#### Job Lifecycle
- `start_job` - Start a job
- `stop_job` - Stop/pause a job
- `complete_job` - Complete a job
- `resume_job` - Resume a paused job
- `update_job` - Update job fields
- `create_job` - Create new job

#### Operation Lifecycle
- `start_operation` - Start an operation
- `pause_operation` - Pause an operation
- `complete_operation` - Complete an operation
- `update_operation` - Update operation fields

#### NCR Management
- `create_ncr` - Create Non-Conformance Report
- `fetch_ncrs` - List NCRs with filtering

#### Substep Management
- `add_substep` - Add substep to operation
- `complete_substep` - Mark substep as completed

### MCP Server Setup

```bash
cd mcp-server
npm install
npm run build

# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"

# Run the server
npm start
```

### Example MCP Tool Usage

```javascript
// Using Claude Desktop or other MCP client
{
  "name": "start_job",
  "arguments": {
    "id": "uuid-of-job"
  }
}

// Response
{
  "content": [
    {
      "type": "text",
      "text": "Job started successfully:\n{\n  \"id\": \"uuid\",\n  \"status\": \"in_progress\",\n  \"started_at\": \"2024-01-15T10:00:00Z\"\n}"
    }
  ]
}
```

---

## Database Indexing

All critical queries are optimized with database indexes:

### Performance Indexes

**Jobs:**
- `(tenant_id, status)` - Status filtering
- `(tenant_id, created_at DESC)` - Recent jobs
- `(tenant_id, due_date)` - Upcoming due dates
- `(tenant_id, customer)` - Customer filtering
- Full-text search on job_number, customer, notes

**Parts:**
- `(tenant_id, status)` - Status filtering
- `(tenant_id, job_id)` - Parts by job
- `(tenant_id, material)` - Material filtering
- `(parent_part_id)` - Sub-assemblies
- Full-text search on part_number, material, notes

**Operations:**
- `(tenant_id, status)` - Status filtering
- `(tenant_id, part_id)` - Operations by part
- `(tenant_id, cell_id)` - Operations by cell
- `(part_id, sequence)` - Operation sequence
- `(assigned_operator_id)` - Operator assignments
- Full-text search on operation_name, notes

**Issues/NCRs:**
- `(tenant_id, status)` - Status filtering
- `(tenant_id, severity)` - Severity filtering
- `(tenant_id, issue_type)` - NCR filtering
- `(tenant_id, ncr_number)` - Unique NCR number
- `(operation_id)` - Issues by operation
- Full-text search on description, resolution_notes

**Time Entries:**
- `(operation_id)` - Entries by operation
- `(user_id)` - Entries by user
- `(operation_id, end_time)` - Active entries

**Webhooks:**
- `(tenant_id, active)` - Active webhooks
- `(webhook_id, created_at DESC)` - Webhook logs
- `(event_type, created_at DESC)` - Event filtering

---

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Job ID is required in query string (?id=xxx)"
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED` - Invalid or missing API key
- `VALIDATION_ERROR` - Missing or invalid request parameters
- `NOT_FOUND` - Resource not found
- `INVALID_STATE_TRANSITION` - Illegal status change (e.g., completing a not-started job)
- `CONFLICT` - Resource conflict (e.g., duplicate job number)
- `INTERNAL_ERROR` - Server error

---

## Rate Limits & Quotas

API access is governed by your subscription plan:

**Free Plan:**
- 1,000 API calls/month
- 10 jobs/month
- 100 parts/month

**Starter Plan:**
- 10,000 API calls/month
- 50 jobs/month
- 500 parts/month

**Professional Plan:**
- 100,000 API calls/month
- 500 jobs/month
- 5,000 parts/month

**Enterprise Plan:**
- Unlimited API calls
- Unlimited jobs
- Unlimited parts

---

## Support

For API support:
- Documentation: https://docs.eryxon.eu
- Email: api-support@eryxon.eu
- Status Page: https://status.eryxon.eu

---

## Changelog

### 2024-01-15 - Major API Enhancement
- ✅ Added job lifecycle endpoints (start/stop/complete/resume)
- ✅ Added operation lifecycle endpoints (start/pause/resume/complete)
- ✅ Enhanced NCR reporting with comprehensive fields
- ✅ Added 15+ new webhook events
- ✅ Enhanced MCP server with 18 total tools
- ✅ Added performance indexes for all major queries
- ✅ Added automatic time tracking for operations
- ✅ Added NCR number auto-generation (format: NCR-YYYY-0001)
