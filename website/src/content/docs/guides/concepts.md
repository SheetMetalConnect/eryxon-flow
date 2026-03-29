---
title: Core Concepts
description: Jobs, parts, operations, batches — what they are and how they connect.
---

Eryxon Flow tracks work through a simple hierarchy: **Job > Parts > Operations**. Everything in the system hangs off this structure.

## Job

A job is a customer order or internal project. It is the top-level container.

| Field | Example |
|-------|---------|
| Job number | WO-2026-0142 |
| Customer | Hygienisch Staal BV |
| Due date | 2026-05-15 |
| Status | not_started, in_progress, completed |

A job has one or more parts. The job tracks the overall deadline and customer context. Rush priority is set at the part level, not the job level.

## Part

A part is a physical item to produce. Each part belongs to one job.

| Field | Example |
|-------|---------|
| Part number | FRAME-RVS-316L |
| Material | RVS 316L 3mm |
| Quantity | 4 |
| Rush (bullet card) | yes/no |
| Parent part | (for assemblies) |

Parts can have:

- **Files** — STEP models (3D viewer), PDF drawings, any other attachment via Supabase Storage
- **Metadata** — JSON with custom data: bend sequences, welding parameters, surface finish requirements
- **Child parts** — for assemblies, parts reference a parent part. The system shows assembly dependencies and warns operators when child parts are not yet complete.

## Operation

An operation is a single production step on a part. It is where actual work happens.

| Field | Example |
|-------|---------|
| Name | Lasersnijden |
| Cell | Laser 1 |
| Sequence | 1 (first step) |
| Estimated time | 120 minutes |
| Actual time | 95 minutes (tracked via start/stop) |
| Remaining | 25 minutes (estimated minus actual) |
| Status | not_started, in_progress, on_hold, completed |

Operations can have:

- **Metadata** — laser power, speed, gas type, CNC program name, bend angles
- **Substeps** — breakdown of the operation into smaller tasks (e.g. "load sheet", "run program", "deburr edges")
- **Time tracking** — operators start/stop a timer, actual time is recorded
- **Issues** — operators report problems with severity, description, and photos
- **Resources** — linked tooling, fixtures, molds needed for this step
- **On hold** — paused without losing queue position

When all operations on a part are completed, the part is done. When all parts in a job are done, the job is done.

## Batch

A batch groups operations from different parts that are processed together. The most common use: **laser nesting** — multiple parts cut from the same sheet.

| Field | Example |
|-------|---------|
| Batch number | NEST-2026-0301 |
| Type | laser_nesting |
| Material | S235 6mm |
| Sheet count | 2 |
| Cell | Lasersnijden |

Batches can have:

- **Nesting metadata** — sheet size (1500x3000), utilization percentage, CAM program reference
- **Nesting image** — upload of the nesting layout from the CAM software
- **Lifecycle** — draft > in_progress > completed. Start and stop can be triggered by an operator or by a machine (CAD/CAM integration via API).
- **Time distribution** — when a batch is completed, total production time is distributed across all included operations proportional to their estimated time.

## How They Connect

```
Job: WO-2026-0142 (Hygienisch Staal BV, due 15 mei)
├── Part: FRAME-RVS-316L (RVS 316L, qty 4, RUSH)
│   ├── Op 1: Lasersnijden → Laser 1 (est. 90 min)     ← in Batch NEST-0301
│   ├── Op 2: Kanten → CNC Kantbank (est. 120 min)
│   ├── Op 3: Lassen TIG → Lascel 2 (est. 240 min)
│   └── Op 4: Beitsen → Afwerking (est. 60 min)
├── Part: DEKSEL-304 (RVS 304, qty 8)
│   ├── Op 1: Lasersnijden → Laser 1 (est. 45 min)      ← in Batch NEST-0301
│   └── Op 2: Kanten → CNC Kantbank (est. 30 min)
└── Part: BODEMPLAAT-S235 (S235, qty 4)
    ├── Op 1: Lasersnijden → Laser 1 (est. 60 min)       ← in Batch NEST-0301
    └── Op 2: Kanten → CNC Kantbank (est. 45 min)
```

Three parts, three different materials, but the laser operations are grouped into one nesting batch. The operator cuts all three in one run, and time is distributed back to each operation.

## Assembly Example

A welded stainless steel food-grade cabinet with two levels of sub-assemblies:

```
Job: WO-2026-0142 — RVS Cabinet Hygienisch Staal BV
│
├── Part: CABINET-ASSY (Assembly — qty 1)
│   ├── Op 1: Assemblage → Montage (est. 180 min)
│   └── Op 2: Kwaliteitscontrole → Kwaliteit (est. 30 min)
│
│   ┌── Child: FRAME-ASSY (Sub-assembly — qty 1, parent: CABINET-ASSY)
│   │   ├── Op 1: Lassen TIG → Lascel (est. 240 min)
│   │   └── Op 2: Beitsen/passiveren → Afwerking (est. 90 min)
│   │
│   │   ┌── Child: STAANDER-L (Part — qty 2, parent: FRAME-ASSY)
│   │   │   ├── Op 1: Lasersnijden → Laser (est. 30 min)
│   │   │   └── Op 2: Kanten → Kantbank (est. 45 min)
│   │   │
│   │   ├── Child: STAANDER-R (Part — qty 2, parent: FRAME-ASSY)
│   │   │   ├── Op 1: Lasersnijden → Laser (est. 30 min)
│   │   │   └── Op 2: Kanten → Kantbank (est. 45 min)
│   │   │
│   │   └── Child: TRAVERSE (Part — qty 4, parent: FRAME-ASSY)
│   │       ├── Op 1: Lasersnijden → Laser (est. 20 min)
│   │       └── Op 2: Kanten → Kantbank (est. 25 min)
│   │
│   ├── Child: DEKSEL (Part — qty 1, parent: CABINET-ASSY)
│   │   ├── Op 1: Lasersnijden → Laser (est. 15 min)
│   │   ├── Op 2: Kanten → Kantbank (est. 20 min)
│   │   └── Op 3: Slijpen → Afwerking (est. 30 min)
│   │
│   └── Child: BODEMPLAAT (Part — qty 1, parent: CABINET-ASSY)
│       └── Op 1: Lasersnijden → Laser (est. 10 min)
```

**How this works in practice:**

1. All laser operations across all parts go into one or two nesting batches. The programmer nests STAANDER-L, STAANDER-R, TRAVERSE, DEKSEL, and BODEMPLAAT on S235/RVS sheets.

2. After cutting, parts flow to the kantbank for bending, then to welding where FRAME-ASSY is assembled from its child parts.

3. When the operator starts the FRAME-ASSY welding operation, the system checks if child parts (STAANDER-L, STAANDER-R, TRAVERSE) are complete. If not, a warning appears — but the operator can override it.

4. After FRAME-ASSY and DEKSEL are finished, CABINET-ASSY assembly can start. Same dependency check.

5. Final quality inspection completes the job.

**Files at each level:**

- CABINET-ASSY: assembly drawing (PDF), 3D model (STEP)
- FRAME-ASSY: welding drawing with weld symbols (PDF), weld jig reference (metadata)
- Individual parts: flat pattern (PDF), 3D model (STEP), bend data (metadata: angles, radii, sequence)

**Metadata examples:**

- Laser operation: `{"power": 4000, "speed": 12000, "gas": "N2", "program": "NEST-0301"}`
- Bend operation: `{"bends": [90, 90, 135], "tool": "V16-88", "backgauge": [120, 80, 45]}`
- Weld operation: `{"process": "TIG", "wire": "316L 1.0mm", "gas": "Argon", "cert_required": true}`
- Assembly: `{"torque_specs": {"M8": 25, "M10": 45}, "sealant": "Loctite 243"}`
