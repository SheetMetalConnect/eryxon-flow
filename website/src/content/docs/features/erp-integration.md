---
title: "ERP Integration"
description: "Two-way sync with SAP, NetSuite, Odoo, and other ERP systems"
---

Two-way data synchronization with ERP systems (SAP, NetSuite, Odoo, etc.).

See also: [API Sync Endpoints](/api/api_sync/), [CSV Import](/guides/csv_import/), [Database Schema](/architecture/database/)

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐
│   Your ERP      │◄───────►│   Eryxon MES    │
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

### 2. CSV Batch Import (UI-based)

Best for: Initial data migration, periodic bulk updates, manual imports.

Navigate to **Admin → Data Import** in the web UI.

## Supported Entities

| ERP Concept | Eryxon Entity | Sync Endpoint |
|-------------|---------------|---------------|
| Sales Order | Job | `/api-jobs/sync` |
| Work Order / Line Item | Part | `/api-parts/sync` |
| Routing Step | Operation | `/api-operations/sync` |
| Work Center | Cell | `/api-cells/sync` |
| Equipment / Tooling | Resource | `/api-resources/sync` |

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

- [API Sync Reference](/api/api_sync/) - Detailed API endpoint documentation
- [CSV Import Guide](/guides/csv_import/) - Step-by-step CSV import instructions
- [API Documentation](/api/api_documentation/) - Full API reference

## Database Schema

The sync infrastructure adds these columns to core tables:

```sql
-- Added to jobs, parts, operations, resources, cells
external_id TEXT,              -- ERP identifier
external_source TEXT,          -- Source system name
synced_at TIMESTAMPTZ,         -- Last sync timestamp
sync_hash TEXT,                -- Payload hash for change detection

-- Soft delete support
deleted_at TIMESTAMPTZ,        -- NULL = active
deleted_by UUID                -- User who deleted
```

## Best Practices

1. **Always include external_id** - Required for upsert operations
2. **Sync dependencies first** - Sync cells before operations that reference them
3. **Use bulk-sync for batches** - More efficient than individual requests
4. **Implement webhooks** - Receive real-time updates back to your ERP
5. **Handle errors gracefully** - Bulk responses include per-record errors
