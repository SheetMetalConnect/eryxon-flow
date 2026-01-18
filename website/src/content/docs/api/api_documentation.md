---
title: "API Documentation"
description: "REST API reference for Eryxon Flow"
---

100% API-driven. Your ERP pushes jobs/parts/tasks via REST, Eryxon sends events back via webhooks. See also: [MCP Integration](/api/mcp_integration/), [API Sync](/api/api_sync/).

## Authentication

All endpoints require an API key:

```
Authorization: Bearer ery_live_xxxxxxxxxx
```

Keys are managed in Admin → API Keys. Prefixes: `ery_live_*` (production), `ery_test_*` (testing).

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PATCH, DELETE) |
| 201 | Created (POST) |
| 400 | Malformed request |
| 401 | Invalid/missing API key |
| 402 | Quota exceeded |
| 403 | Access denied (wrong tenant) |
| 404 | Resource not found |
| 409 | Conflict (duplicate, invalid state) |
| 422 | Validation error |
| 429 | Rate limit exceeded |
| 500 | Server error |

## Response Format

**Success:**
```json
{ "success": true, "data": {...}, "meta": { "pagination": {...} } }
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "job_number", "constraint": "NOT_NULL", "message": "..." }],
    "statusCode": 422
  }
}
```

### Validation Constraints

`NOT_NULL`, `FK_CONSTRAINT`, `UUID_FORMAT`, `TYPE_MISMATCH`, `MIN_VALUE`, `MAX_VALUE`, `MIN_LENGTH`, `MAX_LENGTH`, `ENUM_CONSTRAINT`, `DATE_FORMAT`, `UNIQUE_CONSTRAINT`, `CIRCULAR_REFERENCE`

## Validation Rules

### Jobs
- **Required:** `job_number` (unique), `parts[]` (min 1)
- **Optional:** `customer_name`, `due_date` (ISO 8601), `priority`, `status`, `metadata`
- **Status values:** `not_started`, `in_progress`, `on_hold`, `completed`

### Parts
- **Required:** `job_id`, `part_number` (unique within job), `quantity` (>= 1), `operations[]`
- **Optional:** `material`, `parent_part_id`, `drawing_url`, `step_file_url`

### Operations
- **Required:** `part_id`, `operation_name`, `sequence` (unique within part)
- **Optional:** `cell_id`, `assigned_operator_id`, `estimated_time_minutes`, `instructions`
- **Status values:** `not_started`, `in_progress`, `paused`, `completed`

### Issues/NCRs
- **Required:** `operation_id`, `title`, `description`
- **Optional:** `severity` (`low`/`medium`/`high`/`critical`), `issue_type` (`general`/`ncr`)
- **NCR fields:** `ncr_category`, `ncr_disposition`, `root_cause`, `corrective_action`, `affected_quantity`

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


export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"


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

