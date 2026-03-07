# Implementation Plan: Interactive 3D Viewer Measurements (v2 - Revised)

## Overview

Add interactive measurement tools to the STEPViewer that let users click on model geometry to measure distances, lengths, and angles. This fills the gap between the existing bounding-box overlay (overall X/Y/Z) and the read-only PMI data (which depends on STEP file metadata that many files lack).

---

## Current State (from code review)

**STEPViewer.tsx** (1,872 lines) is a monolithic component with:

| What exists | Where in code | Gap |
|---|---|---|
| Bounding box dims (X/Y/Z overlay) | Lines 720-889, 1719-1789 | Only overall envelope |
| PMI visualization (7 types) | Lines 1167-1518 | Read-only, depends on file metadata |
| CSS2DRenderer for labels | Line 255, `css2dRendererRef` | Already set up, reusable |
| OrbitControls on canvas | Line 249, `controlsRef` | Needs click/drag disambiguation |
| `meshesRef` (all loaded meshes) | Line 92 | Ready for raycasting |
| EdgesGeometry (30 deg threshold) | Lines 450-475 area | Edge data available for edge selection |
| `pointerEvents: 'none'` on CSS2D layer | Line 260 | Clicks go through to WebGL canvas -- good |

**Key constraint**: STEPViewer is already 1,872 lines. All measurement logic must be extracted into separate files to avoid making it worse.

**No existing** `src/components/viewer/` directory. We create it fresh.

---

## Measurement Modes

### Mode 1: Point-to-Point Distance
**Use cases**: width of a bar, length of a tube, hole-to-hole spacing, slot dimensions
**Interaction**: Click point A -> click point B -> show distance
**Display**: Marker dots + dashed line + CSS2D label at midpoint ("127.4 mm")

### Mode 2: Face-to-Face Distance (Thickness / Gap)
**Use cases**: Wall thickness, gap between parallel planes, plate thickness
**Interaction**: Click face A -> click face B -> show perpendicular distance
**Display**: Arrow between highlighted faces + distance label

### Mode 3: Angle Between Faces
**Use cases**: Sheet metal bend angle, V-groove angle, chamfer angle
**Interaction**: Click face A -> click face B -> show angle
**Display**: Arc glyph at intersection + angle label ("90.0 deg")

### Mode 4: Radius / Diameter
**Use cases**: Hole diameter, fillet radius, bend inner radius
**Interaction**: Click on curved surface -> detect curvature -> show R or D
**Display**: Dimension line with "R 5.0 mm" or "D 10.0 mm"

---

## Architecture

### New File Structure

```
src/components/viewer/
  measurements/
    types.ts                   # Types: MeasurementMode, MeasurementResult, SnapTarget
    useMeasurementMode.ts      # Hook: mode state machine + results array
    useRaycastPicker.ts        # Hook: raycaster, snap logic, hover preview
    computations.ts            # Pure fns: distance, angle, radius fitting
    MeasurementAnnotations.ts  # Three.js render helpers: lines, arcs, labels
    MeasurementToolbar.tsx     # React toolbar buttons for mode selection
    MeasurementPanel.tsx       # React panel listing active measurements
```

### Modified Files

```
src/components/STEPViewer.tsx        # ~50 lines added: wire in hooks + toolbar
src/i18n/locales/en/jobs.json        # Translation keys
src/i18n/locales/nl/jobs.json        # Translation keys
src/i18n/locales/de/jobs.json        # Translation keys
```

### Integration Points in STEPViewer.tsx

The hooks need access to these existing refs:

| Ref | Type | Used for |
|---|---|---|
| `containerRef` | `HTMLDivElement` | Attach pointer event listeners |
| `sceneRef` | `THREE.Scene` | Add/remove measurement objects |
| `cameraRef` | `THREE.PerspectiveCamera` | Raycaster unprojection |
| `rendererRef` | `THREE.WebGLRenderer` | Get canvas size for NDC coords |
| `meshesRef` | `THREE.Mesh[]` | Raycast targets |
| `controlsRef` | `OrbitControls` | Temporarily disable on measurement click |
| `css2dRendererRef` | `CSS2DRenderer` | Already rendering labels |

---

## Detailed Implementation

### Phase 1: Point-to-Point Distance (MVP)

#### 1.1 Types (`types.ts`)

```typescript
import * as THREE from 'three';

export type MeasurementMode = 'none' | 'point-to-point' | 'face-distance' | 'face-angle' | 'radius';

export type SnapType = 'vertex' | 'edge' | 'face';

export interface SnapTarget {
  point: THREE.Vector3;       // World-space snapped position
  type: SnapType;
  mesh: THREE.Mesh;
  faceIndex: number;
  normal: THREE.Vector3;      // Face normal at hit point
}

export interface PointToPointResult {
  id: string;
  type: 'point-to-point';
  pointA: THREE.Vector3;
  pointB: THREE.Vector3;
  distance: number;           // mm (model units)
}

export interface FaceDistanceResult {
  id: string;
  type: 'face-distance';
  faceA: { point: THREE.Vector3; normal: THREE.Vector3 };
  faceB: { point: THREE.Vector3; normal: THREE.Vector3 };
  distance: number;
  isParallel: boolean;
}

export interface FaceAngleResult {
  id: string;
  type: 'face-angle';
  faceA: { point: THREE.Vector3; normal: THREE.Vector3 };
  faceB: { point: THREE.Vector3; normal: THREE.Vector3 };
  angleDeg: number;          // Included angle
  bendAngleDeg: number;      // 180 - included (for sheet metal)
  intersectionPoint: THREE.Vector3;
}

export interface RadiusResult {
  id: string;
  type: 'radius';
  center: THREE.Vector3;
  radius: number;
  diameter: number;
  confidence: number;        // 0-1 fit quality
}

export type MeasurementResult =
  | PointToPointResult
  | FaceDistanceResult
  | FaceAngleResult
  | RadiusResult;
```

#### 1.2 Raycaster Hook (`useRaycastPicker.ts`)

**Core responsibility**: Convert mouse position to a SnapTarget on the model.

```typescript
// Inputs: containerRef, cameraRef, meshesRef
// Outputs: currentSnap (reactive), castRay(event) -> SnapTarget | null

function useRaycastPicker(
  containerRef: RefObject<HTMLDivElement>,
  cameraRef: RefObject<THREE.PerspectiveCamera>,
  meshesRef: RefObject<THREE.Mesh[]>,
  active: boolean  // only raycast when a measurement mode is active
)
```

**Snap priority logic**:

1. Raycast against `meshesRef.current` -> get `intersection`
2. From `intersection.face`, get the 3 vertex positions via `geometry.attributes.position` + index buffer
3. Find closest vertex to `intersection.point` within screen-space threshold (5px)
4. If vertex found -> snap type = `'vertex'`, show dot indicator
5. Else find closest edge (project point onto each of the 3 triangle edges) within threshold
6. If edge found -> snap type = `'edge'`, show edge highlight
7. Else -> snap type = `'face'`, use raw intersection point

**Screen-space threshold calculation**:
```typescript
// Convert world distance to screen pixels
const worldPoint = vertex.clone();
worldPoint.project(camera);
const screenX = (worldPoint.x + 1) / 2 * container.clientWidth;
// Compare pixel distance to threshold (5px)
```

**Hover preview**: Render a small `THREE.SphereGeometry(1.5)` at the snap point, colored by snap type:
- Vertex: orange dot
- Edge: cyan line highlight
- Face: green ring

#### 1.3 Measurement State Machine (`useMeasurementMode.ts`)

```typescript
// State transitions:
// 'none' -> user clicks toolbar -> 'selecting_first'
// 'selecting_first' -> user clicks model -> 'selecting_second' (stores pointA)
// 'selecting_second' -> user clicks model -> creates result, back to 'selecting_first' (ready for next)
// Any state -> ESC or toolbar toggle -> 'none' (clears in-progress)

interface MeasurementState {
  mode: MeasurementMode;
  phase: 'none' | 'selecting_first' | 'selecting_second';
  pendingPoint: SnapTarget | null;  // First selection, waiting for second
  results: MeasurementResult[];
}
```

**Click vs. Drag discrimination**:
This is critical because OrbitControls uses the same canvas for rotation.

```typescript
// On pointerdown: record timestamp + position
// On pointerup: if elapsed < 200ms AND distance < 5px -> it's a click -> handle measurement
// Otherwise -> it was a drag -> let OrbitControls handle it (it already did)
```

This is better than disabling OrbitControls because the user can still orbit while measuring.

#### 1.4 Annotation Rendering (`MeasurementAnnotations.ts`)

For each `PointToPointResult`, add to a `THREE.Group` named `'measurementAnnotations'`:

```
Point A marker (SphereGeometry r=1.5, orange MeshBasicMaterial)
Point B marker (same)
Dashed line A->B (LineDashedMaterial, color: #4a9eff, dashSize: 3, gapSize: 2)
CSS2DObject at midpoint:
  <div style="background: rgba(0,0,0,0.8); color: white; padding: 2px 8px;
              border-radius: 4px; font-size: 11px; font-family: monospace;">
    127.38 mm
    <button style="margin-left: 6px; opacity: 0.6;">x</button>
  </div>
```

The CSS2D label reuses the same pattern as the existing PMI labels (backdrop blur, small font) but with a distinct dark background to differentiate user measurements from file metadata.

**Live preview line**: While `phase === 'selecting_second'`, render a thin line from `pendingPoint` to `currentSnap` that updates on mouse move. Use `THREE.LineBasicMaterial` with low opacity.

#### 1.5 Toolbar Integration (`MeasurementToolbar.tsx`)

Add a new button group after the existing PMI toggle (line ~1709 in STEPViewer.tsx):

```tsx
// After the PMI section, add:
<div className="w-px h-4 bg-border mx-0.5" />
<MeasurementToolbar
  mode={measurementMode}
  onModeChange={setMeasurementMode}
  onClearAll={clearAllMeasurements}
  measurementCount={measurements.length}
  disabled={stepLoading || meshesRef.current.length === 0}
/>
```

Buttons follow the same `h-7 w-7 p-0` ghost style as existing toolbar buttons:
- **Move** icon (lucide `Move`): Point-to-point mode
- **Trash2** icon: Clear all measurements (only visible when count > 0)

Active state uses `bg-amber-500/20 text-amber-600` to distinguish from the blue/cyan used by other toggles.

#### 1.6 Status Bar

When a measurement mode is active, show a floating instruction bar at the bottom of the viewport:

```tsx
{measurementMode !== 'none' && (
  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
    <div className="glass-card px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
      <Move className="h-3.5 w-3.5 text-amber-500" />
      {phase === 'selecting_first'
        ? t('parts.cadViewer.measurements.selectFirstPoint')
        : t('parts.cadViewer.measurements.selectSecondPoint')}
      <kbd className="text-[10px] bg-muted px-1 rounded">ESC</kbd>
    </div>
  </div>
)}
```

---

### Phase 2: Face Selection & Face-to-Face Distance

#### 2.1 Face Selection via Coplanar Flood Fill

When in `face-distance` or `face-angle` mode, clicking selects an entire logical face (not just one triangle).

**Algorithm**:
1. Raycaster hits triangle at `faceIndex`
2. Get the face normal from `geometry.attributes.normal` (average of 3 vertex normals)
3. Flood fill: BFS from hit triangle to adjacent triangles (sharing an edge) with normal difference < 5 degrees
4. Collect all triangle indices that belong to this logical face
5. Highlight by adding a semi-transparent overlay mesh using the same geometry but with `THREE.MeshBasicMaterial({ color: 0x4a9eff, opacity: 0.3, transparent: true, side: THREE.DoubleSide })`
6. Compute average normal and centroid of the selected face group

**Adjacency building** (done once on model load):
```typescript
// Build edge -> face adjacency map from index buffer
// For each triangle, hash its 3 edges (sorted vertex pair)
// Two triangles sharing an edge are adjacent
type EdgeKey = string; // `${min(v1,v2)}_${max(v1,v2)}`
const edgeToFaces: Map<EdgeKey, number[]>;
```

This is O(n) where n = triangle count. For a typical part (~50K triangles), takes <10ms.

#### 2.2 Face-to-Face Distance (`computations.ts`)

```typescript
function computeFaceDistance(
  faceA: { centroid: Vector3; normal: Vector3 },
  faceB: { centroid: Vector3; normal: Vector3 }
): { distance: number; isParallel: boolean } {
  const normalDot = Math.abs(faceA.normal.dot(faceB.normal));
  const isParallel = normalDot > 0.996; // < ~5 degrees

  if (isParallel) {
    // Project centroid of A onto plane of B
    const d = faceB.normal.dot(faceB.centroid);
    const dist = Math.abs(faceA.normal.dot(faceA.centroid) - d);
    return { distance: dist, isParallel: true };
  } else {
    // Non-parallel: use centroid-to-centroid distance
    return { distance: faceA.centroid.distanceTo(faceB.centroid), isParallel: false };
  }
}
```

**Annotation**: Arrow between the two face centroids + distance label. For parallel faces, show perpendicular projection line.

---

### Phase 3: Angle Measurement & Radius/Diameter

#### 3.1 Angle Between Faces

**Computation**:
```typescript
function computeFaceAngle(normalA: Vector3, normalB: Vector3): {
  includedAngle: number;  // degrees
  bendAngle: number;      // 180 - included (sheet metal convention)
} {
  const dot = normalA.dot(normalB);
  const clamped = Math.max(-1, Math.min(1, dot));
  const includedAngle = Math.acos(clamped) * (180 / Math.PI);
  return {
    includedAngle,
    bendAngle: 180 - includedAngle
  };
}
```

**Sheet metal bend detection heuristic**:
When two flat faces are selected and they're connected by a narrow curved face region:
1. After selecting face A and face B, check if there's a strip of curved triangles between them
2. If yes, auto-label as "Bend" with both the bend angle and the bend radius
3. The bend radius can be estimated from the curved strip's curvature

**Annotation**:
- Arc drawn at the geometric intersection of the two planes
- Label showing angle: "90.0 deg" (and optionally "Bend: 90.0 deg, R: 3.0 mm")
- Arc rendered as a `THREE.Line` with points sampled along a circular arc

#### 3.2 Radius / Diameter Detection

**Algorithm** (least-squares circle fit on curved face):

1. Select a curved face (flood fill stops at sharp normal changes)
2. Collect all vertex positions from selected triangles
3. Project points onto the plane perpendicular to the cylinder axis
   - Estimate axis as the direction of least variance in normals
4. Fit a circle to the 2D projected points (algebraic circle fit - Kasa method)
5. Compute fit residual; if < 2% of radius -> good fit -> show R and D

```typescript
function fitCircle2D(points: Vector2[]): {
  center: Vector2;
  radius: number;
  residual: number; // average distance error
} {
  // Kasa method: minimize sum of (x^2 + y^2 - 2*cx*x - 2*cy*y - (r^2 - cx^2 - cy^2))^2
  // Reduces to linear system Ax = b
  const n = points.length;
  let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;
  let sumX3 = 0, sumY3 = 0, sumX2Y = 0, sumXY2 = 0;
  // ... standard linear algebra
}
```

**Annotation**: Dimension line across the diameter with "R 5.0 mm" or "D 10.0 mm" label.

---

### Phase 4: Polish & Persistence

#### 4.1 Measurement Panel (`MeasurementPanel.tsx`)

Collapsible panel anchored to the right side (similar to the existing dimensions overlay):

```tsx
<div className="absolute top-3 right-3 z-10 w-[220px]">
  <div className="glass-card p-3">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold">{t('...measurements.title')}</span>
      <span className="text-[10px] text-muted-foreground">{results.length}</span>
    </div>
    {results.map(r => (
      <div key={r.id} className="flex items-center justify-between py-1 border-t border-border/30">
        <TypeIcon type={r.type} />
        <span className="text-xs font-mono">{formatValue(r)}</span>
        <button onClick={() => remove(r.id)}>
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    ))}
  </div>
</div>
```

#### 4.2 Keyboard Shortcuts

| Key | Action |
|---|---|
| `M` | Toggle measurement mode (point-to-point) |
| `Escape` | Cancel current measurement / exit mode |
| `Backspace` | Remove last measurement |

Keep it minimal - avoid conflicting with browser shortcuts.

#### 4.3 Interaction with Existing Features

| Feature | Behavior |
|---|---|
| **Exploded view** | Clear all measurements when explosion factor changes (positions shift) |
| **Wireframe mode** | Measurements still work (raycast against mesh geometry regardless of material) |
| **Feature highlighting** | Coexists; measurement highlights override feature colors on selected faces |
| **PMI overlay** | Both use CSS2DRenderer; measurement labels get higher z-index |
| **Dimension bounding box** | Independent feature; both can be active simultaneously |

#### 4.4 Persistence (Future)

- Supabase table: `part_measurements` (part_id, user_id, tenant_id, measurement_json, created_at)
- Save/load on viewer open
- Not in MVP scope

---

## Technical Risks & Mitigations

### Risk 1: Tessellation Accuracy
**Problem**: Measurements on triangulated mesh may differ from true B-rep geometry.
**Mitigation**:
- Display "Measured from mesh" indicator (like existing "measuredFromCad" label)
- Straight edges and flat faces are exact
- For curves: accuracy is typically within 0.1mm for default tessellation
- Future: request finer tessellation from server backend for measurement mode

### Risk 2: Click/Drag Confusion
**Problem**: Users accidentally create measurement points when trying to rotate.
**Mitigation**:
- Strict threshold: click must be <200ms AND <5px movement
- Visual: cursor changes to crosshair in measurement mode
- ESC always cancels and returns to orbit-only mode
- Clear mode indicator in toolbar (amber highlight)

### Risk 3: Performance on Complex Models
**Problem**: Per-frame raycasting and vertex snapping could be slow on 100K+ triangle models.
**Mitigation**:
- Only raycast when measurement mode is active (no cost in normal viewing)
- Use `Raycaster` with `firstHitOnly: true` (Three.js r163+)
- Build adjacency map lazily (only when face selection mode is first activated)
- For vertex snap: if model has >100K vertices, skip vertex snap and only use face snap
- Future: add `three-mesh-bvh` for O(log n) raycasting

### Risk 4: STEPViewer Already Too Large
**Problem**: 1,872 lines is already pushing maintainability limits.
**Mitigation**:
- All measurement logic in separate files under `src/components/viewer/measurements/`
- STEPViewer only adds: state declaration (~5 lines), hook calls (~10 lines), toolbar JSX (~15 lines), status bar JSX (~15 lines), cleanup (~5 lines)
- Total STEPViewer additions: ~50 lines

---

## Phased Delivery

| Phase | Scope | Estimated Complexity | Dependencies |
|---|---|---|---|
| **Phase 1** | Point-to-point distance | Medium | None |
| **Phase 2** | Face selection + face-to-face distance | Medium-High | Phase 1 (raycaster) |
| **Phase 3** | Angle measurement + radius/diameter | High | Phase 2 (face selection) |
| **Phase 4** | Panel, shortcuts, persistence | Low-Medium | Phase 1-3 |

**Phase 1 is the MVP** and delivers immediate value for the most common use case (measuring a width, length, or distance between two points on a part).

---

## Translation Keys

Add to `parts.cadViewer.measurements` in `en/jobs.json`, `nl/jobs.json`, `de/jobs.json`:

| Key | EN | NL | DE |
|---|---|---|---|
| `title` | Measurements | Metingen | Messungen |
| `pointToPoint` | Distance | Afstand | Abstand |
| `faceDistance` | Thickness | Dikte | Dicke |
| `angle` | Angle | Hoek | Winkel |
| `radius` | Radius | Straal | Radius |
| `diameter` | Diameter | Diameter | Durchmesser |
| `bendAngle` | Bend Angle | Buighoek | Biegewinkel |
| `selectFirstPoint` | Click first point | Klik eerste punt | Ersten Punkt anklicken |
| `selectSecondPoint` | Click second point | Klik tweede punt | Zweiten Punkt anklicken |
| `selectFirstFace` | Click first face | Klik eerste vlak | Erste Flache anklicken |
| `selectSecondFace` | Click second face | Klik tweede vlak | Zweite Flache anklicken |
| `clearAll` | Clear All | Alles wissen | Alle loschen |
| `meshDisclaimer` | Measured from mesh | Gemeten van mesh | Vom Netz gemessen |

---

## Dependencies

**No new npm packages required.** Everything uses existing Three.js APIs:
- `THREE.Raycaster` - intersection testing
- `THREE.LineDashedMaterial` - measurement lines
- `THREE.SphereGeometry` - snap point indicators
- `CSS2DObject` - measurement labels (already imported)
- `THREE.BufferGeometry` index/position attributes - vertex/edge snap

**Optional future**: `three-mesh-bvh` for accelerated raycasting on large models.
