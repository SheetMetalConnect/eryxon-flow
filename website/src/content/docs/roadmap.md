---
title: Roadmap
description: Future development plans and planned features for Eryxon MES
---

This roadmap outlines planned features and improvements for Eryxon MES. Features are grouped by theme and represent our development direction—not commitments with fixed timelines.

---

## Current State (v0.2)

The following core capabilities are already implemented:

### Production Tracking
- **Time tracking** — Operators start/stop time on operations
- **Production quantities** — Record good parts produced per operation
- **Scrap tracking** — Categorized scrap reason codes with statistics
- **Quality issues** — NCR creation with severity levels and approval workflow

### Visibility
- **Activity Monitor** — Real-time feed of all system activity
- **Dashboard stats** — Active jobs, operators on-site, work in progress
- **WebSocket updates** — Changes appear instantly on all screens

### Integration
- **REST API** — Full CRUD for jobs, parts, operations
- **Webhooks** — Event notifications for external systems
- **CSV import/export** — Bulk data operations
- **MCP server** — AI/automation integration

---

## Planned Features

### Operator Enhancements

#### Completed Quantity Display
Show the number of parts completed directly in the operator work queue. Currently tracked internally but not prominently displayed per operation.

**Status:** Planned

#### Cycle Time Measurement
Calculate cycle time per unit based on multiple time measurements. The system already calculates average cycle time from total time / quantity, but explicit multi-sample averaging for more accurate cycle time estimation is planned.

**Status:** Planned
**Existing foundation:** `useProductionMetrics.ts` already calculates `avgCycleTimePerUnit`

#### Work Order Remarks
Add a dedicated remarks field for operators to leave notes on work orders (werkbon). Notes currently exist on issues and operations, but a streamlined "operator remarks" feature for work order handoff is planned.

**Status:** Planned
**Existing foundation:** Notes fields exist on multiple entities

---

### Quality & Scrap

#### Enhanced Scrap Reporting
Scrap reasons are already implemented with categories (Material, Process, Equipment, Operator, Design, Other). Future improvements may include:
- Scrap quantity entry per reason during production
- Trend analysis over time
- Automated alerts for recurring scrap patterns

**Status:** Partially implemented
**Location:** `/admin/config/scrap-reasons`

---

### Machine Integration

#### DNC Connection
Enable NC file transfer directly to CNC machines. This would allow operators to push NC programs from the Eryxon interface to connected machines.

**Status:** Planned
**Considerations:**
- Protocol support (FTP, shared folders, machine-specific APIs)
- Security and access control
- File versioning and traceability

---

### Production Management

#### Job Progress Dashboard
A dedicated dashboard for production managers to monitor job progress in real-time. This would go beyond the current Activity Monitor to show:
- Overall job completion percentages
- Parts progress through stages
- Bottleneck identification
- Estimated completion times

**Status:** Planned
**Existing foundation:**
- Activity Monitor provides real-time logging
- Stage-based workflow already tracks operation status
- Production metrics hooks calculate quantities and yields

---

## Contributing

Eryxon MES is open for contributions. If you're interested in implementing any of these features or have suggestions for the roadmap:

1. Check our [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow) for existing discussions
2. Open an issue to discuss implementation approaches
3. Submit a pull request with your contribution

---

## Not Planned

These features are explicitly out of scope for Eryxon MES (see [Introduction](/introduction/)):

- **Financial tracking** — No costs, prices, or margins
- **Purchasing/PO management** — Task status only, no vendor transactions
- **Multi-level BOM management** — Parent-child assembly links only
- **Scheduling optimization** — Manual date control, no automatic scheduling
- **Built-in historical reports** — Real-time stats only (data accessible via API)
