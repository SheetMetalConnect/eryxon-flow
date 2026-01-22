---
title: "3D CAD Engine"
description: "Overview of Eryxon Flow's 3D rendering architecture for STEP file visualization."
---

Eryxon Flow features a modern, browser-based 3D CAD viewing architecture designed specifically for the metals industry.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     STEPViewer Component                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Three.js   │  │ OrbitControls│  │  UI Components     │  │
│  │   Scene     │  │   Camera     │  │  (Design System)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    occt-import-js (WASM)                     │
│              OpenCASCADE STEP Parser via CDN                 │
└─────────────────────────────────────────────────────────────┘
```

## Client-Side Rendering (Default)

For production environments, we use **browser-based rendering** with zero server infrastructure required.

### Technology Stack
- **Three.js**: WebGL-based 3D rendering
- **occt-import-js**: WASM-compiled OpenCASCADE for STEP parsing
- **React**: Component architecture with hooks

### Capabilities
- STEP/STP file support
- Orbit, Zoom, Pan controls
- Exploded view for assemblies
- Wireframe and edge rendering
- Bounding box dimensions
- Assembly tree with part visibility

### File Structure
```
src/
├── components/
│   └── STEPViewer.tsx              # Main viewer component
├── lib/
│   └── step-viewer/
│       ├── constants.ts            # Rendering configuration
│       ├── types.ts                # TypeScript interfaces
│       └── dispose.ts              # Memory management
└── config/
    └── cadBackend.ts               # Backend configuration
```

## Rendering Pipeline

1. **Load**: Fetch STEP file as ArrayBuffer
2. **Parse**: occt-import-js converts to tessellated meshes
3. **Extract**: Part names and geometry from OCCT output
4. **Build**: Three.js BufferGeometry from mesh data
5. **Render**: Scene with lighting, materials, and controls

### Data Flow
```
STEP File → occt-import-js → Mesh Data → Three.js Geometry → WebGL Render
                              ↓
                         Part Names
                         Assembly Info
                         Edge Data
```

## Lighting Configuration

Following CAD visualization best practices:

| Light Type | Purpose | Settings |
|------------|---------|----------|
| HemisphereLight | Ambient fill | Sky: white, Ground: gray |
| DirectionalLight | Key light | Positioned relative to model size |

## Material System

Using MeshPhysicalMaterial for realistic metal appearance:

| Property | Value | Purpose |
|----------|-------|---------|
| metalness | 0.4 | Subtle metallic reflection |
| roughness | 0.8 | Matte finish typical of raw metal |
| side | DoubleSide | Correct rendering of thin walls |

## Performance Optimizations

### Memory Management
- Shared material instances (not duplicated per mesh)
- Safe disposal with try-catch error handling
- Proper cleanup on component unmount

### Rendering
- devicePixelRatio/1.5 for HiDPI displays
- Damped orbit controls (smooth interaction)
- RequestAnimationFrame render loop

### Edge Rendering
- CAD kernel edges when available (from B-Rep data)
- EdgesGeometry fallback for computed edges
- Configurable threshold angle (15 degrees)

## Backend Configuration

The system supports multiple backend modes configured in `cadBackend.ts`:

| Mode | Status | Use Case |
|------|--------|----------|
| `frontend` | **Active** | Browser-only processing (default) |
| `custom` | Planned | Docker-based CAD backend |
| `byob` | Planned | Bring Your Own Backend integration |

## PMI Support

**Current Status**: Not supported in client-side viewer.

PMI (Product Manufacturing Information) extraction requires server-side processing. Future options:

- Custom backend with STEP text parsing
- Integration with commercial engines (CAD Exchanger)
- FreeCAD server-side processing

## Engine Extensibility

Organizations with specific needs can integrate alternative engines:

- **FreeCAD**: Server-side processing node
- **CAD Exchanger**: Commercial multi-format support
- **Custom WASM**: Alternative geometry kernels

---

> **Status**: Eryxon Flow 0.1 BETA
> **Maintainer**: [Sheet Metal Connect e.U.](https://www.sheetmetalconnect.com/)
