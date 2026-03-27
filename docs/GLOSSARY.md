# Glossary — MES Domain Terms

> Manufacturing vocabulary used in Eryxon Flow. Helps AI agents understand the domain.

## Core Entities

| Term | Definition |
|------|-----------|
| **Job** | A customer order containing one or more parts. Has a job number, customer name, and overall status. |
| **Part** | A physical item to be manufactured. Belongs to a job. Has part number, material, quantity, and drawing. |
| **Operation** | A single manufacturing step on a part (e.g., laser cutting, bending, welding). Has sequence order, estimated time, and status. |
| **Substep** | A checklist item within an operation (e.g., "verify dimensions", "deburr edges"). |
| **Batch** | A group of operations combined for efficient processing on a single machine/cell. |

## Production Concepts

| Term | Definition |
|------|-----------|
| **Cell / Stage** | A production area or machine group (e.g., "Laser 1", "Bending", "Paint Line"). Operations are assigned to cells. |
| **Resource** | A machine, tool, or fixture used in production. Assigned to cells. |
| **Assignment** | Links an operator to specific jobs/parts/operations they should work on. |
| **Work Queue** | The operator's view of their assigned operations, ordered by priority. |
| **Time Entry** | A clock-in/clock-out record for an operator working on an operation. |
| **Capacity Matrix** | Visual grid showing cell availability vs. scheduled work over time. |

## Quality & Issues

| Term | Definition |
|------|-----------|
| **NCR** | Non-Conformance Report. A formal record that something doesn't meet specifications. |
| **Issue** | A problem reported during production. Types: NCR, observation, improvement, safety. |
| **Scrap** | Material that cannot be reworked and must be discarded. Tracked by scrap reason codes. |
| **Rework** | Material that failed inspection but can be corrected and reprocessed. |
| **Disposition** | The decision on what to do with non-conforming material (scrap, rework, use-as-is, return). |
| **PMI** | Product Manufacturing Information — dimensional data extracted from 3D models/drawings. |

## Metrics

| Term | Definition |
|------|-----------|
| **OEE** | Overall Equipment Effectiveness. Availability x Performance x Quality. Industry standard metric. |
| **Availability** | % of scheduled time that equipment is actually running. |
| **Performance** | Actual output rate vs. theoretical maximum rate. |
| **Quality** | % of produced items that pass first-time inspection (no rework/scrap). |

## ERP Integration

| Term | Definition |
|------|-----------|
| **ERP** | Enterprise Resource Planning — the business system (e.g., SAP, Exact, AFAS) that manages orders, inventory, invoicing. |
| **External ID** | The ID of an entity in the ERP system. Used for sync matching. |
| **External Source** | Which ERP system the data came from (e.g., "exact", "sap"). |
| **Sync Hash** | SHA-256 hash of synced data for change detection — skip updates when data hasn't changed. |
| **Bulk Sync** | Pushing multiple records from ERP to Eryxon Flow in one API call (max 1000 items). |

## System Concepts

| Term | Definition |
|------|-----------|
| **Tenant** | An organization using Eryxon Flow. All data is isolated per tenant via RLS. |
| **RLS** | Row-Level Security — PostgreSQL feature that restricts row access based on session context. |
| **API Key** | Bearer token for REST API access. Format: `ery_live_*` (production) or `ery_test_*` (sandbox). |
| **Plan** | Subscription tier: free, pro, premium, enterprise. Determines rate limits and quotas. |
| **MCP** | Model Context Protocol — allows AI agents to interact with Eryxon Flow as a tool. |
| **STEP / STP** | ISO 10303 file format for 3D CAD models. The dominant exchange format in manufacturing. |
| **Soft Delete** | Records are marked with `deleted_at` timestamp instead of being physically removed. |
| **Webhook** | HTTP callback fired when events occur (job created, status changed, etc.). |
