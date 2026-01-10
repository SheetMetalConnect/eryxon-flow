---
title: "3D CAD Engine"
description: "3D rendering architecture and PMI strategy"
---

:::caution[Work in Progress]
Server-side PMI extraction is in **alpha** and not production-ready. The client-side 3D viewer works.
:::

Flexible 3D CAD viewing architecture for metals manufacturing.

## Client-Side Rendering (Default)

Recommended for production. Three.js + occt-import-js WASM parser.

- **Formats:** .step, .stp
- **Controls:** Zoom, orbit, pan, exploded view, wireframe
- **PMI:** Not supported in client-side viewer
- **Infrastructure:** None required - runs entirely in browser

See [3D Viewer Guide](/guides/3d-viewer/) for usage.

## Server-Side PMI Extraction (Alpha)

Experimental backend for extracting dimensions and tolerances from STEP AP242 files.

- **Status:** Alpha - not production ready
- **Approach:** Text parsing of STEP structures
- **Usage:** Quality checks, operation planning automation

See [PMI Extraction](/features/pmi-extraction/) for details.

## Extensibility

Bring your own engine:
- **FreeCAD:** Server-side processing
- **CAD Exchanger:** Multi-format + PMI (commercial license)
