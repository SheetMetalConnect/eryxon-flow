---
title: Roadmap
description: Feature considerations and future direction for Eryxon Flow
---

This page lists what is in active development and possible future work for forks and maintainers.

Track progress and vote on features via [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues).

---

## In Development

| Initiative | Why | Notes |
|------------|-----|-------|
| **Android (Native) app** | Shop floor reliability needs offline support and fast cold start that a browser can't deliver. | Built natively (not a wrapped web view). Offline queue for time entries and status changes, sync on reconnect, native camera for issue photos and barcodes. |
| **iOS app** | Managers, supervisors, and operators on Apple devices need first-class native UX. | Native iPad and iPhone layouts, push notifications, real-time job status. |

Both apps share the same backend and REST/MCP/MQTT API as the web app, so existing integrations carry over.

---

## Under Consideration

Features we're **considering** - nothing planned, promised, or guaranteed.

| Feature | Why | Issue |
|---------|-----|-------|
| **Cycle time from multiple measurements** | Simple averages are skewed by setup time. Shops need accurate per-piece times for quoting. | [#497](https://github.com/SheetMetalConnect/eryxon-flow/issues/497) |
| **Work order remarks** | Operators need a quick note field for shift handoff — "werkbon" style annotations. | [#498](https://github.com/SheetMetalConnect/eryxon-flow/issues/498) |
| **DNC connection** | Transfer NC files directly to CNC machines. Eliminate USB and network share workflows. | [#499](https://github.com/SheetMetalConnect/eryxon-flow/issues/499) |
| **Job progress dashboard** | Rolled-up view of job completion percentages and bottlenecks for production managers. | [#500](https://github.com/SheetMetalConnect/eryxon-flow/issues/500) |
| **Standard ERP connectors** | Pre-built sync starting with Odoo. Lower the barrier for shops without developers. | [#501](https://github.com/SheetMetalConnect/eryxon-flow/issues/501) |
| **Production-ready connectors** | Harden MQTT, webhooks, and MCP for industrial reliability. | [#502](https://github.com/SheetMetalConnect/eryxon-flow/issues/502) |

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

Want something else? Open an issue or join the discussion:

- [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- [GitHub Discussions](https://github.com/SheetMetalConnect/eryxon-flow/discussions)
