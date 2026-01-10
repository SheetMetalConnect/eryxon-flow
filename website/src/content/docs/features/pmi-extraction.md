---
title: "PMI Extraction"
description: "Extract manufacturing annotations from STEP CAD files"
---

:::caution[Alpha Feature]
Currently in **ALPHA** - not recommended for production. Use the default browser-based [3D Viewer](/guides/3d-viewer/) for now.
:::

Extract Product Manufacturing Information (PMI) from STEP AP242 files with fallback support for AP203/AP214 legacy formats.

**Extracted annotations:** Dimensions, GD&T tolerances, datums, surface finishes (Ra/Rz), weld symbols, notes

## Architecture

Frontend (React + Three.js) → Backend (Python/FastAPI) → Text parser → 7 specialized extractors

Backend modes: `custom` (Eryxon3D Docker), `byob` (Bring Your Own), `frontend` (browser-only fallback)

## Extractors

| Extractor | Output |
|-----------|--------|
| Dimension | Linear, angular, diameter, radius |
| Tolerance | GD&T symbols with datum refs |
| Datum | Reference labels (A, B, C) |
| SurfaceFinish | Ra, Rz values |
| WeldSymbol | Fillet, groove, spot welds |
| AP203/AP214 | Graphical PMI for legacy files |

## GD&T Symbols (ASME Y14.5 / ISO 1101)

| Type | Symbol | Type | Symbol |
|------|--------|------|--------|
| Flatness | ⏥ | Perpendicularity | ⊥ |
| Circularity | ○ | Position | ⌖ |
| Cylindricity | ⌭ | Concentricity | ◎ |
| Profile (Surface) | ⌓ | Runout | ↗ |

**Modifiers:** Ⓜ (MMC), Ⓛ (LMC)

## Configuration

```bash
VITE_CAD_SERVICE_URL=http://localhost:8888
VITE_CAD_SERVICE_API_KEY=your-api-key
VITE_CAD_BACKEND_MODE=custom  # custom | byob | frontend
```

## Visualization

PMI overlay via CSS2DRenderer with leader lines. Color-coded by type:
- **Cyan:** Dimensions | **Purple:** GD&T | **Green:** Datums
- **Orange:** Surface | **Red:** Welds | **Slate:** Notes

## File Format Support

| Format | PMI Support |
|--------|-------------|
| STEP AP242 | ✅ Full semantic PMI |
| STEP AP214/AP203 | ⚠️ Graphical only |
| IGES | ❌ None |

## API

```http
POST /process
X-API-Key: your-api-key

{ "file_url": "...", "include_pmi": true }
```

Returns geometry meshes + PMI data (dimensions, tolerances, datums, surface finishes).

## Limitations

- PMI positions default to origin if no annotation placement data
- AP203/AP214 files contain graphical (presentation) PMI only
- Composite tolerances may not render all modifier symbols

See also: [3D Viewer Guide](/guides/3d-viewer/), [3D Engine Architecture](/architecture/3d-engine/)
