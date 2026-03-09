---
title: "3D Viewer Measurements Plan"
description: "Implementation plan for interactive measurement tools in the STEP viewer."
---

# Implementation Plan: Interactive 3D Viewer Measurements (v3)

## Overview

Add interactive measurement tools to the STEPViewer: point-to-point distance, face-to-face thickness, angle between faces (sheet metal bends), and radius/diameter detection. Uses `three-mesh-bvh` for fast raycasting and spatial queries.

---

## Current State (Code Review)

**`STEPViewer.tsx`** is 1,872 lines. Key integration points:

| Ref / State | Line | What it holds |
|---|---|---|
| `containerRef` | 87 | `<div>` wrapping the WebGL canvas |
| `sceneRef` | 88 | `THREE.Scene` |
| `cameraRef` | 89 | `THREE.PerspectiveCamera` (fov 45) |
| `rendererRef` | 90 | `THREE.WebGLRenderer` (antialias) |
| `controlsRef` | 91 | `OrbitControls` (damping 0.05) |
| `meshesRef` | 92 | `THREE.Mesh[]` - all loaded part meshes |
| `edgesRef` | 93 | `THREE.LineSegments[]` - edge wireframes |
| `css2dRendererRef` | 110 | `CSS2DRenderer` - label overlay, `pointerEvents: 'none'` (line 260) |
| `dimensionLinesRef` | 106 | `THREE.Group` for bounding box dim lines |
| `pmiLayerRef` | 111 | `THREE.Group` for PMI annotations |
| `addMeshToScene()` | 336 | Adds mesh + EdgesGeometry to scene |

**Two mesh loading paths** (both end at `addMeshToScene`):
1. **Server geometry** (lines 446-481): Loops `serverGeometry.meshes`, calls `createMeshFromServerData()` -> `addMeshToScene()`
2. **Browser STEP** (lines 484-599): Parses with `occt-import-js`, creates `BufferGeometry` -> `addMeshToScene()`

**Toolbar pattern** (lines 1592-1710): Ghost buttons, `h-7 w-7 p-0`, active state `bg-primary/20 text-primary`, dividers `w-px h-4 bg-border mx-0.5`.

---

## New Dependency: `three-mesh-bvh`

```bash
npm install three-mesh-bvh
```

**Why**: Accelerated raycasting (500 rays/frame at 60fps on 80K polygons), `closestPointToPoint()` for vertex snapping, `getTriangleHitPointInfo()` for face normals. Peer dep `three >= 0.159.0` -- compatible with our `^0.182.0`.

**Setup** -- one-time prototype patch at the top of STEPViewer or in a shared init module:

```typescript
// src/components/viewer/measurements/setupBVH.ts
import * as THREE from 'three';
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
} from 'three-mesh-bvh';

// Patch Three.js prototypes (safe to call multiple times, idempotent)
export function installBVH() {
  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
}
```

**BVH generation** -- insert into `addMeshToScene()` (line 336):

```typescript
const addMeshToScene = useCallback((mesh: THREE.Mesh) => {
  if (!sceneRef.current) return;

  // Build BVH for fast raycasting (typically <5ms per mesh)
  mesh.geometry.computeBoundsTree();

  meshesRef.current.push(mesh);
  originalPositionsRef.current.push(mesh.position.clone());
  sceneRef.current.add(mesh);

  // ... existing edge geometry code ...
}, [edgesVisible]);
```

**Cleanup** -- insert into `clearMeshes()` (line 300):

```typescript
// Before disposing geometry:
mesh.geometry.disposeBoundsTree();
mesh.geometry.dispose();
```

---

## File Structure

```
src/components/viewer/measurements/
  setupBVH.ts              # BVH prototype patching (11 lines)
  types.ts                 # TypeScript types for all measurement modes
  useRaycastPicker.ts      # Hook: raycasting + vertex/edge/face snap
  useMeasurements.ts       # Hook: state machine, results, annotations
  computations.ts          # Pure functions: distance, angle, radius fitting
  annotations.ts           # Three.js rendering: lines, arcs, labels, markers
  MeasurementToolbar.tsx   # Toolbar buttons for mode selection
  MeasurementPanel.tsx     # Results list overlay
```

**Modified files**:
- `src/components/STEPViewer.tsx` -- ~60 lines added
- `src/i18n/locales/{en,nl,de}/jobs.json` -- translation keys

---

## Types (`types.ts`)

```typescript
import * as THREE from 'three';

// ── Measurement Modes ──────────────────────────────────────────────

export type MeasurementMode =
  | 'none'
  | 'point-to-point'
  | 'face-distance'
  | 'face-angle'
  | 'radius';

export type MeasurementPhase =
  | 'idle'             // No mode active
  | 'picking_first'    // Waiting for first click
  | 'picking_second';  // Waiting for second click (first point/face stored)

// ── Snap System ────────────────────────────────────────────────────

export type SnapType = 'vertex' | 'edge' | 'face';

export interface SnapTarget {
  point: THREE.Vector3;       // World-space snapped position
  type: SnapType;
  mesh: THREE.Mesh;
  faceIndex: number;          // Triangle index in geometry
  normal: THREE.Vector3;      // Interpolated face normal at hit
}

// ── Measurement Results ────────────────────────────────────────────

export interface PointToPointResult {
  id: string;
  type: 'point-to-point';
  pointA: THREE.Vector3;
  pointB: THREE.Vector3;
  distance: number;           // mm
}

export interface FaceDistanceResult {
  id: string;
  type: 'face-distance';
  faceA: { centroid: THREE.Vector3; normal: THREE.Vector3 };
  faceB: { centroid: THREE.Vector3; normal: THREE.Vector3 };
  distance: number;           // mm (perpendicular if parallel)
  isParallel: boolean;
}

export interface FaceAngleResult {
  id: string;
  type: 'face-angle';
  faceA: { centroid: THREE.Vector3; normal: THREE.Vector3 };
  faceB: { centroid: THREE.Vector3; normal: THREE.Vector3 };
  includedAngleDeg: number;   // Angle between outward normals
  bendAngleDeg: number;       // 180 - included (sheet metal convention)
}

export interface RadiusResult {
  id: string;
  type: 'radius';
  center: THREE.Vector3;
  axis: THREE.Vector3;        // Cylinder axis direction
  radius: number;             // mm
  diameter: number;           // mm
  confidence: number;         // 0-1 fit quality (residual-based)
}

export type MeasurementResult =
  | PointToPointResult
  | FaceDistanceResult
  | FaceAngleResult
  | RadiusResult;

// ── Scene Object Refs ──────────────────────────────────────────────
// Passed from STEPViewer into measurement hooks

export interface ViewerRefs {
  container: HTMLDivElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  meshes: THREE.Mesh[];
  controls: import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;
}
```

---

## Raycaster Hook (`useRaycastPicker.ts`)

This hook converts mouse events into `SnapTarget` objects on the model surface.

```typescript
import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { getTriangleHitPointInfo } from 'three-mesh-bvh';
import type { SnapTarget, SnapType, ViewerRefs } from './types';

interface UseRaycastPickerOptions {
  viewerRefs: ViewerRefs | null;
  active: boolean;              // Only raycast when a measurement mode is on
  onHover?: (snap: SnapTarget | null) => void;
  onClick?: (snap: SnapTarget) => void;
}

// Reusable objects (avoid GC pressure in animation loop)
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();
const _tempVec3 = new THREE.Vector3();

export function useRaycastPicker({
  viewerRefs,
  active,
  onHover,
  onClick,
}: UseRaycastPickerOptions) {
  // ── Click vs. Drag Detection ────────────────────────────────────
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const CLICK_MAX_TIME = 200;   // ms
  const CLICK_MAX_DIST = 5;     // px

  // ── Snap Preview Indicator ──────────────────────────────────────
  const snapIndicatorRef = useRef<THREE.Mesh | null>(null);

  const createSnapIndicator = useCallback((scene: THREE.Scene) => {
    if (snapIndicatorRef.current) return;
    const geo = new THREE.SphereGeometry(1.2, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff8c00,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.renderOrder = 999;
    sphere.visible = false;
    scene.add(sphere);
    snapIndicatorRef.current = sphere;
  }, []);

  // ── Core Raycast Function ──────────────────────────────────────
  const castRay = useCallback(
    (clientX: number, clientY: number): SnapTarget | null => {
      if (!viewerRefs) return null;
      const { container, camera, meshes } = viewerRefs;
      const rect = container.getBoundingClientRect();

      // Normalized device coordinates
      _mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_mouse, camera);
      _raycaster.firstHitOnly = true; // BVH-accelerated single hit

      const intersects = _raycaster.intersectObjects(meshes, false);
      if (intersects.length === 0) return null;

      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;
      const geometry = mesh.geometry;
      const faceIndex = hit.faceIndex!;

      // ── Get face normal via three-mesh-bvh helper ──
      const hitInfo = getTriangleHitPointInfo(
        hit.point,
        geometry,
        faceIndex
      );
      const faceNormal = hitInfo.face.normal.clone();
      // Transform normal to world space
      faceNormal.transformDirection(mesh.matrixWorld);

      // ── Vertex Snap ──
      // Check if intersection is close to a triangle vertex (screen-space)
      const snapResult = tryVertexSnap(
        hit.point, geometry, faceIndex, mesh, camera, container
      );

      if (snapResult) {
        return {
          point: snapResult,
          type: 'vertex' as SnapType,
          mesh,
          faceIndex,
          normal: faceNormal,
        };
      }

      // ── Edge Snap ──
      const edgeResult = tryEdgeSnap(
        hit.point, geometry, faceIndex, mesh, camera, container
      );

      if (edgeResult) {
        return {
          point: edgeResult,
          type: 'edge' as SnapType,
          mesh,
          faceIndex,
          normal: faceNormal,
        };
      }

      // ── Face Snap (default) ──
      return {
        point: hit.point.clone(),
        type: 'face' as SnapType,
        mesh,
        faceIndex,
        normal: faceNormal,
      };
    },
    [viewerRefs]
  );

  // ── Vertex Snap Helper ──────────────────────────────────────────
  // Uses geometry index buffer to find the 3 vertices of the hit triangle
  // Projects each to screen space and checks pixel distance to mouse

  function tryVertexSnap(
    hitPoint: THREE.Vector3,
    geometry: THREE.BufferGeometry,
    faceIndex: number,
    mesh: THREE.Mesh,
    camera: THREE.PerspectiveCamera,
    container: HTMLDivElement,
  ): THREE.Vector3 | null {
    const posAttr = geometry.attributes.position;
    const index = geometry.index;
    if (!index) return null;

    const SNAP_PX = 8; // Screen-space pixel threshold
    const rect = container.getBoundingClientRect();

    // Get 3 vertex indices for hit triangle
    const i0 = index.getX(faceIndex * 3);
    const i1 = index.getX(faceIndex * 3 + 1);
    const i2 = index.getX(faceIndex * 3 + 2);

    // Project hit point to screen
    const hitScreen = hitPoint.clone().project(camera);
    const hitPx = new THREE.Vector2(
      (hitScreen.x + 1) / 2 * rect.width,
      (-hitScreen.y + 1) / 2 * rect.height
    );

    let bestDist = Infinity;
    let bestVertex: THREE.Vector3 | null = null;

    for (const vi of [i0, i1, i2]) {
      // Get vertex position in world space
      _tempVec3.fromBufferAttribute(posAttr, vi);
      mesh.localToWorld(_tempVec3);

      // Project to screen
      const screenPos = _tempVec3.clone().project(camera);
      const px = new THREE.Vector2(
        (screenPos.x + 1) / 2 * rect.width,
        (-screenPos.y + 1) / 2 * rect.height
      );

      const dist = px.distanceTo(hitPx);
      if (dist < SNAP_PX && dist < bestDist) {
        bestDist = dist;
        bestVertex = _tempVec3.clone();
      }
    }

    return bestVertex;
  }

  // ── Edge Snap Helper ────────────────────────────────────────────
  // Projects the hit point onto each of the triangle's 3 edges,
  // checks if the projection is within screen-space threshold

  function tryEdgeSnap(
    hitPoint: THREE.Vector3,
    geometry: THREE.BufferGeometry,
    faceIndex: number,
    mesh: THREE.Mesh,
    camera: THREE.PerspectiveCamera,
    container: HTMLDivElement,
  ): THREE.Vector3 | null {
    const posAttr = geometry.attributes.position;
    const index = geometry.index;
    if (!index) return null;

    const SNAP_PX = 6;
    const rect = container.getBoundingClientRect();

    const i0 = index.getX(faceIndex * 3);
    const i1 = index.getX(faceIndex * 3 + 1);
    const i2 = index.getX(faceIndex * 3 + 2);

    // Get world-space vertices
    const verts = [i0, i1, i2].map(vi => {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, vi);
      mesh.localToWorld(v);
      return v;
    });

    // 3 edges: 0-1, 1-2, 2-0
    const edges: [THREE.Vector3, THREE.Vector3][] = [
      [verts[0], verts[1]],
      [verts[1], verts[2]],
      [verts[2], verts[0]],
    ];

    let bestDist = Infinity;
    let bestPoint: THREE.Vector3 | null = null;

    for (const [a, b] of edges) {
      // Project hitPoint onto edge AB (world space)
      const ab = new THREE.Vector3().subVectors(b, a);
      const ap = new THREE.Vector3().subVectors(hitPoint, a);
      let t = ap.dot(ab) / ab.dot(ab);
      t = Math.max(0, Math.min(1, t)); // Clamp to segment
      const projected = a.clone().add(ab.multiplyScalar(t));

      // Check screen-space distance
      const projScreen = projected.clone().project(camera);
      const hitScreen = hitPoint.clone().project(camera);
      const projPx = new THREE.Vector2(
        (projScreen.x + 1) / 2 * rect.width,
        (-projScreen.y + 1) / 2 * rect.height
      );
      const hitPx = new THREE.Vector2(
        (hitScreen.x + 1) / 2 * rect.width,
        (-hitScreen.y + 1) / 2 * rect.height
      );

      const dist = projPx.distanceTo(hitPx);
      if (dist < SNAP_PX && dist < bestDist) {
        bestDist = dist;
        bestPoint = projected;
      }
    }

    return bestPoint;
  }

  // ── Event Handlers ──────────────────────────────────────────────

  useEffect(() => {
    if (!active || !viewerRefs) return;
    const { container, scene } = viewerRefs;

    createSnapIndicator(scene);

    const onPointerMove = (e: PointerEvent) => {
      const snap = castRay(e.clientX, e.clientY);
      // Update snap indicator position
      if (snapIndicatorRef.current) {
        if (snap) {
          snapIndicatorRef.current.position.copy(snap.point);
          snapIndicatorRef.current.visible = true;
          // Color by snap type
          const mat = snapIndicatorRef.current.material as THREE.MeshBasicMaterial;
          mat.color.setHex(
            snap.type === 'vertex' ? 0xff8c00 :  // Orange
            snap.type === 'edge'   ? 0x00bcd4 :  // Cyan
                                     0x4caf50     // Green
          );
        } else {
          snapIndicatorRef.current.visible = false;
        }
      }
      onHover?.(snap);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // Left click only
      pointerDownRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0 || !pointerDownRef.current) return;

      const { x, y, time } = pointerDownRef.current;
      pointerDownRef.current = null;

      const elapsed = Date.now() - time;
      const dist = Math.hypot(e.clientX - x, e.clientY - y);

      // Short, stationary press = measurement click
      // Long or moving press = orbit/pan (let OrbitControls handle it)
      if (elapsed < CLICK_MAX_TIME && dist < CLICK_MAX_DIST) {
        const snap = castRay(e.clientX, e.clientY);
        if (snap) {
          onClick?.(snap);
        }
      }
    };

    // Use the WebGL canvas element (renderer.domElement) for pointer events
    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);

    // Set cursor
    canvas.style.cursor = 'crosshair';

    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.style.cursor = '';

      // Hide snap indicator
      if (snapIndicatorRef.current) {
        snapIndicatorRef.current.visible = false;
      }
    };
  }, [active, viewerRefs, castRay, createSnapIndicator, onHover, onClick]);

  return { castRay };
}
```

### Key Design Decisions

1. **`_raycaster.firstHitOnly = true`** -- triggers `three-mesh-bvh`'s `raycastFirst()` which is O(log n) instead of O(n). This is the single biggest perf win.

2. **Snap priority**: vertex (8px) > edge (6px) > face (raw hit). Screen-space thresholds ensure snapping feels consistent regardless of zoom level.

3. **`getTriangleHitPointInfo()`** from `three-mesh-bvh` gives us interpolated face normals and UV coords for free, eliminating manual normal computation.

4. **Click/drag discrimination**: `pointerdown` records time+position, `pointerup` checks thresholds. OrbitControls keeps working because it processes the drag portion independently.

5. **Canvas element targeting**: Events are attached to `container.querySelector('canvas')` not the container div, avoiding conflicts with the CSS2D overlay layer which has `pointerEvents: 'none'`.

---

## Pure Computation Functions (`computations.ts`)

```typescript
import * as THREE from 'three';

// ── Point-to-Point Distance ───────────────────────────────────────

export function computePointToPoint(
  a: THREE.Vector3,
  b: THREE.Vector3
): number {
  return a.distanceTo(b);
}

// ── Face-to-Face Distance ─────────────────────────────────────────
// For parallel faces: perpendicular (true thickness).
// For non-parallel: centroid-to-centroid (with warning).

export function computeFaceDistance(
  centroidA: THREE.Vector3,
  normalA: THREE.Vector3,
  centroidB: THREE.Vector3,
  normalB: THREE.Vector3
): { distance: number; isParallel: boolean } {
  // Two faces are "parallel" if their normals are within ~5 degrees
  const dot = Math.abs(normalA.dot(normalB));
  const isParallel = dot > 0.996; // cos(5 deg) ≈ 0.9962

  if (isParallel) {
    // Perpendicular distance: project vector AB onto normal
    const ab = new THREE.Vector3().subVectors(centroidB, centroidA);
    const distance = Math.abs(ab.dot(normalA));
    return { distance, isParallel: true };
  }

  // Non-parallel fallback
  return {
    distance: centroidA.distanceTo(centroidB),
    isParallel: false,
  };
}

// ── Angle Between Faces ───────────────────────────────────────────
// Returns both the included angle and the sheet-metal bend angle.

export function computeFaceAngle(
  normalA: THREE.Vector3,
  normalB: THREE.Vector3
): { includedAngleDeg: number; bendAngleDeg: number } {
  const dot = normalA.dot(normalB);
  const clamped = Math.max(-1, Math.min(1, dot));
  const includedAngleDeg = Math.acos(clamped) * (180 / Math.PI);

  return {
    includedAngleDeg: Math.round(includedAngleDeg * 100) / 100,
    bendAngleDeg: Math.round((180 - includedAngleDeg) * 100) / 100,
  };
}

// ── Radius / Diameter via Circle Fit ──────────────────────────────
// Kasa algebraic circle fit on 2D-projected points from a curved face.

export function fitCircleToPoints(
  points3D: THREE.Vector3[],
  normals3D: THREE.Vector3[]
): {
  center: THREE.Vector3;
  axis: THREE.Vector3;
  radius: number;
  confidence: number;
} | null {
  if (points3D.length < 6) return null; // Need enough samples

  // 1. Estimate cylinder axis as average normal direction
  const axis = new THREE.Vector3();
  for (const n of normals3D) axis.add(n);
  axis.normalize();

  // 2. Build local 2D coordinate system perpendicular to axis
  const basisU = new THREE.Vector3();
  const basisV = new THREE.Vector3();

  // Choose a vector not parallel to axis
  const ref = Math.abs(axis.y) < 0.9
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  basisU.crossVectors(axis, ref).normalize();
  basisV.crossVectors(axis, basisU).normalize();

  // 3. Project 3D points onto 2D plane
  const centroid3D = new THREE.Vector3();
  for (const p of points3D) centroid3D.add(p);
  centroid3D.divideScalar(points3D.length);

  const points2D = points3D.map(p => {
    const offset = new THREE.Vector3().subVectors(p, centroid3D);
    return new THREE.Vector2(offset.dot(basisU), offset.dot(basisV));
  });

  // 4. Kasa circle fit: minimize algebraic distance
  //    Solve: A * [cx, cy, r^2 - cx^2 - cy^2]^T = b
  let sumX = 0, sumY = 0;
  let sumX2 = 0, sumY2 = 0, sumXY = 0;
  let sumX3 = 0, sumY3 = 0;
  let sumX2Y = 0, sumXY2 = 0;

  const n = points2D.length;
  for (const p of points2D) {
    const { x, y } = p;
    sumX += x;  sumY += y;
    sumX2 += x * x;  sumY2 += y * y;  sumXY += x * y;
    sumX3 += x * x * x;  sumY3 += y * y * y;
    sumX2Y += x * x * y;  sumXY2 += x * y * y;
  }

  // 2x2 system (Kasa method):
  // [sumX2  sumXY] [cx]   = 0.5 * [sumX3 + sumXY2]
  // [sumXY  sumY2] [cy]           [sumX2Y + sumY3]
  const A11 = sumX2 - sumX * sumX / n;
  const A12 = sumXY - sumX * sumY / n;
  const A22 = sumY2 - sumY * sumY / n;
  const b1 = 0.5 * (sumX3 + sumXY2 - sumX * (sumX2 + sumY2) / n);
  const b2 = 0.5 * (sumX2Y + sumY3 - sumY * (sumX2 + sumY2) / n);

  const det = A11 * A22 - A12 * A12;
  if (Math.abs(det) < 1e-10) return null; // Degenerate

  const cx = (A22 * b1 - A12 * b2) / det;
  const cy = (A11 * b2 - A12 * b1) / det;

  // 5. Compute radius
  let sumR2 = 0;
  for (const p of points2D) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    sumR2 += Math.sqrt(dx * dx + dy * dy);
  }
  const radius = sumR2 / n;

  // 6. Compute confidence (average residual relative to radius)
  let sumResidual = 0;
  for (const p of points2D) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    sumResidual += Math.abs(r - radius);
  }
  const avgResidual = sumResidual / n;
  const confidence = Math.max(0, 1 - avgResidual / radius);

  // 7. Convert center back to 3D
  const center = centroid3D.clone()
    .add(basisU.clone().multiplyScalar(cx))
    .add(basisV.clone().multiplyScalar(cy));

  return { center, axis: axis.clone(), radius, confidence };
}

// ── Coplanar Face Flood Fill ──────────────────────────────────────
// Given a starting triangle, find all adjacent triangles with similar normals.
// Returns array of triangle indices forming a "logical face".

export function floodFillCoplanarFaces(
  geometry: THREE.BufferGeometry,
  startFaceIndex: number,
  normalThresholdDeg: number = 5
): number[] {
  const index = geometry.index;
  const normalAttr = geometry.attributes.normal;
  if (!index || !normalAttr) return [startFaceIndex];

  const triCount = index.count / 3;
  const cosThreshold = Math.cos(normalThresholdDeg * Math.PI / 180);

  // 1. Build edge -> triangle adjacency map (once)
  //    Edge key = sorted pair of vertex indices
  const edgeToTris = new Map<string, number[]>();
  for (let ti = 0; ti < triCount; ti++) {
    const a = index.getX(ti * 3);
    const b = index.getX(ti * 3 + 1);
    const c = index.getX(ti * 3 + 2);

    for (const [v0, v1] of [[a, b], [b, c], [c, a]]) {
      const key = v0 < v1 ? `${v0}_${v1}` : `${v1}_${v0}`;
      if (!edgeToTris.has(key)) edgeToTris.set(key, []);
      edgeToTris.get(key)!.push(ti);
    }
  }

  // 2. Compute face normal for a triangle
  const getFaceNormal = (ti: number): THREE.Vector3 => {
    const i0 = index.getX(ti * 3);
    const i1 = index.getX(ti * 3 + 1);
    const i2 = index.getX(ti * 3 + 2);
    // Average of vertex normals
    const n = new THREE.Vector3(
      (normalAttr.getX(i0) + normalAttr.getX(i1) + normalAttr.getX(i2)) / 3,
      (normalAttr.getY(i0) + normalAttr.getY(i1) + normalAttr.getY(i2)) / 3,
      (normalAttr.getZ(i0) + normalAttr.getZ(i1) + normalAttr.getZ(i2)) / 3,
    );
    return n.normalize();
  };

  // 3. BFS flood fill
  const startNormal = getFaceNormal(startFaceIndex);
  const visited = new Set<number>();
  const queue = [startFaceIndex];
  const result: number[] = [];

  while (queue.length > 0) {
    const ti = queue.shift()!;
    if (visited.has(ti)) continue;
    visited.add(ti);

    const normal = getFaceNormal(ti);
    if (normal.dot(startNormal) < cosThreshold) continue;

    result.push(ti);

    // Enqueue adjacent triangles via shared edges
    const a = index.getX(ti * 3);
    const b = index.getX(ti * 3 + 1);
    const c = index.getX(ti * 3 + 2);

    for (const [v0, v1] of [[a, b], [b, c], [c, a]]) {
      const key = v0 < v1 ? `${v0}_${v1}` : `${v1}_${v0}`;
      const neighbors = edgeToTris.get(key);
      if (neighbors) {
        for (const nti of neighbors) {
          if (!visited.has(nti)) queue.push(nti);
        }
      }
    }
  }

  return result;
}

// ── Face Centroid & Average Normal ────────────────────────────────
// Compute average centroid and normal for a group of coplanar triangles.

export function computeFaceGroupInfo(
  geometry: THREE.BufferGeometry,
  faceIndices: number[],
  mesh: THREE.Mesh
): { centroid: THREE.Vector3; normal: THREE.Vector3 } {
  const index = geometry.index!;
  const posAttr = geometry.attributes.position;
  const normalAttr = geometry.attributes.normal;

  const centroid = new THREE.Vector3();
  const normal = new THREE.Vector3();
  let count = 0;

  for (const ti of faceIndices) {
    for (let j = 0; j < 3; j++) {
      const vi = index.getX(ti * 3 + j);
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, vi);
      mesh.localToWorld(v);
      centroid.add(v);

      const n = new THREE.Vector3().fromBufferAttribute(normalAttr, vi);
      normal.add(n);
      count++;
    }
  }

  centroid.divideScalar(count);
  normal.normalize();
  // Transform normal to world space
  normal.transformDirection(mesh.matrixWorld);

  return { centroid, normal };
}

// ── Collect Points from Face Group (for radius fitting) ──────────

export function collectFaceGroupPoints(
  geometry: THREE.BufferGeometry,
  faceIndices: number[],
  mesh: THREE.Mesh
): { points: THREE.Vector3[]; normals: THREE.Vector3[] } {
  const index = geometry.index!;
  const posAttr = geometry.attributes.position;
  const normalAttr = geometry.attributes.normal;

  const seenVerts = new Set<number>();
  const points: THREE.Vector3[] = [];
  const normals: THREE.Vector3[] = [];

  for (const ti of faceIndices) {
    for (let j = 0; j < 3; j++) {
      const vi = index.getX(ti * 3 + j);
      if (seenVerts.has(vi)) continue;
      seenVerts.add(vi);

      const p = new THREE.Vector3().fromBufferAttribute(posAttr, vi);
      mesh.localToWorld(p);
      points.push(p);

      const n = new THREE.Vector3().fromBufferAttribute(normalAttr, vi);
      n.transformDirection(mesh.matrixWorld);
      normals.push(n);
    }
  }

  return { points, normals };
}
```

---

## Annotation Rendering (`annotations.ts`)

Renders measurement results into the Three.js scene.

```typescript
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { MeasurementResult } from './types';

// ── Create annotation group for a measurement ────────────────────

export function createMeasurementAnnotation(
  result: MeasurementResult,
  onDelete: (id: string) => void
): THREE.Group {
  const group = new THREE.Group();
  group.name = `measurement_${result.id}`;

  switch (result.type) {
    case 'point-to-point':
      addPointToPointAnnotation(group, result, onDelete);
      break;
    case 'face-distance':
      addFaceDistanceAnnotation(group, result, onDelete);
      break;
    case 'face-angle':
      addFaceAngleAnnotation(group, result, onDelete);
      break;
    case 'radius':
      addRadiusAnnotation(group, result, onDelete);
      break;
  }

  return group;
}

// ── Point-to-Point ───────────────────────────────────────────────

function addPointToPointAnnotation(
  group: THREE.Group,
  result: { pointA: THREE.Vector3; pointB: THREE.Vector3; distance: number; id: string },
  onDelete: (id: string) => void
) {
  // Marker spheres at both endpoints
  const markerGeo = new THREE.SphereGeometry(1.0, 12, 12);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0xff8c00,
    depthTest: false,
  });

  const markerA = new THREE.Mesh(markerGeo, markerMat);
  markerA.position.copy(result.pointA);
  markerA.renderOrder = 998;
  group.add(markerA);

  const markerB = new THREE.Mesh(markerGeo, markerMat.clone());
  markerB.position.copy(result.pointB);
  markerB.renderOrder = 998;
  group.add(markerB);

  // Dashed line between points
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    result.pointA,
    result.pointB,
  ]);
  const lineMat = new THREE.LineDashedMaterial({
    color: 0x4a9eff,
    dashSize: 3,
    gapSize: 2,
    depthTest: false,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  line.computeLineDistances(); // Required for dashed lines
  line.renderOrder = 997;
  group.add(line);

  // CSS2D label at midpoint
  const midpoint = new THREE.Vector3().addVectors(result.pointA, result.pointB).multiplyScalar(0.5);
  const label = createMeasurementLabel(
    `${result.distance.toFixed(2)} mm`,
    result.id,
    onDelete
  );
  label.position.copy(midpoint);
  group.add(label);
}

// ── Face Distance ────────────────────────────────────────────────

function addFaceDistanceAnnotation(
  group: THREE.Group,
  result: {
    faceA: { centroid: THREE.Vector3; normal: THREE.Vector3 };
    faceB: { centroid: THREE.Vector3; normal: THREE.Vector3 };
    distance: number;
    isParallel: boolean;
    id: string;
  },
  onDelete: (id: string) => void
) {
  const { faceA, faceB } = result;

  // Arrow line between face centroids
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    faceA.centroid,
    faceB.centroid,
  ]);
  const lineMat = new THREE.LineDashedMaterial({
    color: 0x34a853,
    dashSize: 3,
    gapSize: 2,
    depthTest: false,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  line.computeLineDistances();
  line.renderOrder = 997;
  group.add(line);

  // Arrowheads at both ends
  group.add(createArrowhead(faceA.centroid, faceB.centroid, 0x34a853));
  group.add(createArrowhead(faceB.centroid, faceA.centroid, 0x34a853));

  // Label
  const midpoint = new THREE.Vector3()
    .addVectors(faceA.centroid, faceB.centroid)
    .multiplyScalar(0.5);
  const suffix = result.isParallel ? ' mm' : ' mm (non-parallel)';
  const label = createMeasurementLabel(
    `${result.distance.toFixed(2)}${suffix}`,
    result.id,
    onDelete
  );
  label.position.copy(midpoint);
  group.add(label);
}

// ── Face Angle ───────────────────────────────────────────────────

function addFaceAngleAnnotation(
  group: THREE.Group,
  result: {
    faceA: { centroid: THREE.Vector3; normal: THREE.Vector3 };
    faceB: { centroid: THREE.Vector3; normal: THREE.Vector3 };
    includedAngleDeg: number;
    bendAngleDeg: number;
    id: string;
  },
  onDelete: (id: string) => void
) {
  const { faceA, faceB } = result;

  // Draw an arc between the two normals at the midpoint
  const midpoint = new THREE.Vector3()
    .addVectors(faceA.centroid, faceB.centroid)
    .multiplyScalar(0.5);

  // Draw normal indicators from each face
  const normalLength = faceA.centroid.distanceTo(faceB.centroid) * 0.3;

  const normalLineA = new THREE.BufferGeometry().setFromPoints([
    faceA.centroid,
    faceA.centroid.clone().add(faceA.normal.clone().multiplyScalar(normalLength)),
  ]);
  const normalLineB = new THREE.BufferGeometry().setFromPoints([
    faceB.centroid,
    faceB.centroid.clone().add(faceB.normal.clone().multiplyScalar(normalLength)),
  ]);

  const normalMat = new THREE.LineBasicMaterial({
    color: 0xfbbc05,
    depthTest: false,
  });

  const lineA = new THREE.Line(normalLineA, normalMat);
  lineA.renderOrder = 997;
  group.add(lineA);

  const lineB = new THREE.Line(normalLineB, normalMat.clone());
  lineB.renderOrder = 997;
  group.add(lineB);

  // Arc between normals (sampled polyline)
  const arcRadius = normalLength * 0.6;
  const arcPoints: THREE.Vector3[] = [];
  const nA = faceA.normal.clone().normalize();
  const nB = faceB.normal.clone().normalize();
  const angleRad = Math.acos(Math.max(-1, Math.min(1, nA.dot(nB))));
  const steps = 24;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Slerp between normals
    const interpolated = new THREE.Vector3()
      .copy(nA)
      .lerp(nB, t)
      .normalize()
      .multiplyScalar(arcRadius);
    arcPoints.push(midpoint.clone().add(interpolated));
  }

  const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
  const arcMat = new THREE.LineBasicMaterial({
    color: 0xfbbc05,
    depthTest: false,
  });
  const arc = new THREE.Line(arcGeo, arcMat);
  arc.renderOrder = 997;
  group.add(arc);

  // Label with both angles
  const labelPos = midpoint.clone().add(
    nA.clone().lerp(nB, 0.5).normalize().multiplyScalar(arcRadius * 1.3)
  );
  const text = `${result.includedAngleDeg.toFixed(1)}°\nBend: ${result.bendAngleDeg.toFixed(1)}°`;
  const label = createMeasurementLabel(text, result.id, onDelete);
  label.position.copy(labelPos);
  group.add(label);
}

// ── Radius / Diameter ────────────────────────────────────────────

function addRadiusAnnotation(
  group: THREE.Group,
  result: {
    center: THREE.Vector3;
    radius: number;
    diameter: number;
    confidence: number;
    id: string;
  },
  onDelete: (id: string) => void
) {
  // Center marker
  const markerGeo = new THREE.SphereGeometry(1.0, 12, 12);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0xe040fb,
    depthTest: false,
  });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.copy(result.center);
  marker.renderOrder = 998;
  group.add(marker);

  // Label
  const confidenceStr = result.confidence > 0.95 ? '' : ` (~${(result.confidence * 100).toFixed(0)}%)`;
  const text = `R ${result.radius.toFixed(2)} mm\nD ${result.diameter.toFixed(2)} mm${confidenceStr}`;
  const label = createMeasurementLabel(text, result.id, onDelete);
  label.position.copy(result.center);
  group.add(label);
}

// ── Shared Helpers ───────────────────────────────────────────────

function createMeasurementLabel(
  text: string,
  id: string,
  onDelete: (id: string) => void
): CSS2DObject {
  const div = document.createElement('div');
  div.style.cssText = `
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    white-space: pre-line;
    pointer-events: auto;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid rgba(74, 158, 255, 0.3);
    backdrop-filter: blur(4px);
  `;

  const textSpan = document.createElement('span');
  textSpan.textContent = text;
  div.appendChild(textSpan);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '×';
  deleteBtn.style.cssText = `
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
  `;
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onDelete(id);
  });
  div.appendChild(deleteBtn);

  return new CSS2DObject(div);
}

function createArrowhead(
  from: THREE.Vector3,
  to: THREE.Vector3,
  color: number
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(to, from).normalize();
  const length = 2.5;
  const coneGeo = new THREE.ConeGeometry(0.8, length, 8);
  const coneMat = new THREE.MeshBasicMaterial({ color, depthTest: false });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.copy(to);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  cone.renderOrder = 998;
  return cone;
}

// ── Live Preview Line ────────────────────────────────────────────
// Shown while picking the second point (from stored first point to cursor)

export function createPreviewLine(): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ]);
  const mat = new THREE.LineBasicMaterial({
    color: 0x4a9eff,
    transparent: true,
    opacity: 0.5,
    depthTest: false,
  });
  const line = new THREE.Line(geo, mat);
  line.renderOrder = 996;
  line.visible = false;
  return line;
}

export function updatePreviewLine(
  line: THREE.Line,
  from: THREE.Vector3,
  to: THREE.Vector3
) {
  const positions = line.geometry.attributes.position as THREE.BufferAttribute;
  positions.setXYZ(0, from.x, from.y, from.z);
  positions.setXYZ(1, to.x, to.y, to.z);
  positions.needsUpdate = true;
  line.visible = true;
}

// ── Face Highlight Overlay ───────────────────────────────────────
// Semi-transparent overlay on selected face group triangles

export function createFaceHighlight(
  geometry: THREE.BufferGeometry,
  faceIndices: number[],
  mesh: THREE.Mesh,
  color: number = 0x4a9eff
): THREE.Mesh {
  const index = geometry.index!;
  const posAttr = geometry.attributes.position;

  // Build new geometry from selected triangles only
  const positions: number[] = [];
  for (const ti of faceIndices) {
    for (let j = 0; j < 3; j++) {
      const vi = index.getX(ti * 3 + j);
      positions.push(
        posAttr.getX(vi),
        posAttr.getY(vi),
        posAttr.getZ(vi)
      );
    }
  }

  const highlightGeo = new THREE.BufferGeometry();
  highlightGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );

  const highlightMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthTest: false,
  });

  const highlight = new THREE.Mesh(highlightGeo, highlightMat);
  // Copy transform from source mesh so highlight aligns
  highlight.matrix.copy(mesh.matrix);
  highlight.matrixAutoUpdate = false;
  highlight.renderOrder = 995;

  return highlight;
}

// ── Dispose annotation group ─────────────────────────────────────

export function disposeAnnotationGroup(group: THREE.Group) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
    }
    if (child instanceof CSS2DObject) {
      child.element.remove();
    }
  });
}
```

---

## Measurement State Machine (`useMeasurements.ts`)

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type {
  MeasurementMode,
  MeasurementPhase,
  MeasurementResult,
  SnapTarget,
  ViewerRefs,
} from './types';
import { useRaycastPicker } from './useRaycastPicker';
import {
  computePointToPoint,
  computeFaceDistance,
  computeFaceAngle,
  floodFillCoplanarFaces,
  computeFaceGroupInfo,
  collectFaceGroupPoints,
  fitCircleToPoints,
} from './computations';
import {
  createMeasurementAnnotation,
  createPreviewLine,
  updatePreviewLine,
  createFaceHighlight,
  disposeAnnotationGroup,
} from './annotations';

let measurementIdCounter = 0;
function nextId(): string {
  return `m_${++measurementIdCounter}`;
}

interface UseMeasurementsOptions {
  viewerRefs: ViewerRefs | null;
}

export function useMeasurements({ viewerRefs }: UseMeasurementsOptions) {
  const [mode, setMode] = useState<MeasurementMode>('none');
  const [phase, setPhase] = useState<MeasurementPhase>('idle');
  const [results, setResults] = useState<MeasurementResult[]>([]);

  // Three.js objects managed by this hook
  const annotationGroupRef = useRef<THREE.Group>(new THREE.Group());
  const previewLineRef = useRef<THREE.Line | null>(null);
  const faceHighlightRef = useRef<THREE.Mesh | null>(null);

  // Pending first selection
  const pendingSnapRef = useRef<SnapTarget | null>(null);
  const pendingFaceIndicesRef = useRef<number[]>([]);

  // ── Attach annotation group to scene ───────────────────────────
  useEffect(() => {
    if (!viewerRefs) return;
    const group = annotationGroupRef.current;
    group.name = 'measurementAnnotations';
    viewerRefs.scene.add(group);

    const preview = createPreviewLine();
    viewerRefs.scene.add(preview);
    previewLineRef.current = preview;

    return () => {
      viewerRefs.scene.remove(group);
      if (previewLineRef.current) {
        viewerRefs.scene.remove(previewLineRef.current);
        previewLineRef.current.geometry.dispose();
        (previewLineRef.current.material as THREE.Material).dispose();
      }
    };
  }, [viewerRefs]);

  // ── Mode Activation ────────────────────────────────────────────
  const activateMode = useCallback((newMode: MeasurementMode) => {
    if (mode === newMode) {
      // Toggle off
      setMode('none');
      setPhase('idle');
      pendingSnapRef.current = null;
      clearFaceHighlight();
      if (previewLineRef.current) previewLineRef.current.visible = false;
      return;
    }
    setMode(newMode);
    setPhase('picking_first');
    pendingSnapRef.current = null;
    clearFaceHighlight();
    if (previewLineRef.current) previewLineRef.current.visible = false;
  }, [mode]);

  // ── Clear Helpers ──────────────────────────────────────────────
  const clearFaceHighlight = useCallback(() => {
    if (faceHighlightRef.current && viewerRefs) {
      viewerRefs.scene.remove(faceHighlightRef.current);
      faceHighlightRef.current.geometry.dispose();
      (faceHighlightRef.current.material as THREE.Material).dispose();
      faceHighlightRef.current = null;
    }
  }, [viewerRefs]);

  // ── Handle Click on Model ──────────────────────────────────────
  const handleMeasurementClick = useCallback((snap: SnapTarget) => {
    if (mode === 'none') return;

    // ── POINT-TO-POINT ──
    if (mode === 'point-to-point') {
      if (phase === 'picking_first') {
        pendingSnapRef.current = snap;
        setPhase('picking_second');
      } else if (phase === 'picking_second') {
        const a = pendingSnapRef.current!;
        const distance = computePointToPoint(a.point, snap.point);
        const result: MeasurementResult = {
          id: nextId(),
          type: 'point-to-point',
          pointA: a.point.clone(),
          pointB: snap.point.clone(),
          distance,
        };
        addResult(result);
        pendingSnapRef.current = null;
        setPhase('picking_first'); // Ready for next measurement
        if (previewLineRef.current) previewLineRef.current.visible = false;
      }
    }

    // ── FACE-DISTANCE ──
    if (mode === 'face-distance') {
      const faceIndices = floodFillCoplanarFaces(snap.mesh.geometry, snap.faceIndex);

      if (phase === 'picking_first') {
        pendingSnapRef.current = snap;
        pendingFaceIndicesRef.current = faceIndices;

        // Highlight selected face
        clearFaceHighlight();
        const highlight = createFaceHighlight(snap.mesh.geometry, faceIndices, snap.mesh, 0x4a9eff);
        viewerRefs?.scene.add(highlight);
        faceHighlightRef.current = highlight;

        setPhase('picking_second');
      } else if (phase === 'picking_second') {
        const a = pendingSnapRef.current!;
        const aInfo = computeFaceGroupInfo(a.mesh.geometry, pendingFaceIndicesRef.current, a.mesh);
        const bInfo = computeFaceGroupInfo(snap.mesh.geometry, faceIndices, snap.mesh);
        const { distance, isParallel } = computeFaceDistance(
          aInfo.centroid, aInfo.normal,
          bInfo.centroid, bInfo.normal
        );
        const result: MeasurementResult = {
          id: nextId(),
          type: 'face-distance',
          faceA: aInfo,
          faceB: bInfo,
          distance,
          isParallel,
        };
        addResult(result);
        pendingSnapRef.current = null;
        clearFaceHighlight();
        setPhase('picking_first');
      }
    }

    // ── FACE-ANGLE ──
    if (mode === 'face-angle') {
      const faceIndices = floodFillCoplanarFaces(snap.mesh.geometry, snap.faceIndex);

      if (phase === 'picking_first') {
        pendingSnapRef.current = snap;
        pendingFaceIndicesRef.current = faceIndices;

        clearFaceHighlight();
        const highlight = createFaceHighlight(snap.mesh.geometry, faceIndices, snap.mesh, 0xfbbc05);
        viewerRefs?.scene.add(highlight);
        faceHighlightRef.current = highlight;

        setPhase('picking_second');
      } else if (phase === 'picking_second') {
        const a = pendingSnapRef.current!;
        const aInfo = computeFaceGroupInfo(a.mesh.geometry, pendingFaceIndicesRef.current, a.mesh);
        const bInfo = computeFaceGroupInfo(snap.mesh.geometry, faceIndices, snap.mesh);
        const { includedAngleDeg, bendAngleDeg } = computeFaceAngle(aInfo.normal, bInfo.normal);
        const result: MeasurementResult = {
          id: nextId(),
          type: 'face-angle',
          faceA: aInfo,
          faceB: bInfo,
          includedAngleDeg,
          bendAngleDeg,
        };
        addResult(result);
        pendingSnapRef.current = null;
        clearFaceHighlight();
        setPhase('picking_first');
      }
    }

    // ── RADIUS ──
    if (mode === 'radius') {
      // Use a wider angle threshold (30°) to select the whole curved surface
      const faceIndices = floodFillCoplanarFaces(snap.mesh.geometry, snap.faceIndex, 30);
      const { points, normals } = collectFaceGroupPoints(snap.mesh.geometry, faceIndices, snap.mesh);
      const fit = fitCircleToPoints(points, normals);

      if (fit && fit.confidence > 0.5) {
        const result: MeasurementResult = {
          id: nextId(),
          type: 'radius',
          center: fit.center,
          axis: fit.axis,
          radius: fit.radius,
          diameter: fit.radius * 2,
          confidence: fit.confidence,
        };
        addResult(result);
      }
      // Stay in radius mode for next click (single-click mode)
    }
  }, [mode, phase, viewerRefs, clearFaceHighlight]);

  // ── Handle Hover (for preview line) ────────────────────────────
  const handleHover = useCallback((snap: SnapTarget | null) => {
    if (
      mode === 'point-to-point' &&
      phase === 'picking_second' &&
      pendingSnapRef.current &&
      snap &&
      previewLineRef.current
    ) {
      updatePreviewLine(previewLineRef.current, pendingSnapRef.current.point, snap.point);
    }
  }, [mode, phase]);

  // ── Wire up raycaster ──────────────────────────────────────────
  useRaycastPicker({
    viewerRefs,
    active: mode !== 'none',
    onHover: handleHover,
    onClick: handleMeasurementClick,
  });

  // ── Add/Remove Results ─────────────────────────────────────────
  const addResult = useCallback((result: MeasurementResult) => {
    setResults(prev => [...prev, result]);

    // Render annotation
    const annotation = createMeasurementAnnotation(result, deleteResult);
    annotationGroupRef.current.add(annotation);
  }, []);

  const deleteResult = useCallback((id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));

    // Remove annotation from scene
    const child = annotationGroupRef.current.children.find(
      c => c.name === `measurement_${id}`
    );
    if (child) {
      annotationGroupRef.current.remove(child);
      disposeAnnotationGroup(child as THREE.Group);
    }
  }, []);

  const clearAll = useCallback(() => {
    setResults([]);
    // Dispose all annotations
    while (annotationGroupRef.current.children.length > 0) {
      const child = annotationGroupRef.current.children[0];
      annotationGroupRef.current.remove(child);
      disposeAnnotationGroup(child as THREE.Group);
    }
    pendingSnapRef.current = null;
    clearFaceHighlight();
    if (previewLineRef.current) previewLineRef.current.visible = false;
    setPhase(mode === 'none' ? 'idle' : 'picking_first');
  }, [mode, clearFaceHighlight]);

  // ── Keyboard: ESC to cancel ────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMode('none');
        setPhase('idle');
        pendingSnapRef.current = null;
        clearFaceHighlight();
        if (previewLineRef.current) previewLineRef.current.visible = false;
      }
      if (e.key === 'Backspace' && results.length > 0) {
        deleteResult(results[results.length - 1].id);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [results, deleteResult, clearFaceHighlight]);

  return {
    mode,
    phase,
    results,
    activateMode,
    clearAll,
    deleteResult,
  };
}
```

---

## Toolbar Component (`MeasurementToolbar.tsx`)

```tsx
import { Button } from '@/components/ui/button';
import { Move, Layers, TriangleRight, Circle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { MeasurementMode } from './types';

interface MeasurementToolbarProps {
  mode: MeasurementMode;
  onModeChange: (mode: MeasurementMode) => void;
  onClearAll: () => void;
  measurementCount: number;
  disabled?: boolean;
}

const MODES: {
  key: MeasurementMode;
  icon: typeof Move;
  titleKey: string;
}[] = [
  { key: 'point-to-point', icon: Move,           titleKey: 'parts.cadViewer.measurements.pointToPoint' },
  { key: 'face-distance',  icon: Layers,         titleKey: 'parts.cadViewer.measurements.faceDistance' },
  { key: 'face-angle',     icon: TriangleRight,  titleKey: 'parts.cadViewer.measurements.angle' },
  { key: 'radius',         icon: Circle,         titleKey: 'parts.cadViewer.measurements.radius' },
];

export function MeasurementToolbar({
  mode,
  onModeChange,
  onClearAll,
  measurementCount,
  disabled = false,
}: MeasurementToolbarProps) {
  const { t } = useTranslation();

  return (
    <>
      {MODES.map(({ key, icon: Icon, titleKey }) => (
        <Button
          key={key}
          variant="ghost"
          size="sm"
          onClick={() => onModeChange(key)}
          disabled={disabled}
          className={cn(
            'h-7 w-7 p-0',
            mode === key && 'bg-amber-500/20 text-amber-600'
          )}
          title={t(titleKey)}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}

      {measurementCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive"
          title={t('parts.cadViewer.measurements.clearAll')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </>
  );
}
```

---

## Measurement Panel (`MeasurementPanel.tsx`)

```tsx
import { Move, Layers, TriangleRight, Circle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MeasurementResult } from './types';

interface MeasurementPanelProps {
  results: MeasurementResult[];
  onDelete: (id: string) => void;
}

const TYPE_ICONS = {
  'point-to-point': Move,
  'face-distance': Layers,
  'face-angle': TriangleRight,
  'radius': Circle,
} as const;

const TYPE_COLORS = {
  'point-to-point': 'text-blue-400',
  'face-distance': 'text-green-400',
  'face-angle': 'text-yellow-400',
  'radius': 'text-purple-400',
} as const;

function formatResult(r: MeasurementResult): string {
  switch (r.type) {
    case 'point-to-point':
      return `${r.distance.toFixed(2)} mm`;
    case 'face-distance':
      return `${r.distance.toFixed(2)} mm${r.isParallel ? '' : ' ~'}`;
    case 'face-angle':
      return `${r.includedAngleDeg.toFixed(1)}° (bend ${r.bendAngleDeg.toFixed(1)}°)`;
    case 'radius':
      return `R${r.radius.toFixed(2)} / D${r.diameter.toFixed(2)} mm`;
  }
}

export function MeasurementPanel({ results, onDelete }: MeasurementPanelProps) {
  const { t } = useTranslation();

  if (results.length === 0) return null;

  return (
    <div className="absolute top-3 right-3 z-10">
      <div className="glass-card p-3 min-w-[200px] max-w-[260px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">
            {t('parts.cadViewer.measurements.title')}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {results.length}
          </span>
        </div>
        <div className="space-y-1">
          {results.map((r) => {
            const Icon = TYPE_ICONS[r.type];
            const colorClass = TYPE_COLORS[r.type];
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 py-1 border-t border-border/30"
              >
                <Icon className={`h-3 w-3 flex-shrink-0 ${colorClass}`} />
                <span className="text-[11px] font-mono text-foreground flex-1 tabular-nums">
                  {formatResult(r)}
                </span>
                <button
                  onClick={() => onDelete(r.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border/50 mt-2 pt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
            <span className="text-[10px] text-muted-foreground">
              {t('parts.cadViewer.measurements.meshDisclaimer')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## STEPViewer Integration

Changes to `src/components/STEPViewer.tsx` (~60 lines):

### 1. Imports (top of file)

```typescript
// Add after existing imports:
import { installBVH } from './viewer/measurements/setupBVH';
import { useMeasurements } from './viewer/measurements/useMeasurements';
import { MeasurementToolbar } from './viewer/measurements/MeasurementToolbar';
import { MeasurementPanel } from './viewer/measurements/MeasurementPanel';
import type { ViewerRefs } from './viewer/measurements/types';

// Install BVH acceleration (idempotent, safe to call multiple times)
installBVH();
```

### 2. BVH in `addMeshToScene` (line 336)

```typescript
const addMeshToScene = useCallback((mesh: THREE.Mesh) => {
  if (!sceneRef.current) return;

  // Build BVH for accelerated raycasting
  mesh.geometry.computeBoundsTree();

  meshesRef.current.push(mesh);
  // ... rest unchanged ...
}, [edgesVisible]);
```

### 3. BVH cleanup in `clearMeshes` (line 300)

```typescript
// Before mesh.geometry.dispose():
mesh.geometry.disposeBoundsTree();
```

### 4. ViewerRefs & hook (inside component body, after existing refs)

```typescript
// Build ViewerRefs object for measurement hooks
const viewerRefs: ViewerRefs | null =
  containerRef.current && sceneRef.current && cameraRef.current &&
  rendererRef.current && controlsRef.current
    ? {
        container: containerRef.current,
        scene: sceneRef.current,
        camera: cameraRef.current,
        renderer: rendererRef.current,
        meshes: meshesRef.current,
        controls: controlsRef.current,
      }
    : null;

const {
  mode: measurementMode,
  phase: measurementPhase,
  results: measurements,
  activateMode,
  clearAll: clearMeasurements,
  deleteResult: deleteMeasurement,
} = useMeasurements({ viewerRefs });
```

### 5. Toolbar JSX (after PMI toggle, ~line 1709)

```tsx
{/* Measurement Tools */}
<div className="w-px h-4 bg-border mx-0.5" />
<MeasurementToolbar
  mode={measurementMode}
  onModeChange={activateMode}
  onClearAll={clearMeasurements}
  measurementCount={measurements.length}
  disabled={stepLoading || meshesRef.current.length === 0}
/>
```

### 6. Status bar & panel (inside viewport area, after loading overlay)

```tsx
{/* Measurement Panel */}
{measurements.length > 0 && !showDimensions && (
  <MeasurementPanel
    results={measurements}
    onDelete={deleteMeasurement}
  />
)}

{/* Measurement Mode Status Bar */}
{measurementMode !== 'none' && (
  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
    <div className="glass-card px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
      <span>
        {measurementPhase === 'picking_first'
          ? t('parts.cadViewer.measurements.selectFirstPoint')
          : t('parts.cadViewer.measurements.selectSecondPoint')}
      </span>
      <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">ESC</kbd>
    </div>
  </div>
)}
```

---

## Translation Keys

### `src/i18n/locales/en/jobs.json`

Add under `parts.cadViewer`:

```json
"measurements": {
  "title": "Measurements",
  "pointToPoint": "Point-to-Point Distance",
  "faceDistance": "Face-to-Face Distance",
  "angle": "Angle Between Faces",
  "radius": "Radius / Diameter",
  "selectFirstPoint": "Click to select the first point",
  "selectSecondPoint": "Click to select the second point",
  "selectFirstFace": "Click to select the first face",
  "selectSecondFace": "Click to select the second face",
  "clearAll": "Clear All Measurements",
  "meshDisclaimer": "Measured from tessellated mesh"
}
```

### `src/i18n/locales/nl/jobs.json`

```json
"measurements": {
  "title": "Metingen",
  "pointToPoint": "Punt-tot-punt afstand",
  "faceDistance": "Vlak-tot-vlak afstand",
  "angle": "Hoek tussen vlakken",
  "radius": "Straal / Diameter",
  "selectFirstPoint": "Klik om het eerste punt te selecteren",
  "selectSecondPoint": "Klik om het tweede punt te selecteren",
  "selectFirstFace": "Klik om het eerste vlak te selecteren",
  "selectSecondFace": "Klik om het tweede vlak te selecteren",
  "clearAll": "Alle metingen wissen",
  "meshDisclaimer": "Gemeten van getrianguleerd oppervlak"
}
```

### `src/i18n/locales/de/jobs.json`

```json
"measurements": {
  "title": "Messungen",
  "pointToPoint": "Punkt-zu-Punkt Abstand",
  "faceDistance": "Flache-zu-Flache Abstand",
  "angle": "Winkel zwischen Flachen",
  "radius": "Radius / Durchmesser",
  "selectFirstPoint": "Klicken Sie auf den ersten Punkt",
  "selectSecondPoint": "Klicken Sie auf den zweiten Punkt",
  "selectFirstFace": "Klicken Sie auf die erste Flache",
  "selectSecondFace": "Klicken Sie auf die zweite Flache",
  "clearAll": "Alle Messungen loschen",
  "meshDisclaimer": "Gemessen vom triangulierten Netz"
}
```

---

## Phased Delivery

| Phase | What Ships | Files Touched | Dependency |
|---|---|---|---|
| **Phase 1** | Point-to-point distance + snap indicators + live preview line | All new files + STEPViewer integration + translations | `three-mesh-bvh` install |
| **Phase 2** | Face-to-face distance + coplanar flood fill + face highlighting | `computations.ts`, `annotations.ts`, `useMeasurements.ts` additions | Phase 1 |
| **Phase 3** | Angle measurement + radius/diameter fitting + bend angle | Same files, new cases in state machine | Phase 2 |
| **Phase 4** | Measurement panel, keyboard shortcuts, UX polish | `MeasurementPanel.tsx`, minor state machine tweaks | Phase 1-3 |

**All 4 phases can ship together** since the code is modular and the state machine handles all modes from day one. The phasing is for review/testing granularity, not separate deployments.

---

## Interaction Matrix

| Existing Feature | Measurement Behavior |
|---|---|
| **OrbitControls** | Coexist via click/drag timing (200ms/5px threshold) |
| **Exploded view** | Measurements cleared on explosion factor change |
| **Wireframe mode** | Raycasting works against geometry regardless of material wireframe flag |
| **Feature highlighting** | Coexists; measurement face highlights render on top (renderOrder 995) |
| **PMI labels** | Both use CSS2DRenderer; measurement labels have higher z-index via pointer-events |
| **Bounding box overlay** | Independent; measurement panel hides when bbox panel is shown |
| **Edge visibility toggle** | No interaction; measurements use separate line objects |

---

## Performance Budget

| Operation | Cost | When |
|---|---|---|
| `computeBoundsTree()` | ~5-20ms per mesh | Once on model load |
| `raycastFirst()` via BVH | <0.1ms per ray | On every mouse move (when active) |
| Vertex snap (3 vertices) | <0.01ms | On every mouse move (when active) |
| Edge snap (3 edges) | <0.01ms | On every mouse move (when active) |
| `floodFillCoplanarFaces()` | 5-50ms (builds adjacency) | On face click only |
| `fitCircleToPoints()` | <1ms | On radius click only |
| Annotation render | <1ms per annotation | On result creation |

**Total hover-frame overhead when measuring**: ~0.15ms (negligible at 60fps budget of 16.6ms).

---

## Dependencies

```json
{
  "three-mesh-bvh": "^0.9.0"
}
```

Peer dep `three >= 0.159.0` satisfied by our `three ^0.182.0`. No other new dependencies.
