---
title: "3D STEP Viewer"
description: "Browser-based 3D STEP file viewer for CAD visualization in EryxonFlow"
---

## Overview

A **client-side** browser-based 3D STEP file viewer integrated into Eryxon Flow. Built with React, Three.js, and occt-import-js to parse and render CAD models entirely in the browser with no backend service required.

**Key Point:** This is a purely client-side implementation. STEP files are parsed in the browser using WebAssembly (occt-import-js), not on a server.

## Features

- **STEP File Support**: Parse and render .step and .stp files
- **Interactive 3D Controls**: Orbit, zoom, and pan with mouse/touch
- **Exploded View**: Visualize assemblies with adjustable separation (assemblies only)
- **Assembly Tree**: View and toggle visibility of individual parts in assemblies
- **Wireframe Mode**: Toggle between solid and wireframe rendering
- **Edge Visibility**: Toggle CAD edge/contour display
- **Bounding Box Dimensions**: Display X, Y, Z dimensions with visual guides
- **Dynamic Grid**: Auto-sized grid based on model dimensions
- **Fit to View**: Automatically frame the model in the viewport
- **Reset View**: Return camera to initial position
- **Multi-tenant**: Secure tenant-isolated file storage

## Technology Stack

### Core Dependencies
- **Three.js**: 3D rendering engine
- **occt-import-js** (v0.0.24): STEP file parser via CDN (OpenCASCADE WASM)

### File Structure
```
src/
├── components/
│   └── STEPViewer.tsx           # Main 3D viewer component
└── lib/
    └── step-viewer/
        ├── constants.ts         # Configuration constants
        ├── types.ts             # TypeScript interfaces
        └── dispose.ts           # Memory cleanup utilities
```

## Viewer Controls

### Toolbar Actions
| Icon | Action | Description |
|------|--------|-------------|
| Focus | Fit to View | Center and frame the model |
| Rotate | Reset View | Return camera to initial position |
| Grid | Toggle Grid | Show/hide reference grid |
| Box | Wireframe | Toggle wireframe rendering |
| Hexagon | Edges | Toggle edge/contour visibility |
| Boxes | Explode | Explode assembly (multi-part only) |
| Tree | Assembly | Show/hide assembly tree panel |
| Ruler | Dimensions | Show/hide bounding box dimensions |

### Mouse Controls
- **Rotate**: Left-click and drag
- **Zoom**: Scroll wheel
- **Pan**: Right-click and drag

## Assembly Support

The viewer automatically detects assemblies (multiple parts) and enables:

1. **Exploded View**: Separates parts radially from center with adjustable factor (0-2x)
2. **Assembly Tree Panel**: Lists all parts with:
   - Part names from STEP file
   - Visibility toggle per part
   - Part count indicator

> **Note**: Explosion view is disabled for single-part models.

## Rendering Features

### Lighting
- Two-light setup following CAD visualization best practices:
  - HemisphereLight (sky/ground ambient)
  - DirectionalLight (key light)

### Materials
- MeshPhysicalMaterial with:
  - Metalness: 0.4
  - Roughness: 0.8
  - Double-sided rendering

### Performance
- Shared material instances (memory optimization)
- devicePixelRatio/1.5 for HiDPI displays
- Safe disposal with error handling
- RequestAnimationFrame render loop with damping

## Usage

### Basic Usage
```typescript
import { STEPViewer } from '@/components/STEPViewer';

<STEPViewer
  url="blob:http://localhost:5173/abc123"
  title="Assembly Name"
/>
```

### Props
| Prop | Type | Description |
|------|------|-------------|
| url | string | Blob URL to STEP file (required) |
| title | string | Optional display title |
| compact | boolean | Compact mode for smaller containers |

## File Storage

### Storage Structure
```
parts-cad/
  └── {tenant_id}/
      └── parts/
          └── {part_id}/
              ├── model_v1.step
              ├── assembly.stp
              └── ...
```

### Security
- Files stored in tenant-specific folders
- RLS policies restrict access to user's tenant only
- Signed URLs expire after 1 hour

## Performance Guidelines

### File Size
- **Maximum**: 50MB per file
- **Recommended**: Under 10MB for optimal performance
- **Large assemblies**: Consider splitting into sub-assemblies

### Memory Management
- Blob URLs revoked on dialog close
- Three.js geometries disposed on unmount
- Safe disposal with try-catch error handling

## Troubleshooting

### "Failed to load STEP parser library"
Check internet connection - occt-import-js CDN may be unreachable.

### "No geometry found in STEP file"
- Verify file is valid STEP format
- Check for corrupt or empty files
- Try re-exporting from CAD software

### Model appears off-center
Click "Fit to View" button to re-center.

### Parts not exploding
Explosion only works for assemblies with multiple parts. Single-part models cannot be exploded.

## References

- [Three.js Documentation](https://threejs.org/docs/)
- [occt-import-js GitHub](https://github.com/nicksrandall/occt-import-js)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
