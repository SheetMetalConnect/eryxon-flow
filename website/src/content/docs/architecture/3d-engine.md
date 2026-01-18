---
title: "3D CAD Engine"
description: "Browser-based 3D rendering for STEP CAD files"
---

Browser-based 3D CAD viewing for STEP files using Three.js and occt-import-js WASM parser.

## Architecture

All 3D rendering happens client-side in the browser. No server-side CAD processing.

- **Formats:** .step, .stp
- **Parser:** occt-import-js (WASM-based STEP parser)
- **Renderer:** Three.js WebGL
- **Controls:** Zoom, orbit, pan, exploded view, wireframe
- **Infrastructure:** None required - runs entirely in browser

See [3D Viewer Guide](/guides/3d-viewer/) for usage.

## Technical Stack

| Component | Technology |
|-----------|------------|
| 3D Rendering | Three.js |
| STEP Parsing | occt-import-js (WASM) |
| Controls | OrbitControls |
| Storage | Supabase Storage with RLS |
| File Handling | Client-side blob fetch |

## Limitations

- **File size:** Recommended < 10MB (max 50MB)
- **Formats:** .step/.stp only
- **PMI:** Manufacturing annotations not extracted (planned feature)

## Extensibility

Eryxon Flow uses browser-based rendering by design for simplicity and zero infrastructure requirements. For advanced use cases requiring PMI extraction or server-side processing, this is on the roadmap as a planned feature.

See [Roadmap](/roadmap/) for planned features.
