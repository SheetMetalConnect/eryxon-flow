---
title: Welcome to Eryxon MES
description: The simple, elegant and powerful manufacturing execution system that your people will love to use. Made for custom metals fabrication—sheet metal, structural steel, precision machining.
---

:::note[Early Access]
Heads up – this is an early version. Free during early access, but expect some bugs or downtime. [Try the demo](https://app.eryxon.eu) or see the [Hosted Version](/hosted-version) page for details.
:::

**The simple, elegant and powerful manufacturing execution system that your people will love to use. Made for custom metals fabrication.**

### Who It's For

**Primary:** Custom metals fabrication shops—sheet metal, structural steel, precision machining—handling high, mid, or low volume production.

**Also useful for:** Other job shops and custom manufacturing companies in construction, furniture, woodworking, and similar industries.

---

## What is MES?

A **Manufacturing Execution System (MES)** bridges the gap between your ERP (business system) and the shop floor. While your ERP manages orders, customers, and invoices, MES tracks *how work actually gets done*—who's working on what, where parts are in production, and whether you're on schedule.

### Our Philosophy

**Go paperless.** Leave paper travelers behind. Instead of printing job packets that get lost, damaged, or outdated the moment something changes, give operators a tablet with live information—drawings, 3D models, instructions, and status—all in one place.

**Collect data.** Every start, stop, and completion is recorded. Know how long operations actually take. Identify bottlenecks. Build a foundation for continuous improvement.

**Improve communication.** When an operator reports an issue, everyone sees it immediately. When a priority changes, everyone knows. No more walking the floor to find out what's happening—real-time visibility across all screens.

**Integrate with your systems.** Eryxon connects to your ERP via REST API and publishes events to a unified namespace (MQTT/ISA-95). Your data flows where it needs to go—no islands, no double entry.

---

## What It Does

Eryxon tracks jobs, parts, and tasks through production with a mobile and tablet-first interface. Integrate with your ERP and publish events to a unified namespace (MQTT/ISA-95).

### For Operators
The interface shows what to work on, grouped by materials and manufacturing stages—organized the way your shop runs, not the way accountants think. 
- **Visual indicators** (colors, images) make tasks instantly recognizable. 
- **STEP file viewer** shows the geometry. 
- **PDF viewer** shows the drawings. 
- Start and stop time on tasks. 
- Report issues when something's wrong. 

Everything needed, nothing extra.

### For Admins
See who's working on what in real-time. 
- Drag and drop to assign specific work to specific people. 
- Review and approve issues. 
- Override dates when needed. 
- Configure stages, materials, and templates. 

Real visibility into shopfloor activity without walking the floor.

### Work Organization
Work is displayed **kanban-style** with visual columns per stage. Operators see what's available and pull work when ready—not pushed by a schedule. Stages represent manufacturing zones (cutting, bending, welding, assembly).

**Quick Response Manufacturing (QRM)** principles are built in: 
- Visual indicators show when too many jobs or parts are in the same stage. 
- Limit work in progress per stage to maintain flow. 
- Track progress by stage completion, not just individual operation times. 
- Manual time entry shows what's remaining, not just what's done. 
- **Real-time updates**—changes appear immediately on all screens.

### Flexible Data
Jobs, parts, and tasks support **custom JSON metadata**—machine settings, bend sequences, welding parameters. Define reusable resources like molds, tooling, fixtures, or materials, then link them to work. Operators see what's required and any custom instructions in the task view.

---

## Users & Roles

### Operators
See their work queue, start/stop time tracking, mark tasks complete, view files, and report quality issues.

### Admins
Do everything operators can, plus: assign specific work to specific people, manage issues, override dates, and configure stages/materials/templates. Daily drag-and-drop assignment puts the right work with the right people. Because people matter.

> **Note:** Operator accounts can be flagged as machines for autonomous processes.

---

## Real-Time Visibility

Track who's on-site and what they're working on in real-time. No guessing, no delays. Changes appear immediately across all screens via **WebSocket updates**.

---

## Integration-First Architecture

**100% API-driven.** Your ERP pushes jobs, parts, and tasks via REST API. Eryxon sends completion events back via webhooks and MQTT (ISA-95 unified namespace). MCP server enables AI/automation integration.

### File handling
Request a signed upload URL from the API, upload STEP and PDF files directly to Supabase Storage, then reference the file path when creating jobs or parts. Large files (5-50MB typical) upload directly to storage—no timeouts, no API bottlenecks.

### Custom metadata
Include JSON payloads on jobs, parts, and tasks for your specific needs—tooling requirements, mold numbers, machine settings, material specifications, anything your shop needs to track.

### ERP Integrations
Partners like **Sheet Metal Connect e.U.** build integrations for common ERP systems. Or build your own using our GitHub starter kits with example code and documentation.

### Assembly Tracking
Parts can have parent-child relationships. Visual grouping shows assemblies with nested components. Non-blocking dependency warnings remind operators when child parts should be complete before starting assembly tasks—but they can override if needed.

### Issue Reporting
Operators create issues (NCRs) from active tasks with description, severity, and optional photos. Simple approval workflow: pending → approved/rejected → closed. Issues are informational—they don't block work from continuing.

---

## What We Don't Do (By Design)

*   **No financial tracking.** We track time spent on work, not costs, prices, or margins.
*   **No purchasing.** Tasks can be marked as external (subcontract work) and status tracked via API, but no PO management or vendor transactions.
*   **No BOM management.** We track what to produce, not item details or inventory. Parts can have parent-child links for assembly visualization, but not multi-level BOMs that do not live in production.
*   **No scheduling.** Dates typically come from your ERP, but admins can manually override. We don't calculate or optimize schedules—you control them.
*   **No reports.** Real-time stat panels only. No built-in historical analytics—but all data accessible via API/MCP for your own reporting.

---

## Technical Stack

*   **Frontend:** React + TypeScript
*   **Backend:** Supabase (PostgreSQL, Edge Functions, Realtime, Storage)
*   **Auth:** JWT-based with role-based access control
*   **Files:** Supabase Storage with signed URLs
*   **STEP Viewer:** occt-import-js for client-side STEP parsing + Three.js rendering
*   **Integration:** REST API, webhooks, MCP server
