# Eryxon MES - Connectivity & Integration Reference

> **Complete reference for all endpoints, integrations, and connectivity options**

This document provides a comprehensive overview of all connectivity points in Eryxon MES, including REST APIs, MQTT publishing, Webhooks, MCP (Model Context Protocol), real-time subscriptions, and data import/export capabilities.

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [1. REST API Endpoints](#1-rest-api-endpoints)
- [2. Webhooks (Outbound HTTP)](#2-webhooks-outbound-http)
- [3. MQTT Publishing (Outbound)](#3-mqtt-publishing-outbound)
- [4. Real-time Subscriptions (Inbound WebSocket)](#4-real-time-subscriptions-inbound-websocket)
- [5. MCP - Model Context Protocol (AI Integration)](#5-mcp---model-context-protocol-ai-integration)
- [6. ERP Sync (Bidirectional)](#6-erp-sync-bidirectional)
- [7. Data Import/Export](#7-data-importexport)
- [8. Event System](#8-event-system)
- [Testing Guide](#testing-guide)

---

## Overview

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ERYXON MES                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   REST API   │  │   Webhooks   │  │     MQTT     │  │  Real-time   │ │
│  │   (Inbound)  │  │  (Outbound)  │  │  (Outbound)  │  │  (Inbound)   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │                  │       │
│         ▼                  ▼                  ▼                  ▼       │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                     UNIFIED EVENT DISPATCHER                        ││
│  │         src/lib/event-dispatch.ts                                   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                  │                                       │
│         ┌────────────────────────┼────────────────────────┐             │
│         ▼                        ▼                        ▼             │
│  ┌──────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  │
│  │   Supabase   │  │   Edge Functions     │  │    External Systems  │  │
│  │   Database   │  │  (webhook-dispatch,  │  │  (ERP, SCADA, MES)   │  │
│  │              │  │   mqtt-publish, etc) │  │                      │  │
│  └──────────────┘  └──────────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Direction Summary

| Integration | Direction | Protocol | Authentication |
|------------|-----------|----------|----------------|
| REST API | Inbound | HTTPS | Bearer Token (API Key) |
| Webhooks | Outbound | HTTPS POST | HMAC SHA256 Signature |
| MQTT | Outbound | MQTT/HTTP | Username/Password + TLS |
| Real-time | Inbound | WebSocket | Session Token |
| MCP | Bidirectional | JSON-RPC | MCP Auth Key |
| ERP Sync | Bidirectional | HTTPS | Bearer Token |
| Data Export | Outbound | HTTPS | Bearer Token |
| Data Import | Inbound | HTTPS | Bearer Token |

---

## Authentication

### API Key Authentication

All external API calls require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer ery_live_xxxxxxxxxxxxxxxxxxxx
```

**Key Prefixes:**
- `ery_live_` - Production keys
- `ery_test_` - Test/sandbox keys

**Generate API Keys:**
- UI: Admin → Integrations → API Keys
- API: `POST /functions/v1/api-key-generate`

### Key Storage & Security

- Keys are hashed (SHA256) before storage - original key shown only once
- `api_keys` table stores: `prefix`, `key_hash`, `active`, `last_used_at`
- RLS enforces tenant isolation

---

## 1. REST API Endpoints

**Base URL:** `https://vatgianzotsurljznsry.supabase.co/functions/v1`

### Jobs API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api-jobs` | List jobs with filtering and pagination |
| `GET` | `/api-jobs?id={id}` | Get single job by ID |
| `POST` | `/api-jobs` | Create new job with parts and operations |
| `PATCH` | `/api-jobs?id={id}` | Update job fields |
| `DELETE` | `/api-jobs?id={id}` | Delete job (cascade deletes parts/operations) |
| `PUT` | `/api-jobs/sync` | Upsert job by external_id |
| `POST` | `/api-jobs/bulk-sync` | Bulk upsert up to 1000 jobs |

#### GET /api-jobs - Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `not_started`, `in_progress`, `completed`, `on_hold` |
| `customer` | string | Filter by customer name (partial match) |
| `job_number` | string | Filter by job number (partial match) |
| `limit` | integer | Page size (default: 100, max: 1000) |
| `offset` | integer | Pagination offset |

#### POST /api-jobs - Create Job Payload

```json
{
  "job_number": "JOB-2024-001",
  "customer_name": "Acme Manufacturing",
  "due_date": "2024-02-15",
  "priority": 1,
  "description": "Custom bracket assembly",
  "metadata": {
    "po_number": "PO-12345",
    "sales_order": "SO-67890"
  },
  "parts": [
    {
      "part_number": "BRACKET-A1",
      "material": "Steel 304",
      "quantity": 50,
      "material_id": "uuid-optional",
      "notes": "Laser cut required",
      "operations": [
        {
          "operation_name": "Laser Cutting",
          "sequence": 1,
          "cell_id": "uuid-required",
          "estimated_time_minutes": 30,
          "setup_time_minutes": 10,
          "assigned_operator_id": "uuid-optional",
          "instructions": "Use 3mm nozzle",
          "resources": [
            { "resource_id": "uuid", "quantity": 1 }
          ]
        }
      ]
    }
  ]
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "job_number": "JOB-2024-001",
    "status": "not_started",
    "created_at": "2024-01-15T10:30:00Z",
    "parts": [
      {
        "part_id": "uuid",
        "part_number": "BRACKET-A1",
        "operations": [
          {
            "operation_id": "uuid",
            "operation_name": "Laser Cutting",
            "sequence": 1
          }
        ]
      }
    ]
  }
}
```

---

### Parts API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api-parts` | List parts |
| `GET` | `/api-parts?job_id={id}` | List parts for a job |
| `POST` | `/api-parts` | Create part |
| `PUT` | `/api-parts?id={id}` | Update part |
| `POST` | `/api-parts/bulk-sync` | Bulk upsert parts |

---

### Operations API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api-operations` | List operations |
| `GET` | `/api-operations?part_id={id}` | List operations for a part |
| `POST` | `/api-operations` | Create operation |
| `PUT` | `/api-operations?id={id}` | Update operation |
| `POST` | `/api-operations/bulk-sync` | Bulk upsert operations |

---

### Operation Lifecycle API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api-operation-lifecycle` | Change operation state |

#### Payload

```json
{
  "operation_id": "uuid",
  "action": "start",
  "operator_id": "uuid"
}
```

**Available Actions:**
- `start` - Begin operation, creates time entry
- `pause` - Pause operation, logs pause
- `resume` - Resume from pause
- `complete` - Mark operation complete

---

### Job Lifecycle API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api-job-lifecycle` | Change job state |

#### Payload

```json
{
  "job_id": "uuid",
  "action": "start"
}
```

**Available Actions:** `start`, `stop`, `complete`, `resume`

---

### Cells (Work Centers) API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api-cells` | List cells/stages |
| `POST` | `/api-cells` | Create cell |
| `PUT` | `/api-cells?id={id}` | Update cell |
| `POST` | `/api-cells/bulk-sync` | Bulk upsert cells |

---

### Resources API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api-resources` | List tools/fixtures/molds |
| `POST` | `/api-resources` | Create resource |
| `PUT` | `/api-resources?id={id}` | Update resource |
| `POST` | `/api-resources/bulk-sync` | Bulk upsert resources |

---

### Materials API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api-materials` | List materials catalog |

---

### Time Entries API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api-time-entries` | List time entries |
| `GET` | `/api-time-entries?operation_id={id}` | Time entries for operation |
| `POST` | `/api-time-entries` | Create time entry |

---

### Operation Quantities API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api-operation-quantities` | Report production quantity |

#### Payload

```json
{
  "operation_id": "uuid",
  "quantity_produced": 100,
  "quantity_good": 95,
  "quantity_scrap": 3,
  "quantity_rework": 2,
  "scrap_reasons": [
    {
      "reason_id": "uuid",
      "quantity": 3
    }
  ]
}
```

---

### Issues/NCR API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api-issues` | List quality issues |
| `POST` | `/api-issues` | Create issue/NCR |

---

### Substeps API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api-substeps` | List substeps |
| `POST` | `/api-substeps` | Add substep to operation |
| `PUT` | `/api-substeps?id={id}` | Update substep (mark complete) |

---

### Assignments API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api-assignments` | List work assignments |
| `POST` | `/api-assignments` | Create assignment |
| `PUT` | `/api-assignments?id={id}` | Update assignment |

---

### File Upload API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api-upload-url` | Get signed upload URL |
| `GET` | `/api-parts-images?part_id={id}` | Get part images |
| `POST` | `/api-parts-images` | Add image to part |

---

## 2. Webhooks (Outbound HTTP)

### Overview

Webhooks send HTTP POST requests to external endpoints when events occur in Eryxon MES.

**Direction:** Outbound (Eryxon → External Systems)

**Configuration UI:** Admin → Integrations → Webhooks

**Dispatch Engine:** `supabase/functions/webhook-dispatch/index.ts`

### Webhook Configuration

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | HTTPS endpoint URL |
| `events` | string[] | Array of subscribed event types |
| `secret_key` | string | HMAC signing key |
| `active` | boolean | Enable/disable webhook |

### Request Format

```http
POST /your-webhook-endpoint HTTP/1.1
Host: your-server.com
Content-Type: application/json
X-Eryxon-Signature: sha256=abc123...
X-Eryxon-Event: operation.completed
User-Agent: Eryxon-Webhooks/1.0

{
  "event": "operation.completed",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "data": {
    "operation_id": "uuid",
    "operation_name": "Laser Cutting",
    "part_id": "uuid",
    "part_number": "BRACKET-A1",
    "job_id": "uuid",
    "job_number": "JOB-2024-001",
    "operator_id": "uuid",
    "operator_name": "John Smith",
    "completed_at": "2024-01-15T14:30:00.000Z",
    "actual_time": 1800,
    "estimated_time": 1500
  }
}
```

### Signature Verification

Verify webhook authenticity using HMAC SHA256:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}
```

### Available Event Types

#### Job Lifecycle
| Event | Description | Payload |
|-------|-------------|---------|
| `job.created` | New job created via API | `job_id`, `job_number`, `customer`, `parts_count`, `operations_count` |
| `job.updated` | Job modified | Job fields |
| `job.started` | Job status → in_progress | Job data |
| `job.stopped` | Job put on hold | Job data |
| `job.resumed` | Paused job resumed | Job data |
| `job.completed` | Job marked complete | Job data |

#### Part Lifecycle
| Event | Description | Payload |
|-------|-------------|---------|
| `part.created` | Part added to job | Part data |
| `part.updated` | Part modified | Part data |
| `part.started` | Work begins on part | Part data |
| `part.completed` | Part fully processed | Part data |

#### Operation Lifecycle
| Event | Description | Payload |
|-------|-------------|---------|
| `operation.started` | Operator starts operation | See below |
| `operation.paused` | Operation paused | Operation data |
| `operation.resumed` | Operation resumed | Operation data |
| `operation.completed` | Operation marked complete | See below |

**operation.started payload:**
```json
{
  "operation_id": "uuid",
  "operation_name": "Welding",
  "part_id": "uuid",
  "part_number": "FRAME-001",
  "job_id": "uuid",
  "job_number": "JOB-2024-001",
  "operator_id": "uuid",
  "operator_name": "Jane Doe",
  "started_at": "2024-01-15T09:00:00Z"
}
```

**operation.completed payload:**
```json
{
  "operation_id": "uuid",
  "operation_name": "Welding",
  "part_id": "uuid",
  "part_number": "FRAME-001",
  "job_id": "uuid",
  "job_number": "JOB-2024-001",
  "operator_id": "uuid",
  "operator_name": "Jane Doe",
  "completed_at": "2024-01-15T11:30:00Z",
  "actual_time": 9000,
  "estimated_time": 7200
}
```

#### Quality Events
| Event | Description | Payload |
|-------|-------------|---------|
| `issue.created` | Quality issue reported | Issue data with severity |
| `ncr.created` | NCR created | NCR data |
| `ncr.verified` | NCR resolved/verified | NCR data |

**issue.created payload:**
```json
{
  "issue_id": "uuid",
  "operation_id": "uuid",
  "operation_name": "Painting",
  "part_id": "uuid",
  "part_number": "PANEL-002",
  "job_id": "uuid",
  "job_number": "JOB-2024-001",
  "created_by": "uuid",
  "operator_name": "Mike Wilson",
  "severity": "high",
  "description": "Surface defect detected",
  "created_at": "2024-01-15T13:45:00Z"
}
```

#### Production Events
| Event | Description | Payload |
|-------|-------------|---------|
| `production.quantity_reported` | Production quantity recorded | See below |
| `production.scrap_recorded` | Scrap/defects recorded | See below |

**production.quantity_reported payload:**
```json
{
  "quantity_id": "uuid",
  "operation_id": "uuid",
  "operation_name": "Assembly",
  "part_id": "uuid",
  "part_number": "WIDGET-003",
  "job_id": "uuid",
  "job_number": "JOB-2024-002",
  "quantity_produced": 100,
  "quantity_good": 95,
  "quantity_scrap": 3,
  "quantity_rework": 2,
  "yield_percentage": 95.0,
  "recorded_by": "uuid",
  "recorded_by_name": "Sarah Johnson",
  "recorded_at": "2024-01-15T16:00:00Z"
}
```

**production.scrap_recorded payload:**
```json
{
  "quantity_id": "uuid",
  "operation_id": "uuid",
  "operation_name": "Assembly",
  "part_id": "uuid",
  "part_number": "WIDGET-003",
  "job_id": "uuid",
  "job_number": "JOB-2024-002",
  "quantity_scrap": 3,
  "scrap_reasons": [
    {
      "reason_id": "uuid",
      "reason_code": "DIM-001",
      "reason_description": "Dimensional out of tolerance",
      "category": "dimensional",
      "quantity": 2
    },
    {
      "reason_id": "uuid",
      "reason_code": "SUR-003",
      "reason_description": "Surface scratch",
      "category": "surface",
      "quantity": 1
    }
  ],
  "recorded_by": "uuid",
  "recorded_by_name": "Sarah Johnson",
  "recorded_at": "2024-01-15T16:00:00Z"
}
```

#### Step Events
| Event | Description | Payload |
|-------|-------------|---------|
| `step.added` | Substep added | Substep data |
| `step.completed` | Substep completed | Substep data |

### Webhook Logs

All deliveries are logged to `webhook_logs` table:
- `webhook_id` - Reference to webhook config
- `event_type` - Event that triggered the webhook
- `payload` - Full payload sent
- `status_code` - HTTP response code
- `error_message` - Error details (if failed)
- `created_at` - Timestamp

---

## 3. MQTT Publishing (Outbound)

### Overview

Eryxon MES publishes events to MQTT brokers using ISA-95 compliant Unified Namespace (UNS) topic patterns.

**Direction:** Outbound (Eryxon → MQTT Brokers)

**Configuration UI:** Admin → Integrations → MQTT

**Publish Engine:** `supabase/functions/mqtt-publish/index.ts`

### Publisher Configuration

| Field | Type | Description |
|-------|------|-------------|
| `broker_url` | string | MQTT broker address |
| `port` | integer | Connection port (default: 1883) |
| `username` | string | Auth username (optional) |
| `password` | string | Auth password (optional) |
| `use_tls` | boolean | Enable TLS/SSL |
| `topic_pattern` | string | UNS topic template |
| `default_enterprise` | string | ISA-95 enterprise level |
| `default_site` | string | ISA-95 site level |
| `default_area` | string | ISA-95 area level |
| `events` | string[] | Subscribed event types |
| `active` | boolean | Enable/disable publisher |

### Topic Pattern Variables

Build flexible ISA-95 compliant topics using these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{enterprise}` | Company/organization | `acme_corp` |
| `{site}` | Physical factory location | `plant_chicago` |
| `{area}` | Manufacturing area | `fabrication` |
| `{cell}` | QRM cell / work center | `laser_cutting` |
| `{line}` | Production line | `line_1` |
| `{operation}` | Operation type/name | `welding` |
| `{event}` | Event type (dot → slash) | `operation/started` |
| `{tenant_id}` | Multi-tenant isolation | `abc123` |
| `{job_number}` | Job reference | `job-2024-001` |
| `{part_number}` | Part reference | `bracket-a1` |

### Topic Pattern Examples

**Standard UNS Pattern:**
```
Pattern: {enterprise}/{site}/{area}/{cell}/{event}
Result:  acme/chicago/fabrication/laser_cutting/operation/started
```

**Multi-tenant Pattern:**
```
Pattern: eryxon/{tenant_id}/{area}/{cell}/{event}
Result:  eryxon/abc123/production/welding/operation/completed
```

**Full ISA-95 Pattern:**
```
Pattern: {enterprise}/mes/{site}/{area}/{cell}/{operation}/{event}
Result:  acme/mes/chicago/assembly/workstation_1/frame_weld/operation/completed
```

### Message Payload

```json
{
  "event": "operation.started",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "tenant_id": "abc123",
  "data": {
    "operation_id": "uuid",
    "operation_name": "Laser Cutting",
    "part_id": "uuid",
    "part_number": "BRACKET-A1",
    "job_id": "uuid",
    "job_number": "JOB-2024-001",
    "operator_id": "uuid",
    "operator_name": "John Smith",
    "started_at": "2024-01-15T10:30:00Z",
    "cell_name": "Laser Cell 1"
  }
}
```

### Supported Brokers

The MQTT publish function supports brokers with HTTP REST APIs:
- **HiveMQ Cloud** (recommended)
- **EMQX Cloud**
- **AWS IoT Core**
- **Azure IoT Hub**
- Custom brokers with HTTP publish endpoint

### MQTT Logs

All publish attempts are logged to `mqtt_logs` table:
- `mqtt_publisher_id` - Reference to publisher config
- `event_type` - Event published
- `topic` - Full topic path
- `payload` - Message content
- `success` - Boolean success status
- `error_message` - Error details (if failed)
- `latency_ms` - Publish latency
- `created_at` - Timestamp

---

## 4. Real-time Subscriptions (Inbound WebSocket)

### Overview

Real-time updates are pushed to the frontend via Supabase Realtime (WebSocket).

**Direction:** Inbound (Supabase → Frontend)

**Implementation:** `src/hooks/useRealtimeSubscription.ts`

### Hook Variants

#### useRealtimeSubscription (Full Control)

```typescript
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

useRealtimeSubscription({
  channelName: 'operations-updates',
  tables: [
    {
      table: 'operations',
      filter: `tenant_id=eq.${tenantId}`,
      event: '*',  // INSERT, UPDATE, DELETE, or *
    },
    {
      table: 'time_entries',
      filter: `tenant_id=eq.${tenantId}`,
    }
  ],
  onDataChange: () => refetch(),
  enabled: !!tenantId,
  debounceMs: 100,
});
```

#### useTableSubscription (Simple Single Table)

```typescript
import { useTableSubscription } from '@/hooks/useRealtimeSubscription';

useTableSubscription(
  'operations',
  () => refetch(),
  { filter: `cell_id=eq.${cellId}`, enabled: true }
);
```

#### useTenantSubscription (Auto Tenant Filter)

```typescript
import { useTenantSubscription } from '@/hooks/useRealtimeSubscription';

useTenantSubscription(
  'jobs',
  tenantId,
  () => refetch()
);
```

#### useEntitySubscription (Single Entity)

```typescript
import { useEntitySubscription } from '@/hooks/useRealtimeSubscription';

// Subscribe to changes on a specific operation
useEntitySubscription(
  'operations',
  operationId,
  () => refetchOperation()
);
```

### Subscription Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `channelName` | string | required | Unique channel identifier |
| `tables` | TableSubscription[] | required | Tables to subscribe to |
| `onDataChange` | function | required | Callback when data changes |
| `enabled` | boolean | true | Enable/disable subscription |
| `debounceMs` | number | 100 | Debounce delay |
| `includePayload` | boolean | false | Include change payload in callback |

### Event Types

| Event | Description |
|-------|-------------|
| `INSERT` | New row inserted |
| `UPDATE` | Existing row updated |
| `DELETE` | Row deleted |
| `*` | All events |

### Memory Leak Prevention

The hooks automatically:
1. Clean up subscriptions on unmount
2. Use stable callback refs
3. Debounce rapid changes
4. Remove channels properly

---

## 5. MCP - Model Context Protocol (AI Integration)

### Overview

MCP enables AI agents (Claude, etc.) to interact with Eryxon MES programmatically.

**Direction:** Bidirectional (AI ↔ Eryxon)

**Configuration UI:** Admin → Integrations → MCP Keys

### MCP Authentication

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Key name/description |
| `allowed_tools` | string[] | Tools this key can access |
| `rate_limit` | integer | Requests per minute |
| `active` | boolean | Enable/disable key |

### Available MCP Tools

#### Job Management
| Tool | Description |
|------|-------------|
| `fetch_jobs` | List jobs with filters |
| `create_job` | Create new job |
| `update_job` | Update job fields |
| `start_job` | Start job (status → in_progress) |
| `stop_job` | Put job on hold |
| `complete_job` | Mark job complete |
| `resume_job` | Resume paused job |

#### Part Management
| Tool | Description |
|------|-------------|
| `fetch_parts` | List parts |
| `update_part` | Update part fields |

#### Task/Operation Management
| Tool | Description |
|------|-------------|
| `fetch_tasks` | List operations/tasks |
| `update_task` | Update operation fields |
| `start_operation` | Start operation |
| `pause_operation` | Pause operation |
| `complete_operation` | Complete operation |
| `add_substep` | Add substep to operation |
| `complete_substep` | Mark substep complete |

#### Quality Management
| Tool | Description |
|------|-------------|
| `fetch_issues` | List quality issues |
| `fetch_ncrs` | List NCRs |
| `create_ncr` | Create new NCR |

#### Analytics
| Tool | Description |
|------|-------------|
| `get_dashboard_stats` | Fetch dashboard statistics |

### MCP Usage Logging

All tool invocations are logged to `mcp_key_usage_logs`:
- `key_id` - MCP key used
- `tool_name` - Tool invoked
- `success` - Execution result
- `error_message` - Error details
- `created_at` - Timestamp

---

## 6. ERP Sync (Bidirectional)

### Overview

Sync jobs, parts, and operations between Eryxon and external ERP systems.

**Direction:** Bidirectional

**Endpoint:** `POST /functions/v1/api-erp-sync`

**Implementation:** `supabase/functions/api-erp-sync/index.ts`

### Sync Modes

| Mode | Endpoint | Description |
|------|----------|-------------|
| Diff | `POST /api-erp-sync/diff` | Preview changes without applying |
| Sync | `POST /api-erp-sync/sync` | Execute sync |
| Status | `GET /api-erp-sync/status` | Get sync history |

### External ID Mapping

Each synced record requires:
- `external_id` - ID in source system
- `external_source` - Source system identifier (e.g., "sap", "netsuite")

### Sync Hash Change Detection

Records are only updated when data changes:
- SHA-256 hash of record content stored in `sync_hash`
- Unchanged records are skipped (reduces database writes)

### Nested Entity Sync

Jobs can include nested parts and operations:

```json
{
  "external_id": "ERP-JOB-001",
  "external_source": "sap",
  "job_number": "JOB-2024-001",
  "customer_name": "Acme Corp",
  "due_date": "2024-02-15",
  "parts": [
    {
      "external_id": "ERP-PART-001",
      "part_number": "BRACKET-A1",
      "material": "Steel 304",
      "quantity": 50,
      "operations": [
        {
          "external_id": "ERP-OP-001",
          "operation_name": "Laser Cutting",
          "sequence": 1,
          "cell_name": "Laser Cell 1",
          "estimated_time_minutes": 30
        }
      ]
    }
  ]
}
```

### Bulk Sync (up to 1000 records)

```http
POST /api-jobs/bulk-sync
Content-Type: application/json
Authorization: Bearer ery_live_xxx

{
  "jobs": [
    { "external_id": "...", "job_number": "...", ... },
    { "external_id": "...", "job_number": "...", ... }
  ]
}
```

**Response:**
```json
{
  "total": 100,
  "created": 45,
  "updated": 50,
  "errors": 5,
  "results": [
    { "external_id": "ERP-001", "id": "uuid", "action": "created" },
    { "external_id": "ERP-002", "id": "uuid", "action": "updated" },
    { "external_id": "ERP-003", "action": "error", "error": "Missing required field" }
  ]
}
```

### Sync Logs

Import operations are logged to `sync_imports`:
- `source` - Import source ("api", "csv")
- `entity_type` - Entity synced ("jobs", "parts")
- `status` - "completed" or "failed"
- `total_records` - Total processed
- `created_count`, `updated_count`, `error_count`
- `errors` - Detailed error list

---

## 7. Data Import/Export

### Data Export

**Endpoint:** `GET /functions/v1/api-export`

**Implementation:** `supabase/functions/api-export/index.ts`

**Required Role:** Admin

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `entities` | string | Comma-separated tables or "all" |
| `format` | string | "json" (default) or "csv" |

#### Exportable Tables

- `jobs`, `parts`, `operations`
- `cells`, `resources`, `materials`
- `time_entries`, `time_entry_pauses`
- `assignments`, `issues`, `substeps`
- `profiles`, `api_keys` (hashed)
- `webhooks`, `webhook_logs`

#### Export Response

```json
{
  "jobs": [...],
  "parts": [...],
  "operations": [...],
  "_metadata": {
    "exported_at": "2024-01-15T10:00:00Z",
    "tenant_id": "uuid",
    "format": "json",
    "tables": [
      { "name": "jobs", "count": 150 },
      { "name": "parts", "count": 500 }
    ]
  },
  "_tenant_info": {
    "name": "Acme Manufacturing",
    "plan": "professional",
    "created_at": "2023-06-01T00:00:00Z"
  }
}
```

### Data Import

**UI:** Admin → Data Management → Import

**Supported Formats:** CSV

**Import Endpoints:**
- `POST /api-jobs/bulk-sync`
- `POST /api-parts/bulk-sync`
- `POST /api-operations/bulk-sync`
- `POST /api-cells/bulk-sync`
- `POST /api-resources/bulk-sync`

---

## 8. Event System

### Unified Event Dispatcher

All events are dispatched through a central hub that coordinates webhooks and MQTT simultaneously.

**Implementation:** `src/lib/event-dispatch.ts`

### Usage

```typescript
import { dispatchEvent, dispatchOperationCompleted } from '@/lib/event-dispatch';

// Generic dispatch
await dispatchEvent(
  tenantId,
  'operation.completed',
  operationData,
  { cell: 'laser_cutting', area: 'fabrication' }
);

// Typed helper
await dispatchOperationCompleted(
  tenantId,
  {
    operation_id: '...',
    operation_name: 'Laser Cutting',
    part_id: '...',
    part_number: 'BRACKET-A1',
    job_id: '...',
    job_number: 'JOB-2024-001',
    operator_id: '...',
    operator_name: 'John Smith',
    completed_at: new Date().toISOString(),
    actual_time: 1800,
    estimated_time: 1500,
  },
  { cell: 'laser_cutting' }
);
```

### Dispatch Result

```typescript
interface DispatchResult {
  success: boolean;
  webhooksDispatched?: number;
  mqttPublished?: number;
  errors?: string[];
}
```

### Helper Functions

| Function | Event Type |
|----------|------------|
| `dispatchOperationStarted()` | `operation.started` |
| `dispatchOperationCompleted()` | `operation.completed` |
| `dispatchIssueCreated()` | `issue.created` |
| `dispatchJobCreated()` | `job.created` |
| `dispatchQuantityReported()` | `production.quantity_reported` |
| `dispatchScrapRecorded()` | `production.scrap_recorded` |

---

## Testing Guide

### API Testing with cURL

#### 1. Get API Key

```bash
# Generate via UI: Admin → Integrations → API Keys
# Or use existing key from database
```

#### 2. Test Authentication

```bash
curl -X GET \
  "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-jobs?limit=1" \
  -H "Authorization: Bearer ery_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json"
```

**Expected Response:** 200 OK with jobs array

#### 3. Test Job Creation

```bash
curl -X POST \
  "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-jobs" \
  -H "Authorization: Bearer ery_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "job_number": "TEST-JOB-001",
    "customer_name": "Test Customer",
    "due_date": "2024-12-31",
    "parts": [
      {
        "part_number": "TEST-PART-001",
        "material": "Test Material",
        "quantity": 1,
        "operations": [
          {
            "operation_name": "Test Operation",
            "sequence": 1,
            "cell_id": "YOUR_CELL_UUID",
            "estimated_time_minutes": 30
          }
        ]
      }
    ]
  }'
```

#### 4. Test Job Lifecycle

```bash
# Start job
curl -X POST \
  "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-job-lifecycle" \
  -H "Authorization: Bearer ery_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"job_id": "JOB_UUID", "action": "start"}'

# Complete job
curl -X POST \
  "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-job-lifecycle" \
  -H "Authorization: Bearer ery_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"job_id": "JOB_UUID", "action": "complete"}'
```

---

### Webhook Testing

#### 1. Use a Webhook Testing Service

```bash
# Get a test endpoint from webhook.site or similar
TEST_URL="https://webhook.site/unique-id"
```

#### 2. Configure Webhook in UI

- Navigate to: Admin → Integrations → Webhooks
- Create webhook with test URL
- Select events: `operation.started`, `operation.completed`
- Save and activate

#### 3. Trigger Event

- Start an operation via UI or API
- Check webhook.site for received payload

#### 4. Verify Signature (Node.js)

```javascript
const crypto = require('crypto');

const payload = req.body;  // Raw JSON body
const receivedSig = req.headers['x-eryxon-signature'];
const secret = 'YOUR_WEBHOOK_SECRET';

const expectedSig = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

const isValid = crypto.timingSafeEqual(
  Buffer.from(receivedSig),
  Buffer.from(expectedSig)
);

console.log('Signature valid:', isValid);
```

---

### MQTT Testing

#### 1. Set Up Test Broker

```bash
# Using HiveMQ Cloud (free tier available)
# Or local Mosquitto for development
docker run -it -p 1883:1883 eclipse-mosquitto
```

#### 2. Configure MQTT Publisher

- Navigate to: Admin → Integrations → MQTT
- Add publisher with broker details
- Set topic pattern: `test/{event}`
- Select events and activate

#### 3. Subscribe to Test Topics

```bash
# Using mosquitto_sub
mosquitto_sub -h YOUR_BROKER -t "test/#" -v
```

#### 4. Trigger Event

- Perform action in Eryxon (start operation, etc.)
- Observe message in subscriber

---

### Real-time Subscription Testing

```typescript
// In React component
import { useTableSubscription } from '@/hooks/useRealtimeSubscription';

function TestComponent({ tenantId }) {
  const [updateCount, setUpdateCount] = useState(0);

  useTableSubscription(
    'operations',
    () => {
      setUpdateCount(c => c + 1);
      console.log('Realtime update received!');
    },
    { filter: `tenant_id=eq.${tenantId}` }
  );

  return <div>Updates received: {updateCount}</div>;
}
```

---

### ERP Sync Testing

#### 1. Test Diff Mode (Preview)

```bash
curl -X POST \
  "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-erp-sync/diff" \
  -H "Authorization: Bearer ery_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "jobs": [
      {
        "external_id": "ERP-001",
        "external_source": "test",
        "job_number": "SYNC-TEST-001",
        "customer_name": "Sync Test Customer"
      }
    ]
  }'
```

#### 2. Execute Sync

```bash
curl -X POST \
  "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-jobs/bulk-sync" \
  -H "Authorization: Bearer ery_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "jobs": [
      {
        "external_id": "ERP-001",
        "external_source": "test",
        "job_number": "SYNC-TEST-001",
        "customer_name": "Sync Test Customer"
      }
    ]
  }'
```

---

### Data Export Testing

```bash
# Export all tables
curl -X GET \
  "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-export?entities=all" \
  -H "Authorization: Bearer ery_live_YOUR_KEY_HERE" \
  -o export.json

# Export specific tables
curl -X GET \
  "https://vatgianzotsurljznsry.supabase.co/functions/v1/api-export?entities=jobs,parts,operations" \
  -H "Authorization: Bearer ery_live_YOUR_KEY_HERE" \
  -o partial-export.json
```

---

### Integration Test Checklist

| Test | Command/Action | Expected Result |
|------|----------------|-----------------|
| API Auth | GET /api-jobs with valid key | 200 OK |
| API Auth | GET /api-jobs with invalid key | 401 Unauthorized |
| Create Job | POST /api-jobs | 201 Created |
| Job Lifecycle | POST /api-job-lifecycle start | Job status → in_progress |
| Webhook Delivery | Start operation | Webhook received at endpoint |
| Webhook Signature | Verify HMAC | Signature matches |
| MQTT Publish | Complete operation | Message published to broker |
| Real-time | Update operation in DB | Frontend callback triggered |
| Bulk Sync | POST /api-jobs/bulk-sync | Records created/updated |
| Data Export | GET /api-export | JSON file downloaded |

---

## Error Codes Reference

| HTTP Code | Error Type | Description |
|-----------|------------|-------------|
| 400 | BadRequestError | Invalid request body or parameters |
| 401 | UnauthorizedError | Missing or invalid authentication |
| 402 | PaymentRequiredError | Plan limit exceeded |
| 403 | ForbiddenError | Insufficient permissions |
| 404 | NotFoundError | Resource not found |
| 409 | ConflictError | Duplicate resource (e.g., job_number) |
| 422 | ValidationException | Validation failed |
| 429 | RateLimitError | Too many requests |
| 500 | InternalServerError | Server error |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "parts[0].operations[0].cell_id",
        "message": "Invalid cell ID",
        "constraint": "FK_CONSTRAINT"
      }
    ]
  }
}
```

---

## Rate Limiting

Rate limits are enforced per API key and plan:

| Plan | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Free | 60 | 1,000 |
| Starter | 300 | 10,000 |
| Professional | 1,000 | 100,000 |
| Enterprise | Custom | Custom |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1705312800
```

---

*Last updated: December 2024*
