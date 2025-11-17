# Eryxon Flow API Documentation

## Overview

The Eryxon Flow API provides complete CRUD operations for managing manufacturing workflows, including jobs, parts, operations, time tracking, issues, and more. All endpoints use RESTful conventions with proper HTTP status codes and JSON responses.

## Authentication

All API endpoints (except admin endpoints) use **Bearer Token authentication** with API keys:

```
Authorization: Bearer ery_live_xxxxxxxxxxxxxxxxxxxxx
```

Admin endpoints use **Supabase Auth JWT tokens**:

```
Authorization: Bearer <supabase-jwt-token>
```

### API Key Format
- Live keys: `ery_live_<32-chars>`
- Test keys: `ery_test_<32-chars>`

## Base URL

```
https://your-project.supabase.co/functions/v1/
```

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PATCH, DELETE) |
| 201 | Created (POST) |
| 400 | Validation Error |
| 401 | Unauthorized (invalid/missing API key) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource Not Found |
| 405 | Method Not Allowed |
| 409 | Conflict (duplicate resource) |
| 500 | Internal Server Error |

---

## Endpoints

### 1. Manufacturing Cells (api-cells)

**Base Path**: `/api-cells`

#### GET - List Cells
- **Query Parameters**:
  - `active` (boolean): Filter by active status
- **Response**: Array of cells with id, name, color, sequence, active, timestamps

#### POST - Create Cell
- **Request Body**:
  ```json
  {
    "name": "string (required)",
    "color": "string (optional, default: #3B82F6)",
    "sequence": "number (optional, auto-incremented)",
    "active": "boolean (optional, default: true)"
  }
  ```
- **Status**: 201 Created
- **Validation**: Prevents duplicate cell names per tenant

#### PATCH - Update Cell
- **Query Parameters**: `?id=<cell-id>`
- **Request Body**: Any of name, color, sequence, active
- **Status**: 200 OK
- **Validation**: Checks for duplicate names

#### DELETE - Delete Cell
- **Query Parameters**: `?id=<cell-id>`
- **Status**: 200 OK
- **Constraint**: Cannot delete if operations exist (409 Conflict)

---

### 2. Jobs (api-jobs)

**Base Path**: `/api-jobs`

#### GET - List Jobs
- **Query Parameters**:
  - `status`: Filter by job status
  - `customer`: Search by customer name (case-insensitive)
  - `job_number`: Search by job number (case-insensitive)
  - `limit` (default: 100, max: 1000)
  - `offset` (default: 0)
- **Response**: Jobs with nested parts data
- **Pagination**: Returns limit, offset, total

#### POST - Create Job
- **Request Body**:
  ```json
  {
    "job_number": "string (required)",
    "customer": "string (optional)",
    "due_date": "ISO date (optional)",
    "notes": "string (optional)",
    "metadata": "object (optional)",
    "parts": [
      {
        "part_number": "string (required)",
        "material": "string (required)",
        "quantity": "number (optional, default: 1)",
        "parent_part_number": "string (optional)",
        "file_paths": "array (optional)",
        "notes": "string (optional)",
        "metadata": "object (optional)",
        "operations": [
          {
            "operation_name": "string (required)",
            "cell_name": "string (required)",
            "estimated_time": "number (required, in seconds)",
            "sequence": "number (required)",
            "notes": "string (optional)"
          }
        ]
      }
    ]
  }
  ```
- **Status**: 201 Created
- **Validation**:
  - Prevents duplicate job numbers (409)
  - Validates cell names exist
  - Creates job → parts → operations atomically
- **Webhook**: Triggers `job.created` event

#### PATCH - Update Job
- **Query Parameters**: `?id=<job-id>`
- **Request Body**: Any of status, customer, due_date, due_date_override, notes, metadata
- **Status**: 200 OK

#### DELETE - Delete Job
- **Query Parameters**: `?id=<job-id>`
- **Status**: 200 OK
- **Cascade**: Deletes associated parts and operations

---

### 3. Parts (api-parts)

**Base Path**: `/api-parts`

#### GET - List Parts
- **Query Parameters**:
  - `job_id`: Filter by job
  - `job_number`: Search by job number
  - `material`: Search by material (case-insensitive)
  - `status`: Filter by status
  - `part_number`: Search by part number
  - `limit` (default: 100, max: 1000)
  - `offset` (default: 0)
- **Response**: Parts with job and operations data

#### POST - Create Part
- **Request Body**:
  ```json
  {
    "job_id": "uuid (required)",
    "part_number": "string (required)",
    "material": "string (required)",
    "quantity": "number (optional, default: 1)",
    "parent_part_id": "uuid (optional)",
    "file_paths": "array (optional)",
    "notes": "string (optional)",
    "metadata": "object (optional)"
  }
  ```
- **Status**: 201 Created
- **Validation**:
  - Job must exist
  - Prevents duplicate part numbers per job (409)
  - Parent part must exist and belong to same job

#### PATCH - Update Part
- **Query Parameters**: `?id=<part-id>`
- **Request Body**: Any of status, quantity, notes, metadata, file_paths
- **Status**: 200 OK

#### DELETE - Delete Part
- **Query Parameters**: `?id=<part-id>`
- **Status**: 200 OK
- **Constraint**: Cannot delete if child parts exist (409)
- **Cascade**: Deletes associated operations

---

### 4. Operations (api-operations)

**Base Path**: `/api-operations`

#### GET - List Operations
- **Query Parameters**:
  - `part_id`: Filter by part
  - `job_id`: Filter by job
  - `cell_id`: Filter by cell
  - `cell_name`: Search by cell name
  - `status`: Filter by status
  - `assigned_operator_id`: Filter by operator
  - `limit` (default: 100, max: 1000)
  - `offset` (default: 0)
- **Response**: Operations with part, job, cell, operator, and time entries data

#### POST - Create Operation
- **Request Body**:
  ```json
  {
    "part_id": "uuid (required)",
    "cell_id": "uuid (required)",
    "operation_name": "string (required)",
    "estimated_time": "number (required, in seconds)",
    "sequence": "number (optional, auto-incremented)",
    "notes": "string (optional)",
    "assigned_operator_id": "uuid (optional)"
  }
  ```
- **Status**: 201 Created
- **Validation**: Part and cell must exist

#### PATCH - Update Operation
- **Query Parameters**: `?id=<operation-id>`
- **Request Body**: Any of status, completion_percentage, notes, assigned_operator_id, actual_time
- **Status**: 200 OK
- **Auto-set**: `completed_at` when status changes to 'completed'

#### DELETE - Delete Operation
- **Query Parameters**: `?id=<operation-id>`
- **Status**: 200 OK
- **Constraint**: Cannot delete if time entries exist (409)

---

### 5. Time Entries (api-time-entries)

**Base Path**: `/api-time-entries`

#### GET - List Time Entries
- **Query Parameters**:
  - `operation_id`: Filter by operation
  - `operator_id`: Filter by operator
  - `start_date`: Filter entries starting from date
  - `end_date`: Filter entries up to date
  - `limit` (default: 100, max: 1000)
  - `offset` (default: 0)
- **Response**: Time entries with operation and operator data

#### POST - Create Time Entry
- **Request Body**:
  ```json
  {
    "operation_id": "uuid (required)",
    "operator_id": "uuid (required)",
    "start_time": "ISO datetime (required)",
    "end_time": "ISO datetime (optional)",
    "duration": "number (optional, auto-calculated)",
    "notes": "string (optional)"
  }
  ```
- **Status**: 201 Created
- **Validation**: Operation and operator must exist
- **Auto-calculate**: Duration from start_time and end_time if not provided

#### PATCH - Update Time Entry
- **Query Parameters**: `?id=<time-entry-id>`
- **Request Body**: Any of end_time, duration, notes
- **Status**: 200 OK
- **Auto-calculate**: Duration when end_time is updated

#### DELETE - Delete Time Entry
- **Query Parameters**: `?id=<time-entry-id>`
- **Status**: 200 OK

---

### 6. Issues (api-issues)

**Base Path**: `/api-issues`

#### GET - List Issues
- **Query Parameters**:
  - `operation_id`: Filter by operation
  - `severity`: Filter by severity (low, medium, high, critical)
  - `status`: Filter by status (open, in_progress, resolved)
  - `reported_by_id`: Filter by reporter
  - `limit` (default: 100, max: 1000)
  - `offset` (default: 0)
- **Response**: Issues with operation, reporter, and resolver data

#### POST - Create Issue
- **Request Body**:
  ```json
  {
    "operation_id": "uuid (required)",
    "title": "string (required)",
    "description": "string (optional)",
    "severity": "string (required: low|medium|high|critical)",
    "reported_by_id": "uuid (optional)"
  }
  ```
- **Status**: 201 Created
- **Validation**: Operation and reporter must exist

#### PATCH - Update Issue
- **Query Parameters**: `?id=<issue-id>`
- **Request Body**: Any of title, description, severity, status, resolution_notes, resolved_by_id
- **Status**: 200 OK
- **Auto-set**: `resolved_at` when status changes to 'resolved'

#### DELETE - Delete Issue
- **Query Parameters**: `?id=<issue-id>`
- **Status**: 200 OK

---

### 7. Assignments (api-assignments)

**Base Path**: `/api-assignments`

#### GET - List Assignments
- **Query Parameters**:
  - `operation_id`: Filter by operation
  - `operator_id`: Filter by operator
  - `status`: Filter by status (active, completed, cancelled)
  - `limit` (default: 100, max: 1000)
  - `offset` (default: 0)
- **Response**: Assignments with operation, operator, and assigner data

#### POST - Create Assignment
- **Request Body**:
  ```json
  {
    "operation_id": "uuid (required)",
    "operator_id": "uuid (required)",
    "assigned_by_id": "uuid (optional)",
    "assigned_at": "ISO datetime (optional, default: now)",
    "notes": "string (optional)"
  }
  ```
- **Status**: 201 Created
- **Validation**:
  - Operation and operator must exist
  - Prevents duplicate active assignments (409)

#### PATCH - Update Assignment
- **Query Parameters**: `?id=<assignment-id>`
- **Request Body**: Any of status, notes
- **Status**: 200 OK

#### DELETE - Delete Assignment
- **Query Parameters**: `?id=<assignment-id>`
- **Status**: 200 OK

---

### 8. API Keys (api-key-generate)

**Base Path**: `/api-key-generate`

**Authentication**: Supabase Auth (Admin role required)

#### GET - List API Keys
- **Response**: Array of API keys (without secret values)
- **Fields**: id, name, key_prefix, active, last_used_at, created_at, created_by

#### POST - Generate API Key
- **Request Body**:
  ```json
  {
    "name": "string (required)"
  }
  ```
- **Status**: 201 Created
- **Response**: Includes plaintext API key (shown only once)
- **Warning**: Store the API key securely - it cannot be retrieved later

#### DELETE - Revoke API Key
- **Query Parameters**: `?id=<api-key-id>`
- **Status**: 200 OK
- **Note**: Soft delete (marks as inactive)

---

### 9. Webhooks (api-webhooks)

**Base Path**: `/api-webhooks`

#### GET - List Webhooks
- **Query Parameters**:
  - `event_type`: Filter by event type
  - `active`: Filter by active status (true/false)
- **Response**: Array of webhooks with configurations

#### POST - Create Webhook
- **Request Body**:
  ```json
  {
    "url": "string (required, valid URL)",
    "event_type": "string (required, e.g., job.created)",
    "secret_key": "string (optional, auto-generated)",
    "active": "boolean (optional, default: true)"
  }
  ```
- **Status**: 201 Created
- **Validation**: URL format validation
- **Auto-generate**: Secret key for HMAC signing if not provided

#### PATCH - Update Webhook
- **Query Parameters**: `?id=<webhook-id>`
- **Request Body**: Any of url, event_type, active
- **Status**: 200 OK
- **Validation**: URL format validation

#### DELETE - Delete Webhook
- **Query Parameters**: `?id=<webhook-id>`
- **Status**: 200 OK

---

### 10. Webhook Logs (api-webhook-logs)

**Base Path**: `/api-webhook-logs`

**Methods**: GET only (read-only)

#### GET - List Webhook Logs
- **Query Parameters**:
  - `webhook_id`: Filter by webhook
  - `status`: Filter by delivery status (success, failed)
  - `event_type`: Filter by event type
  - `limit` (default: 100, max: 1000)
  - `offset` (default: 0)
- **Response**: Logs with webhook data, payload, response status, and errors
- **Use Case**: Monitor webhook deliveries and debug failures

---

### 11. Substeps (api-substeps)

**Base Path**: `/api-substeps`

#### GET - List Substeps
- **Query Parameters**:
  - `operation_id`: Filter by operation
  - `completed`: Filter by completion status (true/false)
- **Response**: Substeps with operation data, ordered by sequence

#### POST - Create Substep
- **Request Body**:
  ```json
  {
    "operation_id": "uuid (required)",
    "description": "string (required)",
    "sequence": "number (optional, auto-incremented)",
    "completed": "boolean (optional, default: false)"
  }
  ```
- **Status**: 201 Created
- **Validation**: Operation must exist

#### PATCH - Update Substep
- **Query Parameters**: `?id=<substep-id>`
- **Request Body**: Any of description, sequence, completed
- **Status**: 200 OK

#### DELETE - Delete Substep
- **Query Parameters**: `?id=<substep-id>`
- **Status**: 200 OK

---

### 12. Materials (api-materials)

**Base Path**: `/api-materials`

**Methods**: GET only (read-only)

#### GET - List Unique Materials
- **Response**: Array of unique material names used across all parts
- **Use Case**: Populate material selection dropdowns

---

### 13. Upload URL Generator (api-upload-url)

**Base Path**: `/api-upload-url`

**Methods**: POST only

#### POST - Generate Signed Upload URL
- **Request Body**:
  ```json
  {
    "file_name": "string (required)",
    "content_type": "string (optional)"
  }
  ```
- **Status**: 201 Created
- **Response**: Signed URL for direct file upload to Supabase Storage
- **Security**: Tenant-scoped paths, expiring URLs

---

## Multi-Tenancy

All resources are automatically scoped to the authenticated tenant via `tenant_id`. Users can only access resources within their own tenant.

## Row Level Security (RLS)

All database tables have RLS policies enforcing tenant isolation and role-based access:
- **Operators**: Read access to jobs, parts, operations; Write access to time entries
- **Admins**: Full CRUD access to all resources

## Data Validation

- All UUIDs are validated
- Required fields are enforced
- String lengths are constrained
- Enums are validated (status, severity, etc.)
- URLs are validated for webhooks
- Duplicate prevention on unique fields

## Cascading Deletes

- Deleting a **job** cascades to parts and operations
- Deleting a **part** cascades to operations
- Constraints prevent deletion if:
  - Cell has operations
  - Part has child parts
  - Operation has time entries

## Webhooks & Events

Supported event types:
- `job.created` - Triggered when a new job is created

Webhook payloads include:
- Event type
- Timestamp
- Tenant ID
- Event-specific data
- HMAC-SHA256 signature for verification

## Rate Limiting

API key endpoints have in-memory rate limiting to prevent abuse.

## Pagination

All list endpoints support pagination:
- `limit`: Records per page (default: 100, max: 1000)
- `offset`: Starting position (default: 0)
- Response includes: `{ limit, offset, total }`

## Best Practices

1. **Store API keys securely** - They are shown only once during generation
2. **Use pagination** - Don't request more data than needed
3. **Filter queries** - Use query parameters to reduce payload size
4. **Check status codes** - Handle all error responses appropriately
5. **Validate webhooks** - Verify HMAC signatures on webhook deliveries
6. **Use proper methods** - GET for reading, POST for creating, PATCH for updating, DELETE for removing
7. **Handle 409 conflicts** - Check for duplicates before creating resources

## Error Code Reference

| Code | Description |
|------|-------------|
| UNAUTHORIZED | Invalid or missing authentication |
| FORBIDDEN | Insufficient permissions |
| VALIDATION_ERROR | Invalid request data |
| NOT_FOUND | Resource doesn't exist |
| DUPLICATE_JOB | Job number already exists |
| DUPLICATE_CELL | Cell name already exists |
| DUPLICATE_PART | Part number exists in job |
| DUPLICATE_ASSIGNMENT | Active assignment exists |
| CONFLICT | Resource has dependencies |
| INVALID_CELL | Cell not found |
| INVALID_PARENT | Parent part invalid |
| METHOD_NOT_ALLOWED | HTTP method not supported |
| INTERNAL_ERROR | Server error |

## Complete CRUD Coverage Matrix

| Resource | GET | POST | PATCH | DELETE | Notes |
|----------|-----|------|-------|--------|-------|
| cells | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| jobs | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| parts | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| operations | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| time_entries | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| issues | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| assignments | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| api_keys | ✅ | ✅ | ❌ | ✅ | Soft delete/revoke |
| webhooks | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| webhook_logs | ✅ | ❌ | ❌ | ❌ | Read-only |
| substeps | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| materials | ✅ | ❌ | ❌ | ❌ | Read-only reference |
| upload-urls | ❌ | ✅ | ❌ | ❌ | Generate only |

---

## Support

For issues, questions, or feature requests, please contact the development team or refer to the project repository.

**Version**: 1.0.0
**Last Updated**: 2025-01-17
