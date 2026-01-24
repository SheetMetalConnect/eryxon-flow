---
title: Roadmap
description: Feature considerations and future direction for Eryxon MES
---

This page lists features we're **considering** for future development. Nothing here is planned, promised, or guaranteed. These are ideas gathered from job shop feedback that we may explore.

**We're considering moving this roadmap to GitHub Discussions** for better community interaction. Feature requests, votes, and discussions would happen there instead of in static documentation.

---

## How This Works

- Items listed here are **considerations only** — not commitments
- We gather feedback from real job shops to understand needs
- Features may be built, modified, deprioritized, or dropped entirely
- If you want to influence direction, open a [GitHub Issue](https://github.com/SheetMetalConnect/eryxon-flow/issues)

---

## Under Consideration

### Completed Quantity Display

**What:** Show the number of parts completed (aantal gereed) prominently in the operator work queue, per operation.

**Why we're considering it:** Operators want to see at a glance how many pieces are done vs. remaining, especially for batch production. Currently this data exists in `operation_quantities` but isn't displayed prominently in the work queue interface.

**Current state:** Production quantities are tracked internally. The `ProductionQuantityModal` records good parts, and `useProductionMetrics.ts` aggregates totals. Display could be enhanced.

---

### Cycle Time from Multiple Measurements

**What:** Calculate accurate cycle time per piece based on averaging multiple production measurements, not just total time / total quantity.

**Why we're considering it:** A single averaged cycle time can be skewed by setup time or anomalies. Job shops want per-piece cycle times derived from multiple individual measurements to get accurate standards for quoting and planning.

**Current state:** `useProductionMetrics.ts` calculates `avgCycleTimePerUnit` as `actualTime / totalGood`. This is a simple division, not multi-sample statistical averaging.

---

### Work Order Remarks

**What:** A dedicated remarks field for operators to leave notes on work orders (werkbon) for handoff to the next shift or production management.

**Why we're considering it:** Operators often need to communicate issues, deviations, or status that doesn't fit into formal issue reporting. A quick "remarks" field on the work order level would help with shift handoffs.

**Current state:** Notes fields exist on issues, jobs, parts, and operations. No dedicated "operator remarks" field specifically for work order handoff.

---

### Scrap with Reasons During Production

**What:** Allow operators to record scrap quantity with specific reason codes during production reporting, not just good parts.

**Why we're considering it:** Currently operators report good parts. Scrap reasons are configured in the system (`/admin/config/scrap-reasons`) but the production quantity flow focuses on good parts. Shops want to capture reject quantities with reasons in the same workflow.

**Current state:** Scrap reason configuration is fully implemented with categories (Material, Process, Equipment, Operator, Design, Other). The `operation_quantities` table has `quantity_scrap` and `scrap_reason_id` fields. The operator modal focuses on good parts.

---

### DNC Connection

**What:** Transfer NC/G-code files directly from Eryxon to CNC machines.

**Why we're considering it:** Operators currently download NC files and transfer them manually (USB, network share). Direct machine connectivity would reduce errors and save time.

**Current state:** Not implemented. Would require protocol support (FTP, CIFS, machine-specific APIs), security considerations, and significant development effort.

---

### Job Progress Dashboard

**What:** A real-time dashboard for production management showing job progress, completion percentages, and bottleneck identification.

**Why we're considering it:** Managers want to monitor production status from their desk without walking the shop floor. Current Activity Monitor shows events, but not aggregated job progress views.

**Current state:** Activity Monitor (`/admin/activity`) provides real-time event logging. Dashboard shows stats. No dedicated "job progress" view with completion percentages per job/part.

---

### Enhanced 3D Viewer with PMI Support

**What:** Improve the 3D STEP viewer to display PMI (Product Manufacturing Information) — dimensions, tolerances, GD&T annotations, and notes embedded in CAD files.

**Why we're considering it:** The current viewer shows geometry only. Operators and inspectors need to see dimensions and tolerances directly in the 3D view without opening separate drawings. PMI-enabled STEP files (AP242) contain this data, but we don't extract or display it yet.

**Current state:** The 3D viewer (`STEPViewer.tsx`) uses Three.js + occt-import-js to render STEP geometry. It supports exploded view, wireframe, and interactive controls. PMI extraction requires additional parsing of semantic PMI data from AP242 files — a significant undertaking.

**See:** [3D Viewer Documentation](/features/3d-viewer/)

---

### Standard ERP Connectors

**What:** Pre-built connectors for common ERP systems like SAP, Odoo, Microsoft Dynamics, NetSuite, or industry-specific systems.

**Why we're considering it:** Currently, ERP integration requires custom development using our REST API. Job shops without development resources struggle to connect their ERP. Pre-built connectors would lower the barrier to adoption.

**Current state:** The API supports sync operations with `external_id` tracking, webhooks, and bulk import. Integration partners build custom connectors. No out-of-the-box connectors exist for specific ERP systems.

**See:** [ERP Integration Guide](/features/erp-integration/)

---

### Enhanced Real-time Connectors

**What:** Improve and expand real-time connectivity options — MQTT bidirectional communication, MCP server enhancements, additional event types, and better configuration UI.

**Why we're considering it:** Industrial environments increasingly expect real-time data flow. Current MQTT publishing is outbound-only. MCP server enables AI/automation but could support more tools. More granular events and easier configuration would improve adoption.

**Current state:**
- **MQTT:** Outbound publishing with ISA-95 topic patterns. No inbound message handling.
- **MCP:** Server implemented for AI integration with tool access to jobs, parts, operations.
- **Webhooks:** HTTP POST on events with HMAC signature verification.

**See:** [MQTT & Webhooks](/architecture/connectivity-mqtt/), [Connectivity Overview](/architecture/connectivity-overview/)

---

## Not In Scope

These features are explicitly **not** part of Eryxon's direction (see [Introduction](/introduction/)):

- **Financial tracking** — No costs, prices, or margins
- **Purchasing/PO management** — No vendor transactions
- **Multi-level BOM management** — Assembly links only, not full BOMs
- **Scheduling optimization** — Manual date control only
- **Built-in historical reports** — Real-time stats only (data via API)

---

## Provide Feedback

If you have opinions on these features or want to suggest others:

- [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues) — Feature requests and discussion
- [GitHub Discussions](https://github.com/SheetMetalConnect/eryxon-flow/discussions) — General feedback (if enabled)

We read everything. No promises, but feedback shapes direction.
