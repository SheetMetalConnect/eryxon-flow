---
title: "PMI Extraction System"
description: "Documentation for PMI Extraction System"
---

Product Manufacturing Information (PMI) extraction from STEP AP242 files, with fallback support for AP203/AP214 legacy formats.

:::caution[Alpha Feature]
This feature is currently in **ALPHA** and is under active development. It is **not recommended for production use yet**.

We recommend using the default browser-based CAD engine for now.
:::
## Overview

The PMI extraction system enables extraction and 3D visualization of manufacturing annotations embedded in CAD files. This includes:

- **Dimensions** - Linear, angular, diameter, and radius measurements
- **Geometric Tolerances (GD&T)** - Form, orientation, location, and runout controls
- **Datums** - Reference features for tolerance specifications
- **Surface Finishes** - Roughness parameters (Ra, Rz, etc.)
- **Weld Symbols** - AWS A2.4 / ISO 2553 compliant symbols
- **Notes** - Text annotations and callouts
- **Graphical PMI** - Legacy presentation annotations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   STEPViewer    │  │ useCADProcessing│                   │
│  │   (Three.js +   │◄─│     (Hook)      │                   │
│  │   CSS2DRenderer)│  └────────┬────────┘                   │
│  └─────────────────┘           │                            │
│                                ▼                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   cadBackend.ts                         ││
│  │  Mode: 'custom' | 'byob' | 'frontend'                   ││
│  └─────────────────────────────────────────────────────────┘│
└────────────────────────────────┬────────────────────────────┘
                                 │ HTTP/JSON
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│               Backend (Python/FastAPI)                      │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   step_parser   │  │  pmi_extractors │                   │
│  │   (Text Parser) │─▶│  (7 Extractors) │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Backend Components

### 1. Step Parser (`step_parser.py`)

Direct text parsing of ISO 10303-21 (STEP Part 21) files.

**Key Features:**
- Regex-based entity extraction
- Entity graph traversal
- Reference resolution (#123 → entity)
- Statistics and validation

**Parsed Entity Types:**
```
DIMENSIONAL_SIZE, DIMENSIONAL_LOCATION, ANGULAR_LOCATION
GEOMETRIC_TOLERANCE, POSITION_TOLERANCE, FLATNESS_TOLERANCE
PERPENDICULARITY_TOLERANCE, SURFACE_PROFILE_TOLERANCE
DATUM, DATUM_FEATURE, DATUM_REFERENCE
PLUS_MINUS_TOLERANCE, LIMITS_AND_FITS
SURFACE_TEXTURE_REPRESENTATION
EXTERNALLY_DEFINED_SURFACE_SIDE_STYLE
DRAUGHTING_PRE_DEFINED_COLOUR
```

### 2. PMI Extractors (`pmi_extractors.py`)

Seven specialized extractors for different PMI types:

| Extractor | STEP Entities | Output |
|-----------|--------------|--------|
| `DimensionExtractor` | DIMENSIONAL_SIZE, DIMENSIONAL_LOCATION, ANGULAR_LOCATION | Linear, angular, diameter, radius dimensions |
| `ToleranceExtractor` | GEOMETRIC_TOLERANCE, *_TOLERANCE | GD&T symbols with datum refs |
| `DatumExtractor` | DATUM, DATUM_FEATURE | Datum labels (A, B, C) |
| `SurfaceFinishExtractor` | SURFACE_TEXTURE_REPRESENTATION | Ra, Rz values |
| `WeldSymbolExtractor` | EXTERNALLY_DEFINED_* | Fillet, groove, spot welds |
| `AP203AP214Extractor` | DRAUGHTING_*, ANNOTATION_* | Graphical PMI for legacy files |
| `AnnotationExtractor` | ANNOTATION_PLANE, DRAUGHTING_* | Position enrichment |

### 3. GD&T Symbol Mapping

Per ASME Y14.5 / ISO 1101:

| Tolerance Type | Symbol |
|---------------|--------|
| Flatness | ⏥ |
| Straightness | ⏤ |
| Circularity | ○ |
| Cylindricity | ⌭ |
| Profile (Line) | ⌒ |
| Profile (Surface) | ⌓ |
| Parallelism | ∥ |
| Perpendicularity | ⊥ |
| Angularity | ∠ |
| Position | ⌖ |
| Concentricity | ◎ |
| Symmetry | ⌯ |
| Circular Runout | ↗ |
| Total Runout | ↗↗ |

**Material Condition Modifiers:**
- Ⓜ - Maximum Material Condition (MMC)
- Ⓛ - Least Material Condition (LMC)
- (none) - Regardless of Feature Size (RFS)

## Frontend Components

### 1. CAD Backend Configuration (`src/config/cadBackend.ts`)

Centralized configuration for backend switching:

```typescript
type CADBackendMode = 'custom' | 'byob' | 'frontend';

// custom: Eryxon3D Docker backend (recommended)
// byob: Bring Your Own Backend (CAD Exchanger SDK, etc.)
// frontend: Browser-only via occt-import-js (fallback)
```

**Environment Variables:**
```bash
VITE_CAD_SERVICE_URL=http://localhost:8888
VITE_CAD_SERVICE_API_KEY=your-api-key
VITE_CAD_BACKEND_MODE=custom  # optional override
```

### 2. CAD Processing Hook (`src/hooks/useCADProcessing.ts`)

React hook for CAD processing and PMI management.

**PMI Data Types:**
```typescript
interface PMIData {
  version: string;
  source?: string;          // 'text_parser' | 'xcaf'
  schema?: string;          // 'AP242' | 'AP203/AP214'
  dimensions: PMIDimension[];
  geometric_tolerances: PMIGeometricTolerance[];
  datums: PMIDatum[];
  surface_finishes?: PMISurfaceFinish[];
  weld_symbols?: PMIWeldSymbol[];
  notes?: PMINote[];
  graphical_pmi?: PMIGraphical[];
  statistics?: PMIStatistics;
}
```

### 3. STEP Viewer Component (`src/components/STEPViewer.tsx`)

Three.js-based 3D viewer with PMI overlay.

**PMI Visualization:**
- CSS2DRenderer for labels positioned in 3D space
- Leader lines connecting labels to geometry
- Color-coded by PMI type:
  - Cyan: Dimensions
  - Purple: GD&T Tolerances
  - Green: Datums
  - Orange: Surface Finishes
  - Red: Weld Symbols
  - Slate: Notes
  - Indigo: Graphical PMI

**Filter Controls:**
- All / Dimensions / Tolerances / Datums / Surface / Welds / Notes / Legacy

## Supported File Formats

| Format | Schema | PMI Support |
|--------|--------|-------------|
| STEP AP242 | ISO 10303-242 | ✅ Full semantic PMI |
| STEP AP214 | ISO 10303-214 | ⚠️ Graphical PMI only |
| STEP AP203 | ISO 10303-203 | ⚠️ Graphical PMI only |
| IGES | - | ❌ No PMI |

## Test Data

NIST PMI test files located at: `services/eryxon3d/NIST-PMI-STEP-Files/`

Run batch test:
```bash
cd services/eryxon3d
python test_text_parser.py
```

**Test Results - AP242 Files (17 NIST files):**
- Success Rate: 100%
- Total Dimensions: 261
- Total Tolerances: 360
- Total Datums: 114
- Average Processing Time: ~1.3 seconds/file

**Test Results - AP203 Files with PMI (5 NIST files):**
- Success Rate: 100%
- Total Graphical Dimensions: 43
- Total Graphical Annotations: 60+ (FCF, datums, notes)
- Average Processing Time: ~0.8 seconds/file

## API Reference

### Process Endpoint

```http
POST /process
Content-Type: application/json
X-API-Key: your-api-key

{
  "file_url": "https://storage.example.com/part.stp",
  "file_name": "part.stp",
  "include_geometry": true,
  "include_pmi": true,
  "generate_thumbnail": false,
  "thumbnail_size": 256
}
```

**Response:**
```json
{
  "success": true,
  "geometry": {
    "meshes": [...],
    "bounding_box": {...},
    "total_vertices": 12345,
    "total_faces": 4567
  },
  "pmi": {
    "version": "2.0",
    "source": "text_parser",
    "schema": "AP242",
    "dimensions": [...],
    "geometric_tolerances": [...],
    "datums": [...],
    "surface_finishes": [...],
    "weld_symbols": [],
    "notes": [],
    "graphical_pmi": [],
    "statistics": {
      "dimension_count": 21,
      "tolerance_count": 6,
      "datum_count": 3,
      "surface_finish_count": 0,
      "weld_count": 0,
      "is_legacy_format": false
    }
  },
  "processing_time_ms": 1423
}
```

## Known Limitations

1. **Position Accuracy**: PMI positions are extracted from STEP annotation planes when available. For files without annotation placement data, positions default to origin (0, 0, 0).

2. **Legacy Format Support**: AP203/AP214 files only contain graphical (presentation) PMI, not semantic PMI. Dimension values may need to be parsed from text strings.

3. **Complex Tolerance Zones**: Composite tolerances and projected tolerance zones are extracted but may not fully render all modifier symbols.

4. **Weld Symbol Complexity**: Multi-pass welds and non-standard symbols may not be fully parsed.

## References

- Chen et al. (2025) "Three-Dimensional Visualization of PMI in a Web Browser"
- ISO 10303-242:2020 (STEP AP242 Ed. 2)
- ASME Y14.5-2018 (GD&T Standard)
- ISO 1101:2017 (Geometrical Tolerances)
- ISO 1302:2002 (Surface Texture Indication)
- AWS A2.4 / ISO 2553 (Welding Symbols)

## Changelog

### v2.0 (Current)
- Text-based parsing bypasses broken pythonocc bindings
- Added surface roughness symbol extraction
- Added weld symbol extraction
- Added AP203/AP214 legacy format support
- Configurable backend switching (custom/byob/frontend)
- 100% test coverage on NIST AP242 files

### v1.0 (Previous)
- XCAF-based extraction via pythonocc-core
- Limited to basic dimensions and tolerances
- Frequent crashes due to binding issues
