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
| **QRM** | Quick Response Manufacturing — a strategy that measures success in lead time. Shorter time through the shop is the single goal. |
| **POLCA** | Paired-cell Overlapping Loops of Cards with Authorization — QRM's shop-floor card method. Work starts only when its release date has arrived and the next paired cell has capacity. |
| **Bullet Card** | A POLCA expedite card (Rajan Suri, *The Practitioner's Guide to POLCA*). The carded job is the always-on-top priority: it becomes the next job at every cell and stays first until the card is removed. As guidance it bypasses the release date and the next-cell capacity gate, launching ahead of authorised work. Use sparingly: one ideal, two at most, a guideline not an enforced cap. Not a generic rush flag. Stored as `parts.is_bullet_card`. (Some operator UI still mislabels this as "Rush", a known bug.) |
| **Yellow Card** | A QRM on-hold card on an operation. A yellow-carded operation leaves the capacity views and is excluded from the cell's max-per-cell WIP count, so parking it frees a WIP slot while it waits. Not a generic pause flag — the capacity and WIP exclusion is the point. Stored as `operations.status = 'on_hold'`. |

## Quality & Issues

| Term | Definition |
|------|-----------|
| **NCR** | Non-Conformance Report. A formal record that something doesn't meet specifications. |
| **Issue** | A problem reported during production. Types: NCR, observation, improvement, safety. |
| **Scrap** | Material that cannot be reworked and must be discarded. Tracked by scrap reason codes. |
| **Rework** | Material that failed inspection but can be corrected and reprocessed. |
| **Disposition** | The decision on what to do with non-conforming material (scrap, rework, use-as-is, return). |
| **PMI** | Product Manufacturing Information — dimensional data extracted from 3D models/drawings. |

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
