# Eryxon Flow API Documentation

## Overview

The Eryxon Flow API provides RESTful endpoints for managing manufacturing jobs, parts, tasks, and webhooks. All endpoints require API key authentication.

**Base URL:** `https://vatgianzotsurljznsry.supabase.co/functions/v1`

## Authentication

All API requests must include an API key in the `Authorization` header:

```
Authorization: Bearer ery_live_xxxxxxxxxxxxxxxxxxxxx
```

### Generating API Keys

API keys can be generated through the admin dashboard at `/admin/config/api-keys`. Keys are displayed **only once** upon creation and are securely hashed in the database.

**Key Formats:**
- Production: `ery_live_*`
- Test: `ery_test_*`

## Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Invalid or missing API key
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource (e.g., job number already exists)
- `500 Internal Server Error` - Server error

## Response Format

All responses follow this structure:

```json
{
  "success": true|false,
  "data": { ... },
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { ... }
  }
}
```

---

## Jobs API

### Create Job

Creates a new manufacturing job with parts and tasks.

**Endpoint:** `POST /api-jobs`

**Request Body:**

```json
{
  "job_number": "JOB-2024-001",
  "customer": "Acme Corp",
  "due_date": "2024-12-31",
  "notes": "Rush order",
  "metadata": { "priority": "high" },
  "parts": [
    {
      "part_number": "PART-001",
      "material": "Stainless Steel 304",
      "quantity": 10,
      "parent_part_number": null,
      "file_paths": ["path/to/drawing.pdf"],
      "notes": "Polish finish required",
      "metadata": { "thickness": "3mm" },
      "tasks": [
        {
          "task_name": "Cut blanks",
          "stage_name": "Cutting",
          "estimated_time": 120,
          "sequence": 1,
          "notes": "Use laser cutter"
        },
        {
          "task_name": "Bend edges",
          "stage_name": "Bending",
          "estimated_time": 90,
          "sequence": 2
        }
      ]
    }
  ]
}
```

**Field Descriptions:**
- `job_number` (required): Unique job identifier
- `customer` (optional): Customer name
- `due_date` (optional): ISO 8601 date string
- `parts` (required): Array of at least one part
  - `part_number` (required): Unique part identifier
  - `material` (required): Material specification
  - `quantity` (optional): Number of parts, defaults to 1
  - `parent_part_number` (optional): For assembly hierarchies
  - `tasks` (required): Array of at least one task
    - `stage_name` (required): Must match existing stage
    - `estimated_time` (required): Minutes

**Response (201 Created):**

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
        "tasks": [
          {
            "task_id": "uuid",
            "task_name": "Cut blanks"
          }
        ]
      }
    ]
  }
}
```

**Triggers Webhook:** `job.created`

---

### List Jobs

Retrieve jobs with filtering and pagination.

**Endpoint:** `GET /api-jobs`

**Query Parameters:**
- `status` - Filter by status: `not_started`, `in_progress`, `completed`, `on_hold`
- `customer` - Filter by customer name (partial match)
- `job_number` - Filter by job number (partial match)
- `limit` - Results per page (default: 100, max: 1000)
- `offset` - Skip N results (default: 0)

**Example Request:**

```
GET /api-jobs?status=in_progress&customer=Acme&limit=50&offset=0
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "job_number": "JOB-2024-001",
        "customer": "Acme Corp",
        "due_date": "2024-12-31",
        "status": "in_progress",
        "notes": "Rush order",
        "metadata": { "priority": "high" },
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T10:00:00Z",
        "parts": [
          {
            "id": "uuid",
            "part_number": "PART-001",
            "material": "Stainless Steel 304",
            "quantity": 10,
            "status": "in_progress"
          }
        ]
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 125
    }
  }
}
```

---

### Update Job

Update job fields.

**Endpoint:** `PATCH /api-jobs?id={job_id}`

**Request Body:**

```json
{
  "status": "on_hold",
  "due_date_override": "2025-01-15",
  "notes": "Waiting for material"
}
```

**Updatable Fields:**
- `status`
- `customer`
- `due_date`
- `due_date_override`
- `notes`
- `metadata`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "job": { /* updated job object */ }
  }
}
```

---

## Parts API

### List Parts

Retrieve parts with filtering.

**Endpoint:** `GET /api-parts`

**Query Parameters:**
- `job_id` - Filter by job UUID
- `job_number` - Filter by job number (partial match)
- `material` - Filter by material (partial match)
- `status` - Filter by status
- `part_number` - Filter by part number (partial match)
- `limit` - Results per page (default: 100)
- `offset` - Skip N results (default: 0)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "parts": [
      {
        "id": "uuid",
        "part_number": "PART-001",
        "material": "Stainless Steel 304",
        "quantity": 10,
        "status": "in_progress",
        "file_paths": ["path/to/file.pdf"],
        "notes": "Polish finish",
        "metadata": {},
        "job": {
          "id": "uuid",
          "job_number": "JOB-2024-001",
          "customer": "Acme Corp"
        },
        "tasks": [
          {
            "id": "uuid",
            "task_name": "Cut blanks",
            "status": "completed",
            "completion_percentage": 100,
            "stage": {
              "id": "uuid",
              "name": "Cutting",
              "color": "#ff0000"
            }
          }
        ]
      }
    ],
    "pagination": {
      "limit": 100,
      "offset": 0,
      "total": 50
    }
  }
}
```

---

### Update Part

Update part fields.

**Endpoint:** `PATCH /api-parts?id={part_id}`

**Request Body:**

```json
{
  "status": "completed",
  "quantity": 12,
  "notes": "Added 2 extra units"
}
```

**Updatable Fields:**
- `status`
- `quantity`
- `notes`
- `metadata`
- `file_paths`

---

## Tasks API

### List Tasks

Retrieve tasks with filtering.

**Endpoint:** `GET /api-tasks`

**Query Parameters:**
- `part_id` - Filter by part UUID
- `job_id` - Filter by job UUID (finds tasks across all parts in job)
- `stage_id` - Filter by stage UUID
- `stage_name` - Filter by stage name (partial match)
- `status` - Filter by status
- `assigned_operator_id` - Filter by operator UUID
- `limit` - Results per page (default: 100)
- `offset` - Skip N results (default: 0)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "task_name": "Cut blanks",
        "sequence": 1,
        "estimated_time": 120,
        "actual_time": 115,
        "status": "completed",
        "completion_percentage": 100,
        "notes": "Used laser cutter",
        "completed_at": "2024-01-15T12:00:00Z",
        "part": {
          "id": "uuid",
          "part_number": "PART-001",
          "material": "Stainless Steel 304",
          "job": {
            "id": "uuid",
            "job_number": "JOB-2024-001",
            "customer": "Acme Corp"
          }
        },
        "stage": {
          "id": "uuid",
          "name": "Cutting",
          "color": "#ff0000",
          "sequence": 1
        },
        "assigned_operator": {
          "id": "uuid",
          "username": "john_doe",
          "full_name": "John Doe"
        },
        "time_entries": [
          {
            "id": "uuid",
            "start_time": "2024-01-15T10:00:00Z",
            "end_time": "2024-01-15T12:00:00Z",
            "duration": 115
          }
        ]
      }
    ],
    "pagination": {
      "limit": 100,
      "offset": 0,
      "total": 250
    }
  }
}
```

---

### Update Task

Update task fields.

**Endpoint:** `PATCH /api-tasks?id={task_id}`

**Request Body:**

```json
{
  "status": "completed",
  "completion_percentage": 100,
  "actual_time": 115,
  "notes": "Completed ahead of schedule"
}
```

**Updatable Fields:**
- `status`
- `completion_percentage` (0-100)
- `notes`
- `assigned_operator_id`
- `actual_time` (minutes)

**Note:** When `status` is set to `completed`, `completed_at` is automatically set to the current timestamp.

**Triggers Webhook:** `task.completed`

---

## Reference Data APIs

### List Stages

Retrieve available production stages.

**Endpoint:** `GET /api-stages`

**Query Parameters:**
- `active` - Set to `true` to filter only active stages

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "stages": [
      {
        "id": "uuid",
        "name": "Cutting",
        "color": "#ff0000",
        "sequence": 1
      },
      {
        "id": "uuid",
        "name": "Bending",
        "color": "#0000ff",
        "sequence": 2
      }
    ]
  }
}
```

---

### List Materials

Retrieve materials currently in use.

**Endpoint:** `GET /api-materials`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "materials": [
      "Aluminum 6061",
      "Stainless Steel 304",
      "Stainless Steel 316"
    ]
  }
}
```

---

## File Upload API

### Get Upload URL

Request a signed URL for uploading files to cloud storage.

**Endpoint:** `POST /api-upload-url`

**Request Body:**

```json
{
  "filename": "part-drawing.pdf",
  "content_type": "application/pdf",
  "job_number": "JOB-2024-001"
}
```

**Field Descriptions:**
- `filename` (required): Name of file to upload
- `content_type` (required): MIME type (e.g., `application/pdf`, `image/jpeg`)
- `job_number` (optional): If provided, file will be organized under job folder

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "upload_url": "https://...presigned-url...",
    "file_path": "tenant_id/jobs/JOB-2024-001/part-drawing.pdf",
    "expires_at": "2024-01-15T10:15:00Z"
  }
}
```

**Usage:**

1. Request signed URL from this endpoint
2. Upload file directly to the `upload_url` using PUT request with appropriate `Content-Type` header
3. Save the `file_path` in your part's `file_paths` array

**Example Upload:**

```bash
curl -X PUT "SIGNED_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary @part-drawing.pdf
```

---

## Webhooks

### Overview

Webhooks allow you to receive real-time notifications when events occur in your account. Configure webhook endpoints in the admin dashboard at `/admin/config/webhooks`.

### Available Events

- `job.created` - New job created via API
- `task.started` - Operator starts working on task
- `task.completed` - Task marked as completed
- `issue.created` - Quality issue reported

### Webhook Payload Format

All webhooks send POST requests with this structure:

```json
{
  "event": "task.completed",
  "timestamp": "2024-01-15T12:00:00Z",
  "data": {
    /* Event-specific data */
  }
}
```

### Webhook Headers

- `Content-Type: application/json`
- `X-Eryxon-Signature: sha256=<hmac_signature>` - HMAC-SHA256 signature for verification
- `X-Eryxon-Event: <event_type>` - Event type for routing
- `User-Agent: Eryxon-Webhooks/1.0`

### Signature Verification

Verify webhook authenticity by computing HMAC-SHA256 of the request body using your webhook's secret key:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Event Payloads

#### job.created

```json
{
  "event": "job.created",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "job_id": "uuid",
    "job_number": "JOB-2024-001",
    "customer": "Acme Corp",
    "parts_count": 5,
    "tasks_count": 15,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

#### task.started

```json
{
  "event": "task.started",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "task_id": "uuid",
    "task_name": "Cut blanks",
    "part_id": "uuid",
    "part_number": "PART-001",
    "job_id": "uuid",
    "job_number": "JOB-2024-001",
    "operator_id": "uuid",
    "operator_name": "John Doe",
    "started_at": "2024-01-15T10:30:00Z"
  }
}
```

#### task.completed

```json
{
  "event": "task.completed",
  "timestamp": "2024-01-15T12:00:00Z",
  "data": {
    "task_id": "uuid",
    "task_name": "Cut blanks",
    "part_id": "uuid",
    "part_number": "PART-001",
    "job_id": "uuid",
    "job_number": "JOB-2024-001",
    "operator_id": "uuid",
    "operator_name": "John Doe",
    "completed_at": "2024-01-15T12:00:00Z",
    "actual_time": 90,
    "estimated_time": 120
  }
}
```

#### issue.created

```json
{
  "event": "issue.created",
  "timestamp": "2024-01-15T11:00:00Z",
  "data": {
    "issue_id": "uuid",
    "task_id": "uuid",
    "task_name": "Cut blanks",
    "part_id": "uuid",
    "part_number": "PART-001",
    "job_id": "uuid",
    "job_number": "JOB-2024-001",
    "created_by": "uuid",
    "operator_name": "John Doe",
    "severity": "high",
    "description": "Material defect found",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

### Delivery & Retries

- Webhooks have a 10-second timeout
- Failed deliveries are logged but **not automatically retried**
- You can view delivery logs in the admin dashboard

---

## Rate Limits

Currently, there are no enforced rate limits. However, we recommend:
- Maximum 100 requests per second per API key
- Use pagination for large result sets
- Implement exponential backoff for retries

---

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or missing API key |
| `FORBIDDEN` | Insufficient permissions |
| `VALIDATION_ERROR` | Invalid request parameters |
| `DUPLICATE_JOB` | Job number already exists |
| `INVALID_STAGE` | Referenced stage does not exist |
| `NOT_FOUND` | Resource not found |
| `METHOD_NOT_ALLOWED` | HTTP method not supported |
| `INTERNAL_ERROR` | Server error |

---

## Examples

### Complete Workflow Example

```bash
# 1. Get available stages
curl -X GET "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-stages?active=true" \
  -H "Authorization: Bearer ery_live_xxxxx"

# 2. Create a job
curl -X POST "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-jobs" \
  -H "Authorization: Bearer ery_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "job_number": "JOB-2024-001",
    "customer": "Acme Corp",
    "parts": [{
      "part_number": "PART-001",
      "material": "Steel",
      "tasks": [{
        "task_name": "Cut",
        "stage_name": "Cutting",
        "estimated_time": 60,
        "sequence": 1
      }]
    }]
  }'

# 3. Check job status
curl -X GET "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-jobs?job_number=JOB-2024-001" \
  -H "Authorization: Bearer ery_live_xxxxx"

# 4. Update task progress
curl -X PATCH "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-tasks?id=TASK_UUID" \
  -H "Authorization: Bearer ery_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "completion_percentage": 50,
    "notes": "Halfway complete"
  }'

# 5. Mark task as completed
curl -X PATCH "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-tasks?id=TASK_UUID" \
  -H "Authorization: Bearer ery_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

---

## Best Practices

1. **Store API Keys Securely**
   - Never commit keys to version control
   - Use environment variables or secrets management
   - Rotate keys periodically

2. **Handle Errors Gracefully**
   - Implement exponential backoff for retries
   - Log errors for debugging
   - Validate data before sending

3. **Use Webhooks for Real-time Updates**
   - Preferred over polling
   - Verify webhook signatures
   - Respond quickly (< 5s) to webhook requests

4. **Optimize Queries**
   - Use filtering to reduce response size
   - Implement pagination for large datasets
   - Cache reference data (stages, materials)

5. **File Management**
   - Use signed upload URLs for direct uploads
   - Store file paths in part metadata
   - Clean up unused files periodically

---

## Support

For API support, please contact your administrator or refer to the application documentation.

**API Version:** 1.0
**Last Updated:** 2024-01-15
