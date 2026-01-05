---
title: "REST API Reference"
description: "Inbound integration reference for Jobs, Parts, Operations, and ERP Sync."
---



**Base URL:** `https://vatgianzotsurljznsry.supabase.co/functions/v1`

## Authentication
Use your API Key in the `Authorization` header as a Bearer token.

---

## Core Endpoints

### Jobs API
- `GET /api-jobs`: List jobs (supports `status`, `customer`, `job_number` filters).
- `POST /api-jobs`: Create a new job (includes parts and operations).
- `PATCH /api-jobs?id={id}`: Update job details.

### Parts & Operations
- `GET /api-parts`: List parts.
- `GET /api-operations`: List operations (supports `part_id` and `cell_id` filters).
- `POST /api-operation-lifecycle`: Start, pause, resume, or complete an operation.

### Production Reporting
- `POST /api-operation-quantities`: Report good and scrap quantities with reasons.
- `POST /api-issues`: Create quality issues or Non-Conformance Reports (NCR).

---

## ERP Sync (Bidirectional)

Sync records between Eryxon and external systems (SAP, NetSuite, etc.) using `external_id` mapping.

### Sync Modes
- **Diff (`POST /api-erp-sync/diff`)**: Preview changes before applying.
- **Sync (`POST /api-erp-sync/sync`)**: Execute the update with change detection via `sync_hash`.
- **Bulk Sync**: Upsert up to 1,000 records in a single request.

---

## Testing with cURL

### List Jobs
```bash
curl -X GET "https://[URL]/functions/v1/api-jobs?limit=5" \
  -H "Authorization: Bearer ery_live_YOUR_KEY"
```

### Create Job
```bash
curl -X POST "https://[URL]/functions/v1/api-jobs" \
  -H "Authorization: Bearer ery_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "job_number": "EX-100",
    "customer_name": "Acme",
    "parts": [{ "part_number": "P1", "quantity": 10 }]
  }'
```

---

## Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid cell ID",
    "details": [...]
  }
}
```
