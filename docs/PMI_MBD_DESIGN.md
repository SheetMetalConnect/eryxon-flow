# PMI/MBD Viewer Integration Design

This document describes the design for adding PMI (Product Manufacturing Information) and MBD (Model-Based Definition) support to the Eryxon MES STEP viewer.

---

## 1. Current Architecture Analysis

### 1.1 STEP File Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CURRENT ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Upload                      Storage                    Frontend             │
│  ┌─────────┐                ┌─────────────┐            ┌──────────────────┐ │
│  │ Browser │──────────────► │  Supabase   │──────────► │   STEPViewer     │ │
│  │ Upload  │     POST       │  Storage    │  Signed    │   Component      │ │
│  └─────────┘                │ "parts-cad" │   URL      │  (occt-import-js)│ │
│                             └─────────────┘            └──────────────────┘ │
│                                                                              │
│  ❌ NO PMI EXTRACTION - occt-import-js only returns mesh geometry           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `STEPViewer.tsx` | `src/components/STEPViewer.tsx` | 1149-line Three.js viewer with dimension visualization |
| `occt-import-js` | CDN v0.0.23 | Browser STEP parser - **NO PMI SUPPORT** |
| File Upload | `src/hooks/useFileUpload.ts` | Upload handling with progress |
| Storage | Supabase bucket `parts-cad` | `{tenantId}/parts/{partId}/{fileName}` |
| Database | `parts.metadata` (JSON) | Available for PMI data storage |

### 1.3 The Problem

**`occt-import-js` does NOT extract PMI data.** It only returns tessellated geometry:

```typescript
// Current: src/components/STEPViewer.tsx:229
const result = occt.ReadStepFile(fileBuffer, null);
// result.meshes = [{ attributes: { position, normal }, index, color }]
// NO PMI, NO GD&T, NO tolerances
```

To extract PMI, we need:
- Full OpenCASCADE with XDE (Extended Data Exchange) modules
- `SetGDTMode(True)` on the STEP reader
- Access to `XCAFDoc_DimTolTool` for annotations

**This requires a backend service** — PMI extraction cannot run in the browser.

---

## 2. Proposed Architecture

### 2.1 High-Level Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROPOSED ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Upload         Storage              PMI Service           Frontend          │
│  ┌─────────┐   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
│  │ Browser │──►│  Supabase   │─────►│  Python      │─────►│ STEPViewer  │   │
│  │ Upload  │   │  Storage    │      │  pythonocc   │      │ + PMI Layer │   │
│  └─────────┘   └─────────────┘      │  Service     │      └─────────────┘   │
│                      │              └──────────────┘            ▲           │
│                      │                    │                     │           │
│                      │                    ▼                     │           │
│                      │              ┌──────────────┐            │           │
│                      └─────────────►│ parts.metadata│───────────┘           │
│                         Store PMI   │ (JSON field) │  Fetch PMI            │
│                                     └──────────────┘                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

1. **Upload Phase**
   - User uploads STEP file via existing `useFileUpload` hook
   - File stored in Supabase Storage

2. **PMI Extraction Phase** (NEW)
   - Trigger PMI extraction service after upload
   - Service downloads STEP file, extracts PMI using pythonocc
   - Returns JSON with dimensions, tolerances, GD&T, datums
   - Store JSON in `parts.metadata.pmi`

3. **Display Phase**
   - `STEPViewer` fetches PMI data from `parts.metadata`
   - Renders annotations as a separate layer in Three.js
   - Provides toggle control for PMI visibility

---

## 3. PMI Data Schema

### 3.1 JSON Structure

```typescript
interface PMIData {
  version: string;              // Schema version for future compatibility
  extractedAt: string;          // ISO timestamp
  source: {
    fileName: string;
    fileHash: string;           // For cache invalidation
    stepVersion: string;        // AP214, AP242, etc.
  };
  dimensions: Dimension[];
  geometricTolerances: GeometricTolerance[];
  datums: Datum[];
  annotations: Annotation[];    // Free-form text annotations
}

interface Dimension {
  id: string;
  type: 'linear' | 'angular' | 'radius' | 'diameter' | 'ordinate';
  value: number;
  unit: 'mm' | 'inch' | 'deg';
  tolerance?: {
    upper: number;
    lower: number;
    type: 'bilateral' | 'unilateral' | 'limit';
  };
  text: string;                 // Display text: "50.00 ±0.1"
  position: Vector3;            // 3D annotation position
  leaderPoints?: Vector3[];     // Leader line vertices
  associatedGeometry?: {
    faceIds: string[];          // For highlight on click
    edgeIds: string[];
  };
}

interface GeometricTolerance {
  id: string;
  type: 'flatness' | 'parallelism' | 'perpendicularity' | 'position' |
        'concentricity' | 'symmetry' | 'cylindricity' | 'circularity' |
        'straightness' | 'profile_line' | 'profile_surface' | 'runout' |
        'total_runout' | 'angularity';
  value: number;                // Tolerance zone value
  unit: 'mm' | 'inch';
  symbol: string;               // GD&T symbol character
  datumRefs: string[];          // Referenced datum IDs: ["A", "B"]
  modifiers?: string[];         // MMC, LMC, etc.
  text: string;                 // Full GD&T frame: "⌖ 0.05 Ⓜ A B"
  position: Vector3;
  leaderPoints?: Vector3[];
  associatedGeometry?: {
    faceIds: string[];
    edgeIds: string[];
  };
}

interface Datum {
  id: string;
  label: string;                // "A", "B", "C"
  position: Vector3;            // Position for datum triangle
  associatedGeometry: {
    faceIds: string[];
  };
}

interface Annotation {
  id: string;
  text: string;
  position: Vector3;
  style?: 'note' | 'callout' | 'flag';
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}
```

### 3.2 Database Storage

Store in `parts.metadata.pmi`:

```sql
UPDATE parts
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'),
  '{pmi}',
  $pmi_json
)
WHERE id = $part_id;
```

---

## 4. Backend Service Options

### 4.1 Option A: Python Microservice (Recommended)

A dedicated Python service using `pythonocc-core`.

**Pros:**
- pythonocc has complete OCCT XDE bindings
- Well-documented PMI extraction path
- Can run as Docker container
- Active community

**Cons:**
- Requires additional infrastructure
- Adds latency to upload flow

**Deployment Options:**
1. **Docker on Railway/Render** — Simple deployment
2. **AWS Lambda + Docker** — Serverless, pay-per-use
3. **Self-hosted** — Full control

### 4.2 Option B: Supabase Edge Function with WASM

Compile a minimal OCCT subset to WebAssembly.

**Pros:**
- Runs in existing Supabase infrastructure
- No additional services

**Cons:**
- OCCT XDE modules are complex to compile to WASM
- No existing WASM build with PMI support
- Significant development effort

### 4.3 Option C: Third-Party API

Use a commercial CAD processing API (e.g., CAD Exchanger Cloud API).

**Pros:**
- Ready-made solution
- Handles edge cases

**Cons:**
- Recurring cost per file
- External dependency
- Data leaves your infrastructure

### 4.4 Recommendation

**Start with Option A (Python Microservice)** because:
- Fastest path to working PMI extraction
- pythonocc has proven XDE support
- Can be deployed as a simple Docker container
- Keep control of data and processing

---

## 5. PMI Extraction Service Design

### 5.1 Service Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     PMI EXTRACTION SERVICE                      │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────────┐  │
│  │    FastAPI   │────►│   pythonocc  │────►│  JSON Output   │  │
│  │   Endpoint   │     │   Extractor  │     │                │  │
│  └──────────────┘     └──────────────┘     └────────────────┘  │
│         │                    │                     │            │
│         ▼                    ▼                     ▼            │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────────┐  │
│  │ Auth/Tenant  │     │  Error       │     │  Cache         │  │
│  │ Validation   │     │  Handling    │     │  (file hash)   │  │
│  └──────────────┘     └──────────────┘     └────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 API Endpoint

```
POST /api/pmi/extract
Authorization: Bearer {supabase_jwt}
Content-Type: application/json

Request:
{
  "fileUrl": "https://storage.supabase.co/.../model.step",
  "tenantId": "uuid",
  "partId": "uuid"
}

Response:
{
  "success": true,
  "pmi": { /* PMIData schema */ },
  "processingTimeMs": 1234
}
```

### 5.3 Core Extraction Logic (Python Pseudocode)

```python
from OCC.Core.STEPCAFControl import STEPCAFControl_Reader
from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.TCollection import TCollection_ExtendedString

def extract_pmi(step_file_path: str) -> dict:
    """Extract PMI from STEP AP242 file."""

    # Create XCAF document
    doc = TDocStd_Document(TCollection_ExtendedString("MDTV-XCAF"))

    # Read STEP with GDT mode enabled
    reader = STEPCAFControl_Reader()
    reader.SetGDTMode(True)  # CRITICAL: enables PMI import
    status = reader.ReadFile(step_file_path)

    if status != IFSelect_RetDone:
        raise ValueError("Failed to read STEP file")

    reader.Transfer(doc)

    # Get document tools
    main_label = doc.Main()
    dim_tol_tool = XCAFDoc_DocumentTool.DimTolTool(main_label)

    pmi_data = {
        "dimensions": [],
        "geometricTolerances": [],
        "datums": []
    }

    # Extract dimensions
    dim_labels = TDF_LabelSequence()
    dim_tol_tool.GetDimensionLabels(dim_labels)

    for i in range(dim_labels.Length()):
        label = dim_labels.Value(i + 1)
        dim = extract_dimension(label, dim_tol_tool)
        if dim:
            pmi_data["dimensions"].append(dim)

    # Extract geometric tolerances
    tol_labels = TDF_LabelSequence()
    dim_tol_tool.GetGeomToleranceLabels(tol_labels)

    for i in range(tol_labels.Length()):
        label = tol_labels.Value(i + 1)
        tol = extract_tolerance(label, dim_tol_tool)
        if tol:
            pmi_data["geometricTolerances"].append(tol)

    # Extract datums
    datum_labels = TDF_LabelSequence()
    dim_tol_tool.GetDatumLabels(datum_labels)

    for i in range(datum_labels.Length()):
        label = datum_labels.Value(i + 1)
        datum = extract_datum(label, dim_tol_tool)
        if datum:
            pmi_data["datums"].append(datum)

    return pmi_data
```

---

## 6. Frontend Integration

### 6.1 STEPViewer Enhancement

Add PMI rendering layer to existing `STEPViewer.tsx`:

```typescript
// New state
const [showPMI, setShowPMI] = useState(false);
const [pmiData, setPmiData] = useState<PMIData | null>(null);
const pmiLayerRef = useRef<THREE.Group | null>(null);

// New refs for CSS2DRenderer (optional) or use sprites
const css2dRendererRef = useRef<CSS2DRenderer | null>(null);
```

### 6.2 Rendering Approach

**Option A: CSS2DRenderer (HTML labels)**
- Text positioned in 3D space as HTML elements
- Best for crisp text at any zoom
- Requires second render pass

**Option B: Sprites (Three.js native)**
- Texture-based billboards
- Single render pass
- Slightly blurry at extreme zoom

**Recommendation:** Use **CSS2DRenderer** for annotation text (consistent with existing HTML overlay pattern) and **THREE.Line** for leader lines (matching existing dimension line implementation).

### 6.3 PMI Layer Structure

```typescript
const createPMILayer = (pmiData: PMIData) => {
  const group = new THREE.Group();
  group.name = 'pmiAnnotations';

  // Render dimensions
  pmiData.dimensions.forEach(dim => {
    // Leader line (THREE.Line)
    if (dim.leaderPoints) {
      const leaderGeom = new THREE.BufferGeometry()
        .setFromPoints(dim.leaderPoints.map(p => new THREE.Vector3(p.x, p.y, p.z)));
      const leaderLine = new THREE.Line(leaderGeom, leaderMaterial);
      group.add(leaderLine);
    }

    // Annotation label (CSS2DObject or HTML overlay)
    const label = createAnnotationLabel(dim.text, dim.position);
    group.add(label);
  });

  // Render GD&T
  pmiData.geometricTolerances.forEach(gdt => {
    const frame = createGDTFrame(gdt);
    group.add(frame);
  });

  // Render datums
  pmiData.datums.forEach(datum => {
    const triangle = createDatumTriangle(datum);
    group.add(triangle);
  });

  return group;
};
```

### 6.4 Control Panel Addition

Add PMI toggle to existing toolbar:

```tsx
<div className="w-px h-4 bg-border mx-0.5" />

<Button
  variant="ghost"
  size="sm"
  onClick={togglePMI}
  disabled={stepLoading || !pmiData}
  className={cn("h-7 w-7 p-0", showPMI && "bg-primary/20 text-primary")}
  title={showPMI ? t('parts.cadViewer.hidePMI') : t('parts.cadViewer.showPMI')}
>
  <Crosshair className="h-3.5 w-3.5" />  {/* Or appropriate icon */}
</Button>
```

### 6.5 New Translations

Add to `src/i18n/locales/{lang}/jobs.json`:

```json
"cadViewer": {
  "pmi": "PMI Annotations",
  "showPMI": "Show PMI",
  "hidePMI": "Hide PMI",
  "dimensions": "Dimensions",
  "tolerances": "Tolerances",
  "datums": "Datums",
  "noPMI": "No PMI data available",
  "extractingPMI": "Extracting PMI..."
}
```

---

## 7. Integration with Existing Patterns

### 7.1 React Query Hook

```typescript
// src/hooks/usePMI.ts
export function usePMI(partId: string | undefined) {
  return useQuery({
    queryKey: ['pmi', partId],
    queryFn: async () => {
      if (!partId) return null;

      const { data: part, error } = await supabase
        .from('parts')
        .select('metadata')
        .eq('id', partId)
        .single();

      if (error) throw error;
      return part.metadata?.pmi as PMIData | null;
    },
    enabled: !!partId,
  });
}
```

### 7.2 PMI Extraction Trigger

Add to upload flow in `PartDetailModal.tsx`:

```typescript
const triggerPMIExtraction = async (partId: string, filePath: string) => {
  // Only for STEP files
  if (!filePath.match(/\.(step|stp)$/i)) return;

  const response = await fetch('/api/pmi/extract', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({ partId, filePath })
  });

  if (response.ok) {
    queryClient.invalidateQueries({ queryKey: ['pmi', partId] });
  }
};
```

---

## 8. GD&T Symbol Rendering

### 8.1 Symbol Font

Use a GD&T-compatible font or SVG sprites for proper symbol display:

| Symbol | Unicode | Name |
|--------|---------|------|
| ⌖ | U+2316 | Position |
| ⏥ | U+23E5 | Flatness |
| ∥ | U+2225 | Parallelism |
| ⊥ | U+22A5 | Perpendicularity |
| ○ | U+25CB | Circularity |
| ⌭ | U+232D | Cylindricity |
| ⌓ | U+2313 | Profile of a line |
| ⌔ | U+2314 | Profile of a surface |
| ↗ | U+2197 | Runout (circular) |
| ⊚ | U+229A | Concentricity |

### 8.2 Feature Control Frame Layout

```
┌─────────────────────────────────────┐
│  ⌖  │  0.05  │ Ⓜ │  A  │  B  │  C  │
└─────────────────────────────────────┘
  ↑        ↑     ↑     ↑     ↑     ↑
Symbol  Value  MMC  Datum Datum Datum
```

Implement as an HTML element styled with CSS grid for proper alignment.

---

## 9. Geometry Highlighting

### 9.1 Click Interaction

When user clicks a PMI annotation, highlight associated geometry:

```typescript
const handlePMIClick = (annotation: Dimension | GeometricTolerance) => {
  // Clear previous highlights
  clearHighlights();

  // Highlight associated faces
  annotation.associatedGeometry?.faceIds.forEach(faceId => {
    highlightFace(faceId);
  });
};

const highlightFace = (faceId: string) => {
  // Find mesh by face ID (requires face ID mapping during load)
  // Apply emissive highlight material
  const material = mesh.material as THREE.MeshStandardMaterial;
  material.emissive = new THREE.Color(0x4a9eff);
  material.emissiveIntensity = 0.3;
};
```

### 9.2 Face ID Mapping

The PMI service must also provide a face ID map that correlates STEP face identifiers to Three.js mesh indices.

---

## 10. Implementation Phases

### Phase 1: PMI Service MVP
- [ ] Set up Python service with FastAPI
- [ ] Implement basic dimension extraction
- [ ] Deploy as Docker container
- [ ] Create API endpoint for extraction trigger

### Phase 2: Frontend Integration
- [ ] Add PMI data fetching hook
- [ ] Implement basic annotation rendering (text labels + leader lines)
- [ ] Add PMI toggle to toolbar
- [ ] Add translations

### Phase 3: GD&T Support
- [ ] Implement geometric tolerance extraction
- [ ] Create GD&T frame component
- [ ] Add datum triangle rendering
- [ ] Style with proper GD&T fonts/symbols

### Phase 4: Interactivity
- [ ] Add geometry highlighting on annotation click
- [ ] Add annotation hover tooltips
- [ ] Add annotation list panel

### Phase 5: Polish
- [ ] Optimize rendering performance
- [ ] Add annotation grouping/filtering
- [ ] Add export functionality
- [ ] Write documentation

---

## 11. Testing Strategy

### 11.1 Test Files

Use NIST PMI test cases from:
- https://www.mbx-if.org/cax/cax_step.php
- Files: `nist_ctc_01_*.stp` through `nist_ctc_05_*.stp`

Each test case has validation spreadsheets to verify extraction accuracy.

### 11.2 Test Cases

1. **Dimension extraction** — Verify all dimension types and tolerances
2. **GD&T extraction** — Verify all tolerance types and datum references
3. **Position accuracy** — Verify annotation positions match CAD
4. **Edge cases** — Empty PMI, malformed data, non-AP242 files

---

## 12. Questions for Approval

Before implementation, please confirm:

1. **Backend deployment preference:**
   - Docker on Railway/Render? (simplest)
   - Docker on existing infrastructure?
   - AWS Lambda?

2. **Processing trigger:**
   - Sync (block upload until PMI extracted)?
   - Async (background job, show "extracting" state)?

3. **Caching strategy:**
   - Re-extract on every file upload?
   - Cache based on file hash?

4. **Fallback behavior:**
   - If PMI extraction fails, show error? Hide toggle?
   - If file has no PMI, show "No PMI available"?

5. **Priority for annotation types:**
   - Start with dimensions only?
   - Include GD&T from the start?
   - Include datums from the start?

---

## 13. Summary

This design adds MBD support to the STEP viewer through:

1. **New Python microservice** — Extracts PMI using pythonocc-core
2. **JSON data schema** — Stores annotations in `parts.metadata.pmi`
3. **Enhanced STEPViewer** — Renders PMI layer with toggle control
4. **Existing patterns** — Follows established UI and data patterns

The main architectural change is adding a backend processing step for STEP files, since PMI extraction cannot be done in the browser with current tools.

---

*Awaiting approval before implementation.*
