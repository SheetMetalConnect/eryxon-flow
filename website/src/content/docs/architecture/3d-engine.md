---
title: "3D CAD Engine"
description: "Overview of Eryxon Flow's 3D rendering architecture, measurement support, and PMI strategy."
---
 
> Current documented release: `0.3.2`

Eryxon Flow features a modern, flexible 3D CAD viewing architecture designed specifically for the unique needs of the metals industry.

## Recommended: Client-Side Rendering (Default)

For release `0.3.2`, we recommend the **browser-based (client-side)** renderer for all standard production environments.

- **Technology**: Three.js + custom WASM-based STEP parser.
- **Support**: Native support for `.step` and `.stp` files directly in the browser.
- **Capabilities**: Zoom, Orbit, Pan, Exploded views, Wireframe modes, and measurement-oriented interaction scaffolding.
- **PMI Support**: **No PMI support** in the default client-side viewer.
- **Why we recommend it**: It requires zero additional server infrastructure, provides instant loading times, and handles most visualization needs for cutting, bending, and welding.

## Measurement Support

The current viewer architecture includes modular measurement support under the viewer measurement subsystem:

- point-to-point measurements
- face distance and face angle calculations
- annotation rendering and preview lines
- BVH-accelerated picking infrastructure

This is intended to support practical shop-floor inspection and review workflows without requiring a separate CAD desktop application.

## Experimental: PMI Data Extraction

PMI extraction remains an **experimental / advanced path** and is not yet part of the default browser-only rendering pipeline.

- **Status**: Experimental / Development in progress.
- **Approach**: Parsing STEP file text structures directly on the server to extract critical dimensions and tolerances.
- **Usage**: Intended for automated quality checks and advanced operation planning.

## Engine Extensibility

Eryxon is built for flexibility. Organizations with specific high-fidelity needs can integrate their own engines:

- **FreeCAD**: Can be deployed as a server-side processing node.
- **Commercial Engines**: Integration-ready for engines like **CAD Exchanger** if you wish to purchase specific licenses for multi-format or high-fidelity PMI support.

---

> [!NOTE]
> **Status**: Browser-first 3D engine is production-capable for geometry viewing. Measurement tooling is actively integrated. PMI extraction remains a planned advanced capability.
