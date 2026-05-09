---
title: "ERP Integration"
description: "Guide to integrating Eryxon Flow with your ERP system."
---

Eryxon Flow supports two-way data synchronization with external ERP systems like SAP, NetSuite, Odoo, and others.

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐
│   Your ERP      │◄───────►│   Eryxon Flow    │
│   (SAP, etc.)   │         │                 │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ REST API / Webhooks       │
         │                           │
         ▼                           ▼
┌─────────────────────────────────────────────┐
│              Sync Layer                      │
│  • external_id tracking                      │
│  • Upsert operations                         │
│  • Change detection (sync_hash)              │
│  • Soft delete support                       │
└─────────────────────────────────────────────┘
```

## Integration Options

### 1. REST API Sync (Real-time)

Best for: Webhook-driven updates, event-based sync, real-time integration.

| Method | Endpoint | Use Case |
|--------|----------|----------|
| `PUT` | `/api-{entity}/sync` | Upsert single record |
| `POST` | `/api-{entity}/bulk-sync` | Batch upsert (up to 1000) |
| `DELETE` | `/api-{entity}?id={uuid}` | Hard delete |

24 integration endpoints are available across jobs, parts, operations, batches, cells, resources, materials, time entries, webhooks, and assignments. See the [REST API reference](/api/rest-api-reference/) for the full catalog.

### 2. CSV Batch Import (UI-based)

Best for: Initial data migration, periodic bulk updates, manual imports.

Navigate to **Admin → Data Import** in the web UI.

### 3. Planning Adapters (v0.5)

Best for: Pulling work orders and resources from a dedicated planning system without writing custom REST sync code.

| Adapter | Source | Status | Notes |
|---------|--------|--------|-------|
| **FrePPLe** | FrePPLe REST API | Beta | Pull work orders + resources, push start and completion, Basic Auth, pagination |
| **Odoo MRP** | Odoo `mrp.production` over JSON-RPC | Beta | Pull work orders, push execution feedback |

Both adapters are **Beta** — interfaces and behavior may still change, so pilot them on non-critical work first. Adapters share a single TypeScript interface (`src/lib/planning/`) using ISA-95 aligned vocabulary. Pick one at runtime with `createPlanningAdapter(config)`.

## Supported Entities

| ERP Concept | Eryxon Entity | Sync Endpoint |
|-------------|---------------|---------------|
| Sales Order | Job | `/api-jobs/sync` |
| Work Center | Cell | `/api-cells/sync` |
| Equipment / Tooling | Resource | `/api-resources/sync` |

Parts and operations are synced via the unified `/api-erp-sync` endpoint or created nested within jobs.

## Key Fields

### external_id

Every synced record should include:

```json
{
  "external_id": "SO-12345",      // Your ERP's unique identifier
  "external_source": "SAP",        // Source system name
  ...other fields
}
```

The combination of `(tenant_id, external_source, external_id)` forms a unique constraint for upsert operations.

### sync_hash

Eryxon automatically generates a SHA-256 hash of the payload for change detection. On subsequent syncs, unchanged records can be skipped.

### synced_at

Timestamp of the last successful sync, useful for incremental updates.

## Related Documentation

- [CSV Import](./csv-import.md) - Step-by-step CSV import instructions
- [REST API Overview](/architecture/connectivity-rest-api/) - Endpoints and auth
- [REST API Reference](/api/rest-api-reference/) - Full endpoint documentation

## Database Schema

The sync infrastructure adds these columns to core tables:

```sql
-- Added to jobs, parts, cells, resources
external_id TEXT,              -- ERP identifier
external_source TEXT,          -- Source system name
synced_at TIMESTAMPTZ,         -- Last sync timestamp

-- Soft delete support (jobs, cells)
deleted_at TIMESTAMPTZ,        -- NULL = active
deleted_by UUID                -- User who deleted
```

## Best Practices

1. **Always include external_id** - Required for upsert operations
2. **Sync dependencies first** - Sync cells before operations that reference them
3. **Use bulk-sync for batches** - More efficient than individual requests
4. **Implement webhooks** - Receive real-time updates back to your ERP
5. **Handle errors gracefully** - Bulk responses include per-record errors
