# API Catalog — Eryxon Flow

> Machine-readable reference for all Edge Function endpoints.

## Endpoints

| # | Endpoint | Table | Handler | Methods | enableSync | Plan Limits |
|---|----------|-------|---------|---------|-----------|-------------|
| 1 | api-assignments | assignments | CRUD | GET POST PATCH DELETE | no | no |
| 2 | api-cells | cells | CRUD | GET POST PATCH DELETE | **yes** | no |
| 3 | api-erp-sync | jobs, parts, resources | Custom | POST GET | N/A | no |
| 4 | api-export | multiple (15 tables) | Custom | GET | N/A | no |
| 5 | api-issues | issues | CRUD | GET POST PATCH DELETE | no | no |
| 6 | api-job-lifecycle | jobs | Custom | POST | N/A | no |
| 7 | api-jobs | jobs | CRUD + custom POST | GET POST PATCH DELETE | no | **yes** |
| 8 | api-key-generate | api_keys | Custom | GET POST DELETE | N/A | no |
| 9 | api-materials | parts (aggregated) | Custom | GET | N/A | no |
| 10 | api-operation-lifecycle | operations | Custom | POST | N/A | no |
| 11 | api-operation-quantities | operation_quantities | CRUD + queryModifier | GET POST PATCH DELETE | no | no |
| 12 | api-operations | operations | CRUD | GET POST PATCH DELETE | no | no |
| 13 | api-parts | parts | CRUD + custom POST | GET POST PATCH DELETE | no | **yes** |
| 14 | api-parts-images | parts | Custom | GET POST DELETE | N/A | no |
| 15 | api-resources | resources | CRUD | GET POST PATCH DELETE | **yes** | no |
| 16 | api-scrap-reasons | scrap_reasons | CRUD + custom DELETE | GET POST PATCH DELETE | no | no |
| 17 | api-substeps | substeps | CRUD | GET POST PATCH DELETE | no | no |
| 18 | api-templates | substep_templates | CRUD + queryModifier | GET POST PATCH DELETE | no | no |
| 19 | api-time-entries | time_entries | CRUD + queryModifier | GET POST PATCH DELETE | no | no |
| 20 | api-upload-url | storage | Custom | POST | N/A | no |
| 21 | api-webhook-logs | webhook_logs | CRUD (read-only) | GET | no | no |
| 22 | api-webhooks | webhooks | CRUD | GET POST PATCH DELETE | no | no |

## CRUD Builder Configs

### Standard CRUD endpoints

```
api-assignments:    table=assignments, filters=[job_id, part_id, operator_id, shop_floor_operator_id, status]
api-cells:          table=cells, search=[name], filters=[active], enableSync=true
api-issues:         table=issues, search=[title, description], filters=[severity, status, issue_type, ncr_category, reported_by_id, operation_id]
api-operations:     table=operations, search=[operation_name], filters=[cell_id, part_id, status]
api-op-quantities:  table=operation_quantities, search=[material_lot], filters=[operation_id, material_lot, scrap_reason_id, recorded_by] + queryModifier(date range, has_scrap, has_rework)
api-resources:      table=resources, search=[name, description, identifier], filters=[type, status, active, external_source, external_id], enableSync=true
api-scrap-reasons:  table=scrap_reasons, search=[code, description], filters=[category, active]
api-substeps:       table=substeps, search=[name], filters=[operation_id, status]
api-templates:      table=substep_templates, search=[name, description], filters=[operation_type, is_global] + queryModifier(global + tenant)
api-time-entries:   table=time_entries, search=[notes], filters=[operation_id, operator_id, time_type] + queryModifier(date range)
api-webhook-logs:   table=webhook_logs, filters=[webhook_id, status_code, event_type] (read-only)
api-webhooks:       table=webhooks, search=[url], filters=[events, active]
```

### Custom endpoints

```
api-erp-sync:             POST /diff (compare local vs ERP), POST /sync (execute sync), GET /status
api-export:               GET ?entities=jobs,parts&format=csv|json (admin role required)
api-job-lifecycle:        POST /start, /stop, /complete, /resume (state machine validation)
api-jobs:                 Custom POST with plan limits + nested parts/operations creation
api-key-generate:         POST (generate key), GET (list), DELETE (revoke)
api-materials:            GET (distinct materials aggregated from parts)
api-operation-lifecycle:  POST /start, /pause, /resume, /complete (time entry management)
api-parts:                Custom POST with plan limits + nested operations
api-parts-images:         GET (list), GET ?signed=true (signed URL), POST (upload), DELETE
api-upload-url:           POST (generate pre-signed upload URL)
```

## Authentication

All endpoints use Bearer token auth (`ery_live_*` / `ery_test_*`). Auth flow:
1. Extract 12-char prefix from key
2. Lookup candidates by prefix in `api_keys` table
3. SHA-256 hash comparison (constant-time)
4. Rate limit check based on tenant plan
5. `set_active_tenant(tenant_id)` for RLS context

## Rate Limits (per plan)

| Plan | Requests/day |
|------|-------------|
| free | 100 |
| pro | 1,000 |
| premium | 10,000 |
| enterprise | unlimited |
