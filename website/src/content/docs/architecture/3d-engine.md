---
title: "3D CAD Engine"
description: "Overview of Eryxon Flow's 3D rendering architecture and PMI strategy in 0.1 BETA."
---



Eryxon Flow features a modern, flexible 3D CAD viewing architecture designed specifically for the unique needs of the metals industry.

## Recommended: Client-Side Rendering (Default)

For the **0.1 BETA** release, we recommend the **browser-based (Client)** renderer for all standard production environments.

- **Technology**: Three.js + custom WASM-based STEP parser.
- **Support**: Native support for `.step` and `.stp` files directly in the browser.
- **Capabilities**: Zoom, Orbit, Pan, Exploded views, and Wireframe modes.
- **PMI Support**: **No PMI support** in the default client-side viewer.
- **Why we recommend it**: It requires zero additional server infrastructure, provides instant loading times, and handles most visualization needs for cutting, bending, and welding.

## Experimental: PMI Data Extraction

We are currently working on an **experimental custom back-end** specifically for automated PMI (Product Manufacturing Information) data extraction.

- **Status**: Experimental / Development in progress.
- **Approach**: Parsing STEP file text structures directly on the server to extract critical dimensions and tolerances.
- **Usage**: Intended for automated quality checks and advanced operation planning.

## Engine Extensibility

Eryxon is built for flexibility. Organizations with specific high-fidelity needs can integrate their own engines:

- **FreeCAD**: Can be deployed as a server-side processing node.
- **Commercial Engines**: Integration-ready for engines like **CAD Exchanger** if you wish to purchase specific licenses for multi-format or high-fidelity PMI support.

---

> [!NOTE]
> **Status**: Eryxon Flow 0.1 BETA
> **Author**: Luke van Enkhuizen
> **Company**: [Sheet Metal Connect e.U.](https://www.sheetmetalconnect.com/)
