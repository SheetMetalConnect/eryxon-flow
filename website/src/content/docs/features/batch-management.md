---
title: Batch & Nesting Management
description: Group parts for efficient cutting, share setups, and track material usage.
---

In sheet metal production, a single laser program often cuts parts from multiple jobs on the same sheet. Without batch management, planners track nesting layouts in spreadsheets, operators guess which parts belong together, and time registration falls apart because setup time gets charged to the wrong job.

Eryxon Flow treats batches as first-class objects. You group operations into a batch, assign material, attach the nesting layout, and run the entire batch as one unit. Setup time and cutting time get distributed across all parts automatically.

## Why batches matter

A typical laser nesting run puts 8-15 different parts on one sheet. Those parts may come from 3-4 different jobs, each with its own delivery deadline. Batching solves three problems at once:

- **Shared setup time** -- programming, material handling, and machine setup happen once per batch, not once per part. Time is distributed proportionally across all operations in the batch.
- **Material tracking** -- each batch records the material grade, thickness, and number of sheets. You always know what stock was consumed.
- **Traceability** -- every operation in the batch links back to its parent job and part. Nothing gets lost between nesting software and the shop floor.

## Creating a batch

Navigate to **Batches** and create a new batch. The required fields:

| Field | Purpose |
|---|---|
| **Batch number** | Unique identifier. Auto-generated or manual. |
| **Batch type** | Laser nesting, tube, saw, finishing, or general. |
| **Cell** | The manufacturing cell that will run this batch. |
| **Operations** | Select the operations to include from available work. |

Optional fields that make batches more useful:

- **Material** and **Thickness (mm)** -- what sheet material this batch consumes.
- **Nesting image** -- upload an SVG or PNG of the nesting layout so operators see exactly how parts are arranged on the sheet.
- **Layout image** -- a secondary visual, useful for marking part identification or orientation.
- **Parent batch** -- link sub-batches to a master nest when one nesting program spans multiple sheets.
- **Metadata** -- JSON field for machine-specific parameters like cutting technology, gas type, or feed rate. Useful for nesting software integrations.
- **Notes** -- free text for the operator or planner.

## Batch lifecycle

Every batch moves through a simple status flow:

```
draft --> ready --> in_progress --> completed
```

- **Draft** -- batch is being assembled. You can add or remove operations freely.
- **Ready** -- batch is locked and waiting for the operator to start.
- **In progress** -- the operator has started the batch. Time entries are running for all operations. No operations can be added or removed.
- **Completed** -- batch is finished. Total elapsed time is calculated and distributed across operations, weighted by their estimated time when available.

When a batch completes, the system automatically:
1. Closes all running time entries.
2. Distributes total elapsed time across operations (weighted by estimate, or equal split if no estimates exist).
3. Updates each operation's actual time.

## Nesting visuals

Upload nesting layout images directly on the batch. These show up in the batch detail view and on the operator terminal, so the person at the machine sees exactly how parts sit on the sheet.

Supported formats: SVG, PNG, JPEG. Images are stored securely and scoped to your tenant.

Two image slots are available per batch:
- **Nesting image** -- the technical cutting layout from your nesting software.
- **Layout image** -- an annotated view for part identification, orientation marks, or handling instructions.

## Material tracking

Each batch can record:
- **Material grade** -- e.g., S235JR, DC01, RVS 304.
- **Thickness** -- in millimeters.
- **Batch requirements** -- additional material needs tracked per batch for planning purposes.

This gives planners a clear view of material consumption per batch, and makes it possible to trace which sheets were used for which jobs.

## API integration

Two API endpoints give nesting software and ERP systems programmatic control over batches:

**`api-batches`** -- CRUD operations on batches. Create a batch, assign operations, update material info, or query batches by status, type, cell, or material.

**`api-batch-lifecycle`** -- dedicated lifecycle actions:
- `start` -- starts the batch, creates time entries for all operations, sets status to in_progress.
- `stop` -- completes the batch, distributes time, closes all time entries.
- `add-operations` -- adds operations to a draft or ready batch.

Both endpoints fire webhook events (`batch.started`, `batch.completed`) so downstream systems stay in sync.

A typical integration flow with nesting software:
1. Nesting software creates a batch via `api-batches` with material, thickness, operation IDs, and nesting metadata.
2. It uploads the nesting layout image.
3. The operator starts the batch from the terminal or via `api-batch-lifecycle/start`.
4. On completion, `api-batch-lifecycle/stop` distributes time and triggers a webhook back to the ERP.

## On the shop floor

Batched operations appear grouped in the operator's work queue. Instead of seeing 12 individual cutting operations, the operator sees one batch with all parts listed. They start the batch once, run the program, and stop it when done. The system handles time distribution behind the scenes.

This removes the most common complaint from laser operators: having to start and stop timers for each individual part on a shared nest.
