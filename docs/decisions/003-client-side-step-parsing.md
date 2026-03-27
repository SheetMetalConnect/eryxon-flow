# ADR-003: Client-Side STEP File Parsing

**Status:** Accepted
**Date:** 2025-02-15
**Context:** 3D Viewer

## Decision

STEP/STP files are parsed in the browser using Three.js with three-mesh-bvh for acceleration. An optional CAD backend can be configured for server-side conversion.

## Context

Manufacturing users need to view 3D models of parts directly in the MES. STEP is the dominant format in sheet metal / machining shops.

## Consequences

**Positive:**
- Zero server infrastructure required for basic 3D viewing
- Works in self-hosted/offline deployments
- Three.js ecosystem is mature and well-documented

**Negative:**
- Large STEP files (50MB+) can be slow to parse in-browser
- Limited to mesh visualization — no parametric editing or measurement
- Three.js bundle adds ~200KB gzipped (isolated in `vendor-three` chunk)

## Alternatives Considered

1. **Server-side only (OpenCascade/FreeCAD)** — rejected for self-hosting complexity, but available as optional backend
2. **WebAssembly STEP parser** — investigated, not mature enough at time of decision
3. **Convert to glTF on upload** — rejected, lossy for manufacturing use cases
