---
title: "PMI Extraction"
description: "Extract manufacturing annotations from STEP CAD files (Planned)"
---

:::note[Planned Feature]
PMI extraction is currently **PLANNED** and not yet available. Use the browser-based [3D Viewer](/guides/3d-viewer/) for viewing STEP files.
:::

Product Manufacturing Information (PMI) extraction will enable automatic reading of dimensions, tolerances, and annotations directly from STEP CAD files.

## What is PMI?

PMI (Product Manufacturing Information) includes manufacturing annotations embedded in CAD files:

- **Dimensions:** Linear, angular, diameter, radius measurements
- **GD&T Tolerances:** Geometric dimensioning and tolerancing symbols
- **Datums:** Reference labels (A, B, C) for measurements
- **Surface Finishes:** Ra/Rz roughness values
- **Weld Symbols:** Fillet, groove, spot weld annotations
- **Notes:** Manufacturing instructions

## Planned Capabilities

When implemented, PMI extraction will:

- Read semantic PMI data from STEP AP242 files
- Support legacy graphical PMI from AP203/AP214 files
- Display annotations overlaid on the 3D model
- Enable automatic quality checks from CAD tolerances
- Assist with operation planning by extracting critical dimensions

## File Format Support (Planned)

| Format | PMI Support |
|--------|-------------|
| STEP AP242 | Full semantic PMI |
| STEP AP214/AP203 | Graphical annotations only |
| IGES | No PMI support |

## Use Cases

- **Quality Control:** Compare actual measurements against CAD tolerances
- **Operation Planning:** Auto-populate inspection requirements
- **Manufacturing Prep:** Extract critical dimensions for setup sheets
- **Documentation:** Generate inspection reports from CAD data

## Current Status

This feature is on the roadmap. See [Roadmap](/roadmap/) for development priorities.

For now, use the [3D Viewer](/guides/3d-viewer/) to view STEP geometry without PMI annotations.

See also: [3D Viewer Guide](/guides/3d-viewer/), [3D Engine Architecture](/architecture/3d-engine/)
