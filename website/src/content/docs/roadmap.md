---
title: Roadmap
description: Feature considerations and future direction for Eryxon Flow
---

Features we're **considering** — nothing planned, promised, or guaranteed.

- Items listed are considerations, not commitments
- Features may be built, modified, or dropped
- To influence direction: [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues)

---

## Under Consideration

### Cycle Time from Multiple Measurements

Calculate cycle time per piece from multiple samples, not just total time divided by quantity. Simple averages are skewed by setup time — shops want accurate per-piece times for quoting.

---

### Work Order Remarks

Dedicated remarks field for operators to leave notes for shift handoff. Quick notes that don't fit formal issue reporting — think "werkbon" style annotations.

---

### DNC Connection

Transfer NC files directly from Eryxon to CNC machines. Eliminate manual file transfers via USB or network shares.

---

### Job Progress Dashboard

Aggregated view showing job progress, completion percentages, and bottlenecks. The Activity Monitor shows individual events — this would add a rolled-up job-level view.

---

### Standard ERP Connectors

Pre-built connectors for common manufacturing ERP systems (Exact, SAP, AFAS). The API already supports sync via `external_id` — connectors would lower the barrier for shops without development resources.

---

### Production-Ready Real-time Connectors

Harden MQTT, webhooks, and MCP connectors for production use. The code exists but needs testing and reliability improvements for industrial environments.

---

## Not In Scope

See [Introduction](/introduction/) for what Eryxon explicitly does not do:

- Financial tracking
- Purchasing / PO management
- Multi-level BOM management
- APS scheduling optimization
- Built-in historical reports

---

## Feedback

- [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- [GitHub Discussions](https://github.com/SheetMetalConnect/eryxon-flow/discussions)
