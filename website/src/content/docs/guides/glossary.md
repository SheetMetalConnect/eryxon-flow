---
title: Glossary
description: Plain-language definitions of the manufacturing and MES terms used across Eryxon Flow — jobs, operations, cells, QRM, bullet and yellow cards, NCRs, ERP sync, and more.
---

The vocabulary Eryxon Flow uses, in plain terms. If you run a high-mix metalworking shop, most of this will be familiar — this page just pins down exactly what each word means inside the app.

## Core entities

| Term | Definition |
|------|-----------|
| **Job** | A customer order containing one or more parts. Carries a job number, customer, and due date. |
| **Part** | A physical item to be made. Belongs to a job, and has a part number, material, quantity, and drawings. Parts can nest into assemblies (a parent part with child parts). |
| **Operation** | A single manufacturing step on a part — laser cutting, bending, welding, finishing. Has a sequence, a planned time, and a cell it runs at. |
| **Substep** | A checklist item inside an operation, e.g. "verify dimensions" or "deburr edges". |
| **Batch** | A group of operations run together for efficiency on one machine — most often a laser nest. |

## Production and flow

| Term | Definition |
|------|-----------|
| **Cell / Stage** | A work centre or machine group — "Laser 1", "Bending", "Paint Line". Operations run at cells. |
| **Resource** | A machine, tool, or fixture, tied to the cells it belongs to. |
| **Assignment** | Links an operator to the work they should pick up. |
| **Work queue** | An operator's view of their operations, ordered by priority. |
| **Capacity matrix** | A grid showing each cell's available capacity against the work scheduled onto it over time. |
| **QRM** | Quick Response Manufacturing — an approach that treats *lead time* as the single measure of success. Shorter time through the shop is the goal. |
| **POLCA** | QRM's shop-floor card method (Paired-cell Overlapping Loops of Cards with Authorization). Eryxon Flow applies QRM *ideas* but is not a POLCA system — it has no card loops or release authorization. |
| **Bullet card** | A priority marker a team leader puts on a part. The carded part sorts to the top of the list and is highlighted wherever it appears, so it's easy to spot on the floor. Meant to be used sparingly — guidance, not a hard cap. |
| **Yellow card** | An on-hold marker on an operation. A yellow-carded operation leaves the capacity views and frees a WIP slot at its cell while it waits. Remove the card and it returns to its normal place in the queue by sequence — it doesn't jump ahead or drop to the back. |
| **WIP limit** | The maximum work-in-progress a cell will hold. Limiting WIP is how QRM keeps queues short and lead time down. |

## Quality

| Term | Definition |
|------|-----------|
| **Issue** | A problem reported during production. Types include non-conformance, observation, improvement, and safety. |
| **NCR** | Non-Conformance Report — a formal record that something doesn't meet spec. |
| **Scrap** | Material that can't be reworked and must be discarded, tracked by reason. |
| **Rework** | Material that failed inspection but can be corrected and reprocessed. |
| **Disposition** | The decision on non-conforming material: scrap, rework, use-as-is, or return. |
| **PMI** | Product Manufacturing Information — the dimensions and tolerances carried in a 3D model or drawing. |

## ERP and integration

| Term | Definition |
|------|-----------|
| **ERP** | The business system that manages orders, inventory, and invoicing. Eryxon Flow runs the floor; the ERP stays the system of record. |
| **External ID** | An entity's identifier in your ERP, used to match records when syncing. |
| **External source** | Which ERP a record came from. |
| **Bulk sync** | Pushing many records from an ERP into Eryxon Flow in one API call, with change detection so unchanged records are skipped. |
| **Webhook** | An automatic callback Eryxon Flow sends when something happens — a job is created, a status changes — so other systems can react. |
| **API key** | A token that authorises access to the REST API, with separate production and sandbox keys. |
| **MCP** | Model Context Protocol — lets AI assistants work with Eryxon Flow as a connected tool. |

## Platform

| Term | Definition |
|------|-----------|
| **Workspace (tenant)** | One organisation's space in Eryxon Flow. Every shop's data is isolated from every other's. |
| **Plan** | The subscription tier, which sets quotas and rate limits. |
| **STEP / STP** | The ISO 10303 file format for 3D CAD models — the dominant exchange format in manufacturing. |
