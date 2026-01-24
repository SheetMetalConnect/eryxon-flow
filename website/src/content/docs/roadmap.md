---
title: Roadmap
description: Feature considerations and future direction for Eryxon MES
---

Features we're **considering** — nothing planned, promised, or guaranteed.

**We're considering moving this to GitHub** for better community interaction.

---

## How This Works

- Items listed are **considerations only** — not commitments
- Features may be built, modified, or dropped
- To influence direction: [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues)

---

## Under Consideration

### Completed Quantity Display

Show parts completed (aantal gereed) in operator work queue per operation.

**Why:** Operators want to see done vs. remaining at a glance for batch production.

**Current:** Data exists in `operation_quantities` but isn't prominently displayed.

---

### Cycle Time from Multiple Measurements

Calculate cycle time per piece from multiple samples, not just total time / quantity.

**Why:** Simple averages are skewed by setup time. Shops want accurate per-piece times for quoting.

**Current:** Basic calculation exists (`actualTime / totalGood`). No multi-sample averaging.

---

### Work Order Remarks

Dedicated remarks field for operators to leave notes for shift handoff.

**Why:** Quick notes that don't fit formal issue reporting.

**Current:** Notes exist on various entities. No dedicated "werkbon" remarks field.

---

### Scrap with Reasons During Production

Record scrap quantity with reason codes during production, not just good parts.

**Why:** Capture rejects with reasons in the same workflow as production reporting.

**Current:** Scrap reasons configured. Database fields exist. Operator modal focuses on good parts only.

---

### DNC Connection

Transfer NC files directly from Eryxon to CNC machines.

**Why:** Eliminate manual file transfers (USB, network shares).

**Current:** Not implemented. Requires protocol support and significant effort.

---

### Job Progress Dashboard

Real-time dashboard showing job progress, completion percentages, bottlenecks.

**Why:** Managers want to monitor production without walking the floor.

**Current:** Activity Monitor shows events. No aggregated job progress view.

---

### Enhanced 3D Viewer with PMI

Display PMI (dimensions, tolerances, GD&T) from STEP files in the 3D viewer.

**Why:** Operators need dimensions without opening separate drawings.

**Current:** 3D viewer is **usable for geometry**. PMI would require a backend CAD service — browser-based approach has limitations.

---

### Standard ERP Connectors

Pre-built connectors for common manufacturing ERP systems.

**Why:** Lower barrier for shops without development resources.

**Current:** API supports sync with `external_id`. No out-of-the-box connectors.

---

### Production-Ready Real-time Connectors

Make MQTT, webhooks, and MCP connectors production-ready. Then expand features.

**Why:** Industrial environments expect reliable real-time data flow.

**Current:** Code exists but is **untested and experimental** — not production-ready.

---

## Not In Scope

See [Introduction](/introduction/) for what Eryxon explicitly does not do:

- Financial tracking
- Purchasing/PO management
- Multi-level BOM management
- Scheduling optimization
- Built-in historical reports

---

## Feedback

- [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- [GitHub Discussions](https://github.com/SheetMetalConnect/eryxon-flow/discussions)
