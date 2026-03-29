---
title: API Examples
description: Practical curl examples for every API operation — querying, creating, syncing, and webhooks.
---

Every entity in Eryxon Flow is accessible through the REST API. All requests use Bearer token auth with an API key generated in the admin panel.

```bash
AUTH="Authorization: Bearer ery_live_xxxxx"
BASE="https://your-project.supabase.co/functions/v1"
```

## Querying Data

### List and search jobs

```bash
# All jobs
curl "$BASE/api-jobs" -H "$AUTH"

# Search by customer or job number
curl "$BASE/api-jobs?search=Precision+Steel" -H "$AUTH"

# Filter by status
curl "$BASE/api-jobs?status=in_progress" -H "$AUTH"

# Sort by due date, paginate
curl "$BASE/api-jobs?sort=due_date&order=asc&limit=20&offset=0" -H "$AUTH"
```

### Get parts for a job

```bash
curl "$BASE/api-parts?job_id=<uuid>" -H "$AUTH"

# Search by part number or material
curl "$BASE/api-parts?search=UPRIGHT" -H "$AUTH"
```

### Get operations for a part

```bash
curl "$BASE/api-operations?part_id=<uuid>&sort=sequence&order=asc" -H "$AUTH"

# Filter by cell or status
curl "$BASE/api-operations?cell_id=<uuid>&status=not_started" -H "$AUTH"
```

## Creating Data

### Create a job with nested parts and operations

```bash
curl -X POST "$BASE/api-jobs" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "job_number": "WO-2026-0200",
  "customer": "Precision Steel Ltd",
  "due_date": "2026-06-01",
  "parts": [
    {
      "part_number": "FRAME-001",
      "material": "S355J2",
      "quantity": 2,
      "operations": [
        {"operation_name": "Laser cut", "cell_id": "<uuid>", "sequence": 1, "estimated_time": 120},
        {"operation_name": "Bend", "cell_id": "<uuid>", "sequence": 2, "estimated_time": 90}
      ]
    }
  ]
}'
```

### Update metadata on an operation

```bash
curl -X PATCH "$BASE/api-operations?id=<uuid>" -H "$AUTH" \
  -H "Content-Type: application/json" -d '{
  "metadata": {"power": 4000, "speed": 12000, "gas": "N2"}
}'
```

## ERP Sync

### Bulk sync (same endpoint CSV import uses)

```bash
curl -X POST "$BASE/api-jobs/bulk-sync" -H "$AUTH" \
  -H "Content-Type: application/json" -d '{
  "items": [
    {"external_id": "ERP-001", "external_source": "SAP", "job_number": "WO-001", "customer": "Precision Steel Ltd"}
  ]
}'
```

Records are upserted by `external_id` + `external_source`. Re-importing the same data updates existing records instead of creating duplicates.

Available on: `api-jobs`, `api-parts`, `api-operations`, `api-cells`, `api-resources`.

## CAD/CAM Batch Integration

### Create a nesting batch

```bash
curl -X POST "$BASE/api-batches" -H "$AUTH" \
  -H "Content-Type: application/json" -d '{
  "batch_number": "NEST-001",
  "batch_type": "laser_nesting",
  "cell_id": "<uuid>",
  "material": "S235",
  "thickness_mm": 6,
  "nesting_metadata": {"sheet": "1500x3000", "utilization": 87},
  "operation_ids": ["<op-uuid-1>", "<op-uuid-2>", "<op-uuid-3>"]
}'
```

### Machine reports batch start

```bash
curl -X POST "$BASE/api-batch-lifecycle/start?id=<batch-uuid>" \
  -H "$AUTH" -H "Content-Type: application/json" -d '{}'
```

No `operator_id` needed for machine-reported starts.

### Machine reports batch done

```bash
curl -X POST "$BASE/api-batch-lifecycle/stop?id=<batch-uuid>" \
  -H "$AUTH" -H "Content-Type: application/json" -d '{}'
```

Operations are marked completed. If an operator was clocked on, time is distributed proportionally.

## Operation Lifecycle

```bash
# Start (creates time entry)
curl -X POST "$BASE/api-operation-lifecycle/start?id=<uuid>" -H "$AUTH" -d '{}'

# Complete (closes time entry, marks done)
curl -X POST "$BASE/api-operation-lifecycle/complete?id=<uuid>" -H "$AUTH" -d '{}'
```

## Webhooks

### Subscribe to events

```bash
curl -X POST "$BASE/api-webhooks" -H "$AUTH" \
  -H "Content-Type: application/json" -d '{
  "url": "https://your-erp.com/webhook",
  "events": ["operation.started", "operation.completed"],
  "secret_key": "your-hmac-secret",
  "active": true
}'
```

Events are POSTed to your URL with an HMAC SHA-256 signature in the `X-Eryxon-Signature` header. Deliveries are logged and visible in the webhook logs API.

For full field reference, see [REST API Reference](/api/rest-api-reference/) and [Payload Reference](/api/payload-reference/).
