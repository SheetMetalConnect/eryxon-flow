---
title: "API Payload Reference"
description: "Current request fields and copy-paste examples for Eryxon Flow integration endpoints."
---

# API Payload Reference

This page covers the main ERP and production payloads. The [REST API reference](/api/rest-api-reference/) documents routes, filters, responses and lifecycle rules. The machine-readable contract is available from `/openapi.json` in the app.

All examples use placeholder UUIDs and companies. Replace them with records from the same workshop as the API key.

## Authentication

```http
Authorization: Bearer ery_live_your_api_key
Content-Type: application/json
```

Create and revoke keys under **Admin > API keys**. Do not put a key in browser code, documentation or a public repository.

## Jobs

### Create a job with parts and operations

`POST /functions/v1/api-jobs`

```json
{
  "job_number": "JOB-2026-001",
  "customer": "Example Fabrication",
  "due_date": "2026-12-31",
  "notes": "Release after material receipt",
  "metadata": {
    "purchase_order": "PO-12345"
  },
  "parts": [
    {
      "part_number": "PART-001",
      "material": "Aluminium 6061-T6",
      "quantity": 10,
      "drawing_no": "DWG-001-A",
      "notes": "Deburr before inspection",
      "operations": [
        {
          "operation_name": "Laser cut",
          "cell_id": "10000000-0000-4000-8000-000000000001",
          "sequence": 1,
          "estimated_time": 20,
          "setup_time": 5
        },
        {
          "operation_name": "Bend",
          "cell_id": "10000000-0000-4000-8000-000000000002",
          "sequence": 2,
          "estimated_time": 30
        }
      ]
    }
  ]
}
```

Writable job fields are `job_number`, `customer`, `due_date`, `due_date_override`, `notes`, `metadata`, delivery fields, external IDs and derived-state override fields. Normal integrations should let operation transitions derive job status and the current cell.

Each nested part needs `part_number` and `quantity`. Each nested operation needs `operation_name` and `sequence`. UUID references must belong to the authenticated workshop.

### Update a job

`PATCH /functions/v1/api-jobs?id=<job-id>`

```json
{
  "customer": "Example Fabrication",
  "due_date_override": "2027-01-05",
  "notes": "Customer-approved date change"
}
```

### Synchronize by external ID

`PUT /functions/v1/api-jobs/sync`

```json
{
  "external_id": "ERP-JOB-001",
  "external_source": "erp",
  "job_number": "JOB-2026-001",
  "customer": "Example Fabrication"
}
```

For multiple records, call `POST /functions/v1/api-jobs/bulk-sync` with an `items` array. The same `/sync` and `/bulk-sync` pattern is available for parts, operations, cells and resources.

## Parts

### Create a part

`POST /functions/v1/api-parts`

```json
{
  "job_id": "33333333-3333-3333-3333-333333333333",
  "part_number": "PART-002",
  "material": "S355MC",
  "quantity": 25,
  "drawing_no": "DWG-002-B",
  "cnc_program_name": "PART-002-R2",
  "material_lot": "LOT-2026-09",
  "notes": "Keep material certificate with the batch",
  "operations": [
    {
      "operation_name": "Saw",
      "cell_id": "44444444-4444-4444-4444-444444444444",
      "sequence": 1,
      "estimated_time": 15
    }
  ]
}
```

The supported part filters are `job_id`, `status` and `material`. Text search covers `part_number` and `material`. Use `sort=part_number|created_at|status` with `order=asc|desc`.

`file_paths` and `image_paths` contain tenant-prefixed private object paths, not public URLs. Request short-lived read URLs through `GET /api-parts/{part-id}/file-url` or the parts-images endpoints.

## Operations

### Create operation metadata

`POST /functions/v1/api-operations`

```json
{
  "part_id": "55555555-5555-5555-5555-555555555555",
  "operation_name": "Weld",
  "cell_id": "66666666-6666-6666-6666-666666666666",
  "sequence": 3,
  "estimated_time": 60,
  "setup_time": 10,
  "notes": "TIG process"
}
```

Writable operation fields are routing and planning metadata: `part_id`, `cell_id`, `operation_name`, `sequence`, `assigned_operator_id`, `estimated_time`, `setup_time`, `changeover_time`, `run_time_per_unit`, `wait_time`, planned dates, notes, metadata and external IDs.

Do not write lifecycle fields such as `status`, `started_at`, `completed_at` or `actual_time` through this endpoint. Use the lifecycle calls so timers, sequential release and derived job state stay consistent.

### Transition an operation

```http
POST /functions/v1/api-operation-lifecycle/start?id=<operation-id>&user_id=<operator-profile-id>
POST /functions/v1/api-operation-lifecycle/pause?id=<operation-id>
POST /functions/v1/api-operation-lifecycle/resume?id=<operation-id>&user_id=<operator-profile-id>
POST /functions/v1/api-operation-lifecycle/complete?id=<operation-id>
```

`user_id` is optional. Supply it when starting or resuming tracked operator time. A refused production rule returns `409 CONFLICT` with the rule in `error.message`.

Supported list filters are `part_id`, `cell_id` and `status`. Text search covers `operation_name`; sorting supports `sequence`, `operation_name`, `created_at` and `status`.

## Issues and NCRs

`POST /functions/v1/api-issues`

```json
{
  "operation_id": "77777777-7777-7777-7777-777777777777",
  "title": "Dimension outside tolerance",
  "description": "Measured value exceeds the drawing tolerance",
  "severity": "high",
  "issue_type": "ncr",
  "ncr_category": "process_error",
  "affected_quantity": 5,
  "disposition": "rework",
  "root_cause": "Tool wear",
  "corrective_action": "Replace tool and rework affected parts",
  "verification_required": true,
  "reported_by_id": "88888888-8888-8888-8888-888888888888"
}
```

Issue status values are `pending`, `approved`, `rejected` and `closed`. NCR categories are `material_defect`, `dimensional`, `surface_finish`, `process_error` and `other`; dispositions are `scrap`, `rework`, `use_as_is` and `return_to_supplier`. Supported list filters are `severity`, `status`, `issue_type`, `ncr_category`, `reported_by_id` and `operation_id`.

## Substeps

`POST /functions/v1/api-substeps`

```json
{
  "operation_id": "77777777-7777-7777-7777-777777777777",
  "name": "Measure hole diameter",
  "sequence": 1,
  "status": "not_started",
  "notes": "Record the value on the inspection sheet"
}
```

Update completion through `PATCH /functions/v1/api-substeps?id=<substep-id>`:

```json
{
  "status": "completed",
  "completed_at": "2026-09-19T10:30:00Z",
  "completed_by": "88888888-8888-8888-8888-888888888888"
}
```

Status values are `not_started`, `in_progress`, `completed` and `blocked`.

## Batches

### Create a batch

`POST /functions/v1/api-batches`

```json
{
  "batch_number": "NEST-2026-001",
  "batch_type": "laser_nesting",
  "production_mode": "automated",
  "cell_id": "99999999-9999-9999-9999-999999999999",
  "material": "SS304",
  "thickness_mm": 2,
  "notes": "Nesting run for sheet 1",
  "nesting_metadata": {
    "program": "NEST-2026-001.nc"
  },
  "operation_ids": [
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
  ]
}
```

`production_mode=automated` is only valid for `laser_nesting`. Referenced cells, parent batches and operations must belong to the workshop; an operation cannot already belong to another batch.

Calculated and lifecycle fields such as `status`, `actual_time` and `operations_count` are not writable through create or update payloads.

### Batch lifecycle

```http
POST /functions/v1/api-batch-lifecycle/start?id=<batch-id>
POST /functions/v1/api-batch-lifecycle/stop?id=<batch-id>
```

An optional JSON body may contain `operator_id`. Add unassigned operations while a batch is `draft` or `ready`:

`POST /functions/v1/api-batch-lifecycle/add-operations?id=<batch-id>`

```json
{
  "operation_ids": ["cccccccc-cccc-cccc-cccc-cccccccccccc"]
}
```

## Webhooks

`POST /functions/v1/api-webhooks`

```json
{
  "name": "ERP production events",
  "url": "https://integration.example/webhooks/eryxon",
  "events": ["operation.started", "operation.completed"],
  "secret_key": "replace-with-a-random-signing-secret",
  "active": true
}
```

Webhook targets must use HTTPS. Local, link-local and private targets are rejected unless a self-hosted operator explicitly enables private targets. Redirects are not followed. Delivery records are read-only through `GET /functions/v1/api-webhook-deliveries`.

See [Webhooks](/architecture/connectivity-webhooks/) for the event catalogue, signature verification and retry behaviour.

## Files

### Create a signed upload URL

`POST /functions/v1/api-upload-url`

```json
{
  "filename": "PART-002-R2.step",
  "content_type": "application/step",
  "job_number": "JOB-2026-001"
}
```

The response contains `upload_url`, the private `file_path` to store on the record and `expires_at`. File names cannot contain path separators.

### Upload a part image

`POST /functions/v1/api-parts-images/<part-id>/upload` expects multipart form data with one `file`. JPEG, PNG, WebP and GIF are accepted up to 10 MB.

## Common query parameters

CRUD list endpoints accept `limit` (1-1000), `offset`, `search`, `sort` and `order=asc|desc`. Each endpoint only accepts the filters and sort fields listed in the [REST API reference](/api/rest-api-reference/); unknown filters are ignored.

## Response envelope

Successful responses use:

```json
{
  "success": true,
  "data": {}
}
```

List pagination is returned inside `data.pagination`. Errors use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": []
  }
}
```

Common status codes are `400` for malformed input, `401` for authentication, `403` for a tenant boundary, `404` for a missing record, `409` for a conflict or refused production transition, `422` for field validation and `429` for a hosted API quota.
