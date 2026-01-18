---
title: "API Sync Endpoints Reference"
description: "Documentation for API Sync Endpoints Reference"
---



Sync endpoints for ERP integration with Eryxon MES. Uses upsert logic—creates new records or updates existing ones based on `external_id`.

See also: [API Key Authentication](/api/api_key_authentication/), [REST API Reference](/api/api_documentation/), [ERP Integration Guide](/features/erp-integration/)

## Authentication

All requests require an API key in the Authorization header. See [API Key Authentication](/api/api_key_authentication/) for details.

```bash
Authorization: Bearer ery_live_your_api_key_here
```

## Jobs Sync

### Single Job Sync

```http
PUT /api-jobs/sync
Content-Type: application/json
```

**Request Body:**

```json
{
  "external_id": "SO-12345",
  "external_source": "SAP",
  "job_number": "JOB-2024-001",
  "customer": "Acme Corp",
  "due_date": "2024-12-31",
  "priority": 5,
  "notes": "Synced from SAP"
}
```

**With Nested Parts & Operations:**

```json
{
  "external_id": "SO-12345",
  "external_source": "SAP",
  "job_number": "JOB-2024-001",
  "customer": "Acme Corp",
  "parts": [
    {
      "external_id": "SO-12345-10",
      "part_number": "BRACKET-A",
      "material": "Steel 304",
      "quantity": 25,
      "operations": [
        {
          "external_id": "SO-12345-10-010",
          "operation_name": "Laser Cut",
          "cell_name": "Cutting",
          "sequence": 1,
          "estimated_time_minutes": 30
        },
        {
          "external_id": "SO-12345-10-020",
          "operation_name": "Bend 90°",
          "cell_name": "Bending",
          "sequence": 2,
          "estimated_time_minutes": 15
        }
      ]
    }
  ]
}
```

**Response (201 Created / 200 Updated):**

```json
{
  "success": true,
  "data": {
    "action": "created",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "external_id": "SO-12345"
  }
}
```

### Bulk Jobs Sync

```http
POST /api-jobs/bulk-sync
Content-Type: application/json
```

**Request Body:**

```json
{
  "jobs": [
    {
      "external_id": "SO-001",
      "external_source": "SAP",
      "job_number": "JOB-001",
      "customer": "Customer A"
    },
    {
      "external_id": "SO-002",
      "external_source": "SAP",
      "job_number": "JOB-002",
      "customer": "Customer B"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 2,
    "created": 1,
    "updated": 1,
    "errors": 0,
    "results": [
      {
        "external_id": "SO-001",
        "id": "uuid-1",
        "action": "created"
      },
      {
        "external_id": "SO-002",
        "id": "uuid-2",
        "action": "updated"
      }
    ]
  }
}
```

## Parts Sync

### Single Part Sync

```http
PUT /api-parts/sync
Content-Type: application/json
```

**Request Body:**

```json
{
  "external_id": "SO-12345-10",
  "external_source": "SAP",
  "job_external_id": "SO-12345",
  "part_number": "BRACKET-A",
  "material": "Steel 304",
  "quantity": 25,
  "notes": "Handle with care"
}
```

> **Note:** `job_external_id` is required to link the part to its parent job.

### Bulk Parts Sync

```http
POST /api-parts/bulk-sync
Content-Type: application/json
```

```json
{
  "parts": [
    {
      "external_id": "SO-001-10",
      "external_source": "SAP",
      "job_external_id": "SO-001",
      "part_number": "PART-A",
      "quantity": 10
    }
  ]
}
```

## Operations Sync

### Single Operation Sync

```http
PUT /api-operations/sync
Content-Type: application/json
```

**Request Body:**

```json
{
  "external_id": "SO-12345-10-010",
  "external_source": "SAP",
  "part_external_id": "SO-12345-10",
  "operation_name": "Laser Cut",
  "cell_name": "Cutting",
  "sequence": 1,
  "estimated_time_minutes": 30,
  "notes": "Use 1000W laser"
}
```

> **Note:** `part_external_id` and `cell_name` are required.

### Bulk Operations Sync

```http
POST /api-operations/bulk-sync
Content-Type: application/json
```

## Cells Sync

### Single Cell Sync

```http
PUT /api-cells/sync
Content-Type: application/json
```

**Request Body:**

```json
{
  "external_id": "WC-CUTTING",
  "external_source": "SAP",
  "name": "Cutting",
  "color": "#3b82f6",
  "sequence": 1,
  "active": true
}
```

### Bulk Cells Sync

```http
POST /api-cells/bulk-sync
Content-Type: application/json
```

## Resources Sync

### Single Resource Sync

```http
PUT /api-resources/sync
Content-Type: application/json
```

**Request Body:**

```json
{
  "external_id": "TOOL-001",
  "external_source": "SAP",
  "name": "CNC Mill #1",
  "type": "equipment",
  "description": "5-axis CNC milling machine",
  "identifier": "MILL-001",
  "location": "Building A, Bay 3",
  "status": "available"
}
```

**Resource Types:**
- `tooling`
- `fixture`
- `mold`
- `material`
- `equipment`

**Status Values:**
- `available`
- `in_use`
- `maintenance`

### Bulk Resources Sync

```http
POST /api-resources/bulk-sync
Content-Type: application/json
```

## Error Handling

### Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "external_id is required for sync operations"
  }
}
```

### Bulk Sync with Errors

```json
{
  "success": true,
  "data": {
    "total": 3,
    "created": 1,
    "updated": 1,
    "errors": 1,
    "results": [
      { "external_id": "SO-001", "id": "uuid-1", "action": "created" },
      { "external_id": "SO-002", "id": "uuid-2", "action": "updated" },
      { "external_id": "SO-003", "action": "error", "error": "Invalid due_date format" }
    ]
  }
}
```

## Rate Limits

- Bulk sync: Maximum 1000 records per request
- Rate limiting headers are included in responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Sync Order Recommendations

For initial sync, follow this order to satisfy foreign key relationships:

1. **Cells** (Work Centers) - No dependencies
2. **Resources** (Equipment) - No dependencies
3. **Jobs** (Sales Orders) - No dependencies
4. **Parts** (Work Orders) - Requires job_external_id
5. **Operations** (Routing Steps) - Requires part_external_id and cell_name
