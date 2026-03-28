---
title: Quality Management
description: Issue reporting, scrap tracking, and quality workflow in Eryxon Flow.
---

Quality management in Eryxon Flow centers on **issue reporting from the shop floor** and **scrap reason tracking**. Operators flag problems as they happen, admins review and resolve them.

## Issue Reporting

Operators report issues directly from the operation detail panel — on the work queue or terminal. Every issue includes:

- **Severity** — low, medium, high, or critical
- **Description** — what went wrong
- **Photos** — attach images of the problem (recommended)
- **Operation context** — which job, part, and operation the issue relates to

Issues appear instantly in the admin Issue Queue.

## Issue Queue (Admin)

Navigate to **Issues** in the admin sidebar. The queue shows all reported issues with:

- Status: pending, approved, rejected, closed
- Severity badges with color coding
- Reporter name and timestamp
- Linked job and operation

**Workflow:**
1. Operator reports an issue from the shop floor
2. Admin reviews the issue in the queue
3. Admin either **approves** (valid problem), **rejects** (not an issue), or **closes** (already resolved)
4. Resolution notes are added for traceability

## Scrap Reasons

Configure scrap reason codes in **Settings > Scrap Reasons**. Each reason has:

- **Code** — short identifier (e.g. MAT-01, PROC-03)
- **Description** — what happened
- **Category** — Material, Process, Equipment, Operator, or Design

When operators report scrap, they select from these configured reasons. The scrap reasons page shows usage statistics so you can see which problems occur most often.

