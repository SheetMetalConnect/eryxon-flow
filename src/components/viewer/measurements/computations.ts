import * as THREE from 'three';

// ── Point-to-Point Distance ───────────────────────────────────────

export function computePointToPoint(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceTo(b);
}

// ── Face-to-Face Distance ─────────────────────────────────────────

export function computeFaceDistance(
  centroidA: THREE.Vector3,
  normalA: THREE.Vector3,
  centroidB: THREE.Vector3,
  normalB: THREE.Vector3
): { distance: number; isParallel: boolean } {
  const dot = Math.abs(normalA.dot(normalB));
  const isParallel = dot > 0.996; // cos(5 deg)

  if (isParallel) {
    const ab = new THREE.Vector3().subVectors(centroidB, centroidA);
    const distance = Math.abs(ab.dot(normalA));
    return { distance, isParallel: true };
  }

  return {
    distance: centroidA.distanceTo(centroidB),
    isParallel: false,
  };
}

// ── Angle Between Faces ───────────────────────────────────────────

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

// ── Radius / Diameter via Kasa Circle Fit ─────────────────────────

export function fitCircleToPoints(
  points3D: THREE.Vector3[],
  normals3D: THREE.Vector3[]
): {
  center: THREE.Vector3;
  axis: THREE.Vector3;
  radius: number;
  confidence: number;
} | null {
  if (points3D.length < 6) return null;

  // Check that normals actually vary (curved surface, not flat)
  // If all normals point in the same direction, this is a flat surface — no radius
  const avgNormal = new THREE.Vector3();
  for (const n of normals3D) avgNormal.add(n);
  avgNormal.normalize();

  let normalVariance = 0;
  for (const n of normals3D) {
    normalVariance += 1 - Math.abs(n.dot(avgNormal));
  }
  normalVariance /= normals3D.length;

  // If normals barely vary (< ~3° average deviation), this is a flat surface
  if (normalVariance < 0.002) return null;

  // Estimate cylinder axis as average normal direction
  const axis = avgNormal.clone();

  // Build local 2D coordinate system perpendicular to axis
  const ref = Math.abs(axis.y) < 0.9
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const basisU = new THREE.Vector3().crossVectors(axis, ref).normalize();
  const basisV = new THREE.Vector3().crossVectors(axis, basisU).normalize();

  // Centroid of 3D points
  const centroid3D = new THREE.Vector3();
  for (const p of points3D) centroid3D.add(p);
  centroid3D.divideScalar(points3D.length);

  // Project 3D points to 2D plane
  const points2D = points3D.map(p => {
    const offset = new THREE.Vector3().subVectors(p, centroid3D);
    return new THREE.Vector2(offset.dot(basisU), offset.dot(basisV));
  });

  // Kasa algebraic circle fit
  const n = points2D.length;
  let sumX = 0, sumY = 0;
  let sumX2 = 0, sumY2 = 0, sumXY = 0;
  let sumX3 = 0, sumY3 = 0;
  let sumX2Y = 0, sumXY2 = 0;

  for (const p of points2D) {
    const { x, y } = p;
    sumX += x; sumY += y;
    sumX2 += x * x; sumY2 += y * y; sumXY += x * y;
    sumX3 += x * x * x; sumY3 += y * y * y;
    sumX2Y += x * x * y; sumXY2 += x * y * y;
  }

  const A11 = sumX2 - sumX * sumX / n;
  const A12 = sumXY - sumX * sumY / n;
  const A22 = sumY2 - sumY * sumY / n;
  const b1 = 0.5 * (sumX3 + sumXY2 - sumX * (sumX2 + sumY2) / n);
  const b2 = 0.5 * (sumX2Y + sumY3 - sumY * (sumX2 + sumY2) / n);

  const det = A11 * A22 - A12 * A12;
  if (Math.abs(det) < 1e-10) return null;

  const cx = (A22 * b1 - A12 * b2) / det;
  const cy = (A11 * b2 - A12 * b1) / det;

  // Compute radius
  let sumR = 0;
  for (const p of points2D) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    sumR += Math.sqrt(dx * dx + dy * dy);
  }
  const radius = sumR / n;

  // Sanity check: radius should not be absurdly large relative to the point cloud extent
  const bbox2D = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const p of points2D) {
    bbox2D.minX = Math.min(bbox2D.minX, p.x);
    bbox2D.maxX = Math.max(bbox2D.maxX, p.x);
    bbox2D.minY = Math.min(bbox2D.minY, p.y);
    bbox2D.maxY = Math.max(bbox2D.maxY, p.y);
  }
  const extent = Math.max(bbox2D.maxX - bbox2D.minX, bbox2D.maxY - bbox2D.minY);
  // If radius > 10x the point cloud extent, this is likely a nearly-flat surface
  if (radius > extent * 10) return null;

  // Confidence (average residual relative to radius)
  let sumResidual = 0;
  for (const p of points2D) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    sumResidual += Math.abs(r - radius);
  }
  const avgResidual = sumResidual / n;
  const confidence = Math.max(0, 1 - avgResidual / (radius || 1));

  // Convert center back to 3D
  const center = centroid3D.clone()
    .add(basisU.clone().multiplyScalar(cx))
    .add(basisV.clone().multiplyScalar(cy));

  return { center, axis: axis.clone(), radius, confidence };
}

// ── Coplanar Face Flood Fill ──────────────────────────────────────

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

  // Build edge -> triangle adjacency map
  const edgeToTris = new Map<string, number[]>();
  for (let ti = 0; ti < triCount; ti++) {
    const a = index.getX(ti * 3);
    const b = index.getX(ti * 3 + 1);
    const c = index.getX(ti * 3 + 2);

    const edges: [number, number][] = [[a, b], [b, c], [c, a]];
    for (const [v0, v1] of edges) {
      const key = v0 < v1 ? `${v0}_${v1}` : `${v1}_${v0}`;
      let bucket = edgeToTris.get(key);
      if (!bucket) {
        bucket = [];
        edgeToTris.set(key, bucket);
      }
      bucket.push(ti);
    }
  }

  const getFaceNormal = (ti: number): THREE.Vector3 => {
    const i0 = index.getX(ti * 3);
    const i1 = index.getX(ti * 3 + 1);
    const i2 = index.getX(ti * 3 + 2);
    return new THREE.Vector3(
      (normalAttr.getX(i0) + normalAttr.getX(i1) + normalAttr.getX(i2)) / 3,
      (normalAttr.getY(i0) + normalAttr.getY(i1) + normalAttr.getY(i2)) / 3,
      (normalAttr.getZ(i0) + normalAttr.getZ(i1) + normalAttr.getZ(i2)) / 3,
    ).normalize();
  };

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

    const a = index.getX(ti * 3);
    const b = index.getX(ti * 3 + 1);
    const c = index.getX(ti * 3 + 2);

    const edges: [number, number][] = [[a, b], [b, c], [c, a]];
    for (const [v0, v1] of edges) {
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

// ── Face Group Info ──────────────────────────────────────────────

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
