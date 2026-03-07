# Implementation Plan: Interactive 3D Viewer Measurements

## Overview

Add interactive measurement tools to the STEPViewer that allow users to select points, edges, and faces on CAD models to measure distances, lengths, and angles directly in the 3D viewport. This goes beyond the current bounding-box dimensions and read-only PMI data by giving users hands-on measurement capabilities.

---

## Current State

| Capability | Status | Limitation |
|---|---|---|
| Bounding box dimensions (X/Y/Z) | Exists | Only overall envelope, not specific features |
| PMI visualization (dims, tolerances) | Exists | Read-only from STEP metadata; not all files contain PMI |
| Interactive point picking | Missing | No raycasting for user-selected points |
| Point-to-point distance | Missing | Cannot measure width of a bar, length of a tube |
| Angle measurement | Missing | Cannot measure bend angles on sheet metal |
| Face/plane selection | Missing | Cannot select surfaces for reference |

---

## Proposed Measurement Modes

### 1. Point-to-Point Distance
- **Use case**: Measure width of a bar, length of a tube, hole-to-hole spacing
- **Interaction**: Click point A on model surface, click point B -> display linear distance
- **Display**: Dashed leader line between points + distance label in mm

### 2. Edge Length
- **Use case**: Measure length of a specific edge (milled edge, tube segment)
- **Interaction**: Hover to highlight edge, click to select -> display edge length
- **Display**: Highlighted edge + length label

### 3. Face-to-Face Distance (Thickness)
- **Use case**: Measure wall thickness, gap between parallel planes
- **Interaction**: Click face A, click face B -> display minimum or perpendicular distance
- **Display**: Arrow between faces + distance label

### 4. Angle Between Faces
- **Use case**: Measure bend angle on sheet metal, angle between intersecting surfaces
- **Interaction**: Click face A, click face B -> display angle between normals
- **Display**: Arc annotation + angle in degrees

### 5. Radius / Diameter
- **Use case**: Measure hole diameter, fillet radius, bend radius
- **Interaction**: Click on cylindrical or curved face -> display radius/diameter
- **Display**: Dimension line with R or D prefix

---

## Architecture

### New Files

```
src/components/viewer/
  MeasurementToolbar.tsx       # Toolbar UI for selecting measurement mode
  MeasurementOverlay.tsx       # CSS2D overlay for measurement results
  measurements/
    types.ts                   # Shared types (MeasurementMode, MeasurementResult, etc.)
    useRaycaster.ts            # Hook: raycasting + snap-to-vertex/edge/face logic
    useMeasurements.ts         # Hook: state machine for measurement workflow
    pointToPoint.ts            # Pure fn: compute distance between two 3D points
    edgeLength.ts              # Pure fn: compute length of a selected edge
    faceDistance.ts             # Pure fn: compute distance between two faces
    faceAngle.ts               # Pure fn: compute angle between two face normals
    radiusDiameter.ts          # Pure fn: detect curvature, compute R/D
    renderAnnotations.ts       # Three.js helpers: draw dimension lines, arcs, labels
```

### Modified Files

```
src/components/STEPViewer.tsx          # Wire in measurement system
src/i18n/locales/en/jobs.json         # Translation keys
src/i18n/locales/nl/jobs.json         # Translation keys
src/i18n/locales/de/jobs.json         # Translation keys
```

---

## Detailed Implementation Plan

### Phase 1: Core Raycasting & Point-to-Point (MVP)

**Goal**: Users can click two points on the model and see the distance.

#### 1.1 Raycasting Infrastructure (`useRaycaster.ts`)

- Set up `THREE.Raycaster` on the STEPViewer canvas
- On mouse move: cast ray, find intersection with model meshes
- Snap logic (priority order):
  1. **Vertex snap**: If intersection is within threshold of a mesh vertex, snap to it
  2. **Edge snap**: If near an edge midpoint or along an edge, snap to edge
  3. **Face snap**: Default to exact intersection point on the face
- Visual feedback: render a small sphere/crosshair at the snap point
- Store the intersected face index and mesh reference for later use

**Key considerations**:
- Use `raycaster.intersectObjects(meshes, true)` for recursive scene traversal
- For vertex snapping, access `geometry.attributes.position` and find nearest vertex to intersection point within a configurable threshold (e.g. 2mm or 5px screen-space)
- Edge snapping requires iterating the face's edges (from index buffer) and projecting the intersection onto each edge segment
- Show snap indicator type (vertex = dot, edge = line segment highlight, face = ring)

#### 1.2 Measurement State Machine (`useMeasurements.ts`)

States:
```
idle -> selecting_first_point -> selecting_second_point -> measurement_complete
                                                              |
                                                              v
                                                         idle (reset)
```

- `idle`: No measurement in progress. Cursor is default.
- `selecting_first_point`: Measurement mode active. Next click sets point A.
- `selecting_second_point`: Point A set. Next click sets point B. Show live preview line from A to cursor.
- `measurement_complete`: Both points set. Display result. User can start new measurement or clear.

Store measurement results in an array so multiple measurements can coexist on screen.

#### 1.3 Point-to-Point Calculation (`pointToPoint.ts`)

```typescript
interface PointMeasurement {
  id: string;
  type: 'point-to-point';
  pointA: THREE.Vector3;
  pointB: THREE.Vector3;
  distance: number; // in mm (model units)
}

function computePointToPoint(a: Vector3, b: Vector3): number {
  return a.distanceTo(b);
}
```

#### 1.4 Annotation Rendering (`renderAnnotations.ts`)

For each completed measurement, render into the Three.js scene:
- **Marker spheres** at point A and point B (small, colored)
- **Dashed line** connecting the two points (`THREE.LineDashedMaterial`)
- **CSS2D label** at midpoint showing distance value (e.g. "127.4 mm")
- **Delete button** (small X) on the label to remove a measurement

Use the existing `CSS2DRenderer` already set up in STEPViewer.

#### 1.5 Measurement Toolbar (`MeasurementToolbar.tsx`)

- Positioned in existing toolbar area of STEPViewer
- Buttons:
  - **Ruler icon**: Point-to-point mode (Phase 1)
  - **Angle icon**: Angle mode (Phase 2)
  - **Circle icon**: Radius/diameter mode (Phase 3)
  - **Clear all**: Remove all measurements
- Active mode highlighted
- ESC key cancels current measurement

#### 1.6 Integration into STEPViewer

- Add measurement mode state to STEPViewer
- When measurement mode is active, disable orbit controls on single-click (keep drag for rotate)
  - Strategy: Use `pointerdown`/`pointerup` timing -- short click (<200ms, <5px movement) = measurement pick; drag = orbit
- Pass scene, camera, renderer, meshes refs to measurement hooks
- Render measurement toolbar alongside existing toolbar buttons
- Clean up measurement objects on component unmount

---

### Phase 2: Edge Length & Face Selection

**Goal**: Users can select individual edges and faces for more precise measurements.

#### 2.1 Edge Detection & Selection

- On hover with edge-measurement mode active:
  - Use raycaster to find intersected face
  - From the face's triangle, identify the closest edge (using `EdgesGeometry` data or index buffer)
  - Highlight the edge with a colored line overlay
- On click: select the edge, compute its length
- For straight edges: simple `pointA.distanceTo(pointB)`
- For curved edges (from tessellation): sum of segment lengths along the polyline approximation

#### 2.2 Face/Plane Selection

- On hover with face-measurement mode active:
  - Raycaster gives us the face index
  - Expand selection to coplanar adjacent faces (flood fill by normal similarity within tolerance)
  - Highlight selected face group with semi-transparent overlay material
- Store face normal (`THREE.Vector3`) and a reference point on the face
- Face data is needed for face-to-face distance and angle calculations

#### 2.3 Face-to-Face Distance (`faceDistance.ts`)

- Select two faces
- If faces are approximately parallel (normals within ~5 degrees):
  - Project a point from face A onto face B's plane -> perpendicular distance
  - Display as thickness/gap measurement
- If not parallel:
  - Compute and display minimum distance between the two face meshes
  - Show the two closest points and the connecting line

---

### Phase 3: Angle Measurement & Radius/Diameter

**Goal**: Measure bend angles on sheet metal and detect hole/fillet radii.

#### 3.1 Angle Between Faces (`faceAngle.ts`)

- Select two adjacent or nearby faces
- Compute angle between their normals: `angle = Math.acos(n1.dot(n2))`
- For sheet metal: the bend angle is typically the supplement (180 - angle between outward normals)
- Display:
  - Arc glyph between the two faces at their intersection
  - Label showing angle in degrees (e.g. "90.0 deg")
  - Option to show as bend angle (supplement) vs. included angle

**Sheet metal specific logic**:
- Detect that two flat faces are connected by a small curved (bend) face
- Auto-compute: bend angle, bend radius, and K-factor if material thickness is known
- Highlight the bend zone with a distinct color

#### 3.2 Radius / Diameter Detection (`radiusDiameter.ts`)

- On click on a curved surface:
  - Sample multiple points on the selected face triangles
  - Fit a circle/cylinder to the sampled points (least-squares fit)
  - If good fit (low residual): display radius and diameter
  - If poor fit: show "non-circular surface" warning
- For holes:
  - Detect cylindrical inner surfaces (normals pointing inward)
  - Show diameter dimension line across the hole
- For fillets/rounds:
  - Detect small curved transition faces
  - Show radius

#### 3.3 Bend Analysis (Sheet Metal Focus)

- Auto-detect bend regions:
  - Find narrow curved faces between two larger flat faces
  - Compute bend angle, inner radius, outer radius
  - Display bend annotation with all three values
- Optional: show bend allowance / developed length if material thickness provided
- Color-code bends by angle range (e.g. green=0-45, yellow=45-90, red=90+)

---

### Phase 4: UX Polish & Persistence

#### 4.1 Measurement Management Panel

- Collapsible side panel listing all active measurements
- Each measurement shows:
  - Type icon (distance, angle, radius)
  - Value with units
  - Delete button
  - Visibility toggle (eye icon)
- Export measurements as CSV or JSON

#### 4.2 Snap Improvements

- Add snap-to-midpoint (edge midpoints)
- Add snap-to-center (circular face centers)
- Add snap-to-intersection (where two edges meet)
- Show snap type indicator icon near cursor
- User preference for snap sensitivity

#### 4.3 Unit System

- Support mm (default), cm, m, inches
- Unit selector in toolbar
- All measurements display in selected unit
- Persist preference per user

#### 4.4 Measurement Persistence

- Save measurements to Supabase (per part, per user)
- Reload measurements when revisiting the same part
- Share measurements between team members (optional toggle)

#### 4.5 Keyboard Shortcuts

| Key | Action |
|---|---|
| `D` | Activate point-to-point distance mode |
| `A` | Activate angle measurement mode |
| `R` | Activate radius/diameter mode |
| `Escape` | Cancel current measurement / exit mode |
| `Delete` | Remove last measurement |
| `Ctrl+Shift+M` | Toggle measurement panel |

---

## Technical Considerations

### Performance

- **Raycasting cost**: Use `Raycaster` with `firstHitOnly` when available; limit ray tests to visible meshes only
- **Vertex snap**: Build a spatial index (octree or k-d tree) for vertex positions on model load to avoid O(n) search per frame
- **Hover highlighting**: Use a separate highlight material overlay rather than modifying original mesh materials (avoids costly material swaps)
- **Annotation count**: Cap at ~50 simultaneous measurements; warn user above that

### Accuracy

- All measurements are on the **tessellated** (triangulated) mesh, not the original B-rep geometry
- This means:
  - Straight edges and flat faces: exact
  - Curved surfaces: accuracy depends on tessellation density
  - Radius/diameter: fitted from sampled points, not from true geometry
- Display a "measured from tessellated mesh" disclaimer
- For server-processed files: request higher tessellation quality for measurement mode (optional future enhancement)
- Consider adding a tolerance/confidence indicator for curved surface measurements

### Coordinate Systems

- Three.js scene uses the same units as the STEP file (typically mm)
- Ensure all measurements account for any transforms applied to meshes (use `mesh.localToWorld()`)
- Handle multi-part assemblies: measurements across different parts must use world coordinates

### Interaction with Existing Features

- **Orbit controls**: Must coexist with measurement clicks (use timing/distance threshold to distinguish click vs. drag)
- **Exploded view**: Measurements should track with exploded positions or be cleared/warned when explosion changes
- **Wireframe mode**: Measurements should still work (raycast against invisible solid, show annotations)
- **PMI overlay**: Measurement annotations use the same CSS2DRenderer; avoid visual collision via z-ordering or spatial offset
- **Feature highlighting**: Can coexist; measurement hover highlight should take precedence

---

## Phased Delivery Summary

| Phase | Scope | Key Deliverables |
|---|---|---|
| **Phase 1** | Point-to-Point MVP | Raycaster, snap-to-vertex, click-to-measure, dashed line + label, toolbar button |
| **Phase 2** | Edge & Face Selection | Edge length, face highlighting, face-to-face distance (thickness) |
| **Phase 3** | Angles & Radii | Face angle measurement, bend detection, radius/diameter fitting |
| **Phase 4** | Polish & Persistence | Measurement panel, units, persistence to DB, keyboard shortcuts, export |

---

## Translation Keys Needed

Namespace: `jobs.json` (under `parts.cadViewer.measurements`)

```json
{
  "parts": {
    "cadViewer": {
      "measurements": {
        "title": "Measurements",
        "pointToPoint": "Point-to-Point Distance",
        "edgeLength": "Edge Length",
        "faceDistance": "Face-to-Face Distance",
        "angle": "Angle",
        "radius": "Radius",
        "diameter": "Diameter",
        "bendAngle": "Bend Angle",
        "bendRadius": "Bend Radius",
        "selectFirstPoint": "Click to select the first point",
        "selectSecondPoint": "Click to select the second point",
        "selectFirstFace": "Click to select the first face",
        "selectSecondFace": "Click to select the second face",
        "selectEdge": "Click on an edge to measure",
        "selectCurvedFace": "Click on a curved surface",
        "clearAll": "Clear All Measurements",
        "units": "Units",
        "mm": "Millimeters",
        "cm": "Centimeters",
        "inches": "Inches",
        "tessellationDisclaimer": "Measured from tessellated mesh",
        "snapVertex": "Vertex",
        "snapEdge": "Edge",
        "snapFace": "Face",
        "exportMeasurements": "Export Measurements",
        "measurementPanel": "Measurement Panel",
        "noMeasurements": "No measurements yet"
      }
    }
  }
}
```

All keys must be added to `en/jobs.json`, `nl/jobs.json`, and `de/jobs.json`.

---

## Dependencies

No new npm packages required. The implementation uses:
- `THREE.Raycaster` (already available)
- `THREE.LineDashedMaterial` (already available)
- `CSS2DRenderer` / `CSS2DObject` (already imported in STEPViewer)
- Standard Three.js geometry utilities

Optional future addition:
- `three-mesh-bvh` for faster raycasting on complex models (can be added in Phase 4 if perf is an issue)
