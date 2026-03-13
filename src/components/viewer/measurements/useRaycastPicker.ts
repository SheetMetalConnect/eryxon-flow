import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { getTriangleHitPointInfo } from 'three-mesh-bvh';
import { viewerColors } from '@/theme/theme';
import type { SnapTarget, SnapType, ViewerRefs } from './types';

interface UseRaycastPickerOptions {
  viewerRefs: ViewerRefs | null;
  active: boolean;
  onHover?: (snap: SnapTarget | null) => void;
  onClick?: (snap: SnapTarget) => void;
}

const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();
const _tempVec3 = new THREE.Vector3();

const CLICK_MAX_TIME = 200;
const CLICK_MAX_DIST = 5;
const VERTEX_SNAP_PX = 8;
const EDGE_SNAP_PX = 6;

export function useRaycastPicker({
  viewerRefs,
  active,
  onHover,
  onClick,
}: UseRaycastPickerOptions) {
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const snapIndicatorRef = useRef<THREE.Mesh | null>(null);

  const createSnapIndicator = useCallback((scene: THREE.Scene) => {
    if (snapIndicatorRef.current) return;
    const geo = new THREE.SphereGeometry(viewerColors.measurementMarkerSize, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: viewerColors.snapVertex,
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

  const castRay = useCallback(
    (clientX: number, clientY: number): SnapTarget | null => {
      if (!viewerRefs) return null;
      const { container, camera, meshes } = viewerRefs;
      const rect = container.getBoundingClientRect();

      _mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_mouse, camera);
      (_raycaster as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;

      const intersects = _raycaster.intersectObjects(meshes, false);
      if (intersects.length === 0) return null;

      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;
      const geometry = mesh.geometry;
      const faceIndex = hit.faceIndex!;

      // Get face normal via three-mesh-bvh helper
      const hitInfo = getTriangleHitPointInfo(
        hit.point,
        geometry,
        faceIndex
      );
      const faceNormal = hitInfo.face.normal.clone();
      faceNormal.transformDirection(mesh.matrixWorld);

      // Try vertex snap
      const vertexSnap = tryVertexSnap(
        hit.point, geometry, faceIndex, mesh, camera, container
      );
      if (vertexSnap) {
        return {
          point: vertexSnap,
          type: 'vertex' as SnapType,
          mesh,
          faceIndex,
          normal: faceNormal,
        };
      }

      // Try edge snap
      const edgeSnap = tryEdgeSnap(
        hit.point, geometry, faceIndex, mesh, camera, container
      );
      if (edgeSnap) {
        return {
          point: edgeSnap,
          type: 'edge' as SnapType,
          mesh,
          faceIndex,
          normal: faceNormal,
        };
      }

      // Face snap (default)
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

  // ── Event Handlers ──────────────────────────────────────────────

  useEffect(() => {
    if (!active || !viewerRefs) return;
    const { container, scene } = viewerRefs;

    createSnapIndicator(scene);

    const onPointerMove = (e: PointerEvent) => {
      const snap = castRay(e.clientX, e.clientY);
      if (snapIndicatorRef.current) {
        if (snap) {
          snapIndicatorRef.current.position.copy(snap.point);
          snapIndicatorRef.current.visible = true;
          const mat = snapIndicatorRef.current.material as THREE.MeshBasicMaterial;
          mat.color.setHex(
            snap.type === 'vertex' ? viewerColors.snapVertex :
            snap.type === 'edge'   ? viewerColors.snapEdge :
                                     viewerColors.snapFace
          );
        } else {
          snapIndicatorRef.current.visible = false;
        }
      }
      onHover?.(snap);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointerDownRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0 || !pointerDownRef.current) return;

      const { x, y, time } = pointerDownRef.current;
      pointerDownRef.current = null;

      const elapsed = Date.now() - time;
      const dist = Math.hypot(e.clientX - x, e.clientY - y);

      if (elapsed < CLICK_MAX_TIME && dist < CLICK_MAX_DIST) {
        const snap = castRay(e.clientX, e.clientY);
        if (snap) {
          onClick?.(snap);
        }
      }
    };

    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.style.cursor = 'crosshair';

    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.style.cursor = '';
      if (snapIndicatorRef.current) {
        snapIndicatorRef.current.visible = false;
      }
    };
  }, [active, viewerRefs, castRay, createSnapIndicator, onHover, onClick]);

  return { castRay };
}

// ── Vertex Snap Helper ────────────────────────────────────────────

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

  const rect = container.getBoundingClientRect();
  const i0 = index.getX(faceIndex * 3);
  const i1 = index.getX(faceIndex * 3 + 1);
  const i2 = index.getX(faceIndex * 3 + 2);

  const hitScreen = hitPoint.clone().project(camera);
  const hitPx = new THREE.Vector2(
    (hitScreen.x + 1) / 2 * rect.width,
    (-hitScreen.y + 1) / 2 * rect.height
  );

  let bestDist = Infinity;
  let bestVertex: THREE.Vector3 | null = null;

  for (const vi of [i0, i1, i2]) {
    _tempVec3.fromBufferAttribute(posAttr, vi);
    mesh.localToWorld(_tempVec3);

    const screenPos = _tempVec3.clone().project(camera);
    const px = new THREE.Vector2(
      (screenPos.x + 1) / 2 * rect.width,
      (-screenPos.y + 1) / 2 * rect.height
    );

    const dist = px.distanceTo(hitPx);
    if (dist < VERTEX_SNAP_PX && dist < bestDist) {
      bestDist = dist;
      bestVertex = _tempVec3.clone();
    }
  }

  return bestVertex;
}

// ── Edge Snap Helper ──────────────────────────────────────────────

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

  const rect = container.getBoundingClientRect();
  const i0 = index.getX(faceIndex * 3);
  const i1 = index.getX(faceIndex * 3 + 1);
  const i2 = index.getX(faceIndex * 3 + 2);

  const verts = [i0, i1, i2].map(vi => {
    const v = new THREE.Vector3().fromBufferAttribute(posAttr, vi);
    mesh.localToWorld(v);
    return v;
  });

  const edges: [THREE.Vector3, THREE.Vector3][] = [
    [verts[0], verts[1]],
    [verts[1], verts[2]],
    [verts[2], verts[0]],
  ];

  let bestDist = Infinity;
  let bestPoint: THREE.Vector3 | null = null;

  for (const [a, b] of edges) {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ap = new THREE.Vector3().subVectors(hitPoint, a);
    let t = ap.dot(ab) / ab.dot(ab);
    t = Math.max(0, Math.min(1, t));
    const projected = a.clone().add(ab.multiplyScalar(t));

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
    if (dist < EDGE_SNAP_PX && dist < bestDist) {
      bestDist = dist;
      bestPoint = projected;
    }
  }

  return bestPoint;
}
