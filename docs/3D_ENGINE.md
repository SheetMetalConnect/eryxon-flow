 
> Current documented release: `0.3.3`

Eryxon Flow uses a browser-first 3D CAD architecture with an optional server-side CAD processing path for richer geometry and PMI workflows.

## Default Runtime Model

For release `0.3.3`, the application is designed to work in two complementary modes:

- **Browser fallback**: direct STEP viewing in the browser for geometry visualization with no CAD service required
- **Preferred enriched path**: optional CAD backend for server-processed geometry and PMI extraction, with browser rendering still handled in the client

In practice, the viewer prefers server-provided geometry when available and falls back to browser-side STEP parsing when it is not.

## Browser Viewer Capabilities

- orbit, zoom, and pan controls
- exploded view
- wireframe and edge overlays
- fit-to-view and dimension overlays
- BVH-accelerated picking for measurement tools

This path is sufficient for many production-floor workflows and keeps self-hosted deployments simple.

## Measurement Support

The current viewer architecture includes integrated measurement tooling under the viewer measurement subsystem:

- point-to-point measurements
- face distance and face angle calculations
- radius measurements
- annotation rendering, previews, and measurement history panel
- BVH-accelerated picking infrastructure

These tools are active application functionality, not just design notes. They are intended to support practical shop-floor inspection and review workflows without requiring a separate CAD desktop application.

## PMI and Backend-Assisted CAD Processing

PMI is no longer best described as "not supported". The current app can render PMI overlays when PMI data is available, but full PMI extraction still depends on an optional backend service.

- **Browser-only mode**: geometry-first, no guaranteed PMI extraction
- **CAD-service mode**: optional backend can provide tessellated geometry plus PMI payloads
- **UI support**: STEP viewer can toggle PMI overlays when PMI data has already been extracted and stored

This is the right model for a manufacturing system: lightweight viewing by default, richer inspection capability when a deployment chooses to run the CAD service.

## Engine Extensibility

Eryxon is built for flexibility. Organizations with specific high-fidelity needs can integrate their own engines:

- **Custom backend**: Eryxon3D-style service for geometry and PMI extraction
- **Bring Your Own Backend**: integration point for external CAD services or commercial SDK-backed pipelines
- **Browser-only fallback**: retained for deployments that want zero extra CAD infrastructure

---

> [!NOTE]
> **Status**: Browser-first 3D viewing is production-capable. Measurement tooling is integrated in the app. PMI overlays are supported when backend PMI data exists, while extraction itself remains an optional service-backed capability.
