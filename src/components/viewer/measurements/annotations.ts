import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { viewerColors } from '@/theme/theme';
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
  const markerGeo = new THREE.SphereGeometry(viewerColors.measurementMarkerSize, 16, 16);
  const markerMat = new THREE.MeshBasicMaterial({
    color: viewerColors.measurementMarker,
    depthTest: false,
  });

  const markerA = new THREE.Mesh(markerGeo, markerMat);
  markerA.position.copy(result.pointA);
  markerA.renderOrder = 998;
  group.add(markerA);

  const markerB = new THREE.Mesh(markerGeo.clone(), markerMat.clone());
  markerB.position.copy(result.pointB);
  markerB.renderOrder = 998;
  group.add(markerB);

  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    result.pointA,
    result.pointB,
  ]);
  const lineMat = new THREE.LineDashedMaterial({
    color: viewerColors.linePointToPoint,
    dashSize: 3,
    gapSize: 2,
    depthTest: false,
    linewidth: viewerColors.measurementLineWidth,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  line.computeLineDistances();
  line.renderOrder = 997;
  group.add(line);

  const midpoint = new THREE.Vector3()
    .addVectors(result.pointA, result.pointB)
    .multiplyScalar(0.5);
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

  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    faceA.centroid,
    faceB.centroid,
  ]);
  const lineMat = new THREE.LineDashedMaterial({
    color: viewerColors.lineFaceDistance,
    dashSize: 3,
    gapSize: 2,
    depthTest: false,
    linewidth: viewerColors.measurementLineWidth,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  line.computeLineDistances();
  line.renderOrder = 997;
  group.add(line);

  group.add(createArrowhead(faceA.centroid, faceB.centroid, viewerColors.lineFaceDistance));
  group.add(createArrowhead(faceB.centroid, faceA.centroid, viewerColors.lineFaceDistance));

  const midpoint = new THREE.Vector3()
    .addVectors(faceA.centroid, faceB.centroid)
    .multiplyScalar(0.5);
  const suffix = result.isParallel ? ' mm' : ' mm (non-\u2225)';
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

  const midpoint = new THREE.Vector3()
    .addVectors(faceA.centroid, faceB.centroid)
    .multiplyScalar(0.5);

  const normalLength = faceA.centroid.distanceTo(faceB.centroid) * 0.3;

  // Normal indicator lines
  const normalLineA = new THREE.BufferGeometry().setFromPoints([
    faceA.centroid,
    faceA.centroid.clone().add(faceA.normal.clone().multiplyScalar(normalLength)),
  ]);
  const normalLineB = new THREE.BufferGeometry().setFromPoints([
    faceB.centroid,
    faceB.centroid.clone().add(faceB.normal.clone().multiplyScalar(normalLength)),
  ]);
  const normalMat = new THREE.LineBasicMaterial({
    color: viewerColors.lineFaceAngle,
    depthTest: false,
    linewidth: viewerColors.measurementLineWidth,
  });

  const lineA = new THREE.Line(normalLineA, normalMat);
  lineA.renderOrder = 997;
  group.add(lineA);

  const lineB = new THREE.Line(normalLineB, normalMat.clone());
  lineB.renderOrder = 997;
  group.add(lineB);

  // Arc between normals
  const arcRadius = normalLength * 0.6;
  const arcPoints: THREE.Vector3[] = [];
  const nA = faceA.normal.clone().normalize();
  const nB = faceB.normal.clone().normalize();
  const steps = 24;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const interpolated = new THREE.Vector3()
      .copy(nA)
      .lerp(nB, t)
      .normalize()
      .multiplyScalar(arcRadius);
    arcPoints.push(midpoint.clone().add(interpolated));
  }

  const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
  const arcMat = new THREE.LineBasicMaterial({
    color: viewerColors.lineFaceAngle,
    depthTest: false,
    linewidth: viewerColors.measurementLineWidth,
  });
  const arc = new THREE.Line(arcGeo, arcMat);
  arc.renderOrder = 997;
  group.add(arc);

  const labelPos = midpoint.clone().add(
    nA.clone().lerp(nB, 0.5).normalize().multiplyScalar(arcRadius * 1.3)
  );
  const text = `${result.includedAngleDeg.toFixed(1)}\u00B0\nBend: ${result.bendAngleDeg.toFixed(1)}\u00B0`;
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
  const markerGeo = new THREE.SphereGeometry(viewerColors.measurementMarkerSize, 16, 16);
  const markerMat = new THREE.MeshBasicMaterial({
    color: viewerColors.lineRadius,
    depthTest: false,
  });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.copy(result.center);
  marker.renderOrder = 998;
  group.add(marker);

  const confidenceStr = result.confidence > 0.95 ? '' : ` (~${(result.confidence * 100).toFixed(0)}%)`;
  const text = `R ${result.radius.toFixed(2)} mm\n\u2300 ${result.diameter.toFixed(2)} mm${confidenceStr}`;
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
  div.style.cssText = [
    `background: var(--viewer-measurement-label-bg, rgba(0, 0, 0, 0.88))`,
    'color: white',
    'padding: 4px 12px',
    'border-radius: 6px',
    'font-size: 12px',
    'font-weight: 600',
    "font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace",
    'white-space: pre-line',
    'pointer-events: auto',
    'user-select: none',
    'display: flex',
    'align-items: center',
    'gap: 6px',
    `border: 1.5px solid var(--viewer-measurement-label-border, rgba(255, 107, 0, 0.4))`,
    'backdrop-filter: blur(8px)',
    'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.2)',
    'text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5)',
    'z-index: 10',
  ].join(';');

  const textSpan = document.createElement('span');
  textSpan.textContent = text;
  div.appendChild(textSpan);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '\u00D7';
  deleteBtn.style.cssText = [
    'background: none',
    'border: none',
    'color: rgba(255, 255, 255, 0.5)',
    'font-size: 14px',
    'cursor: pointer',
    'padding: 0 2px',
    'line-height: 1',
  ].join(';');
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

export function createPreviewLine(): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ]);
  const mat = new THREE.LineBasicMaterial({
    color: viewerColors.linePointToPoint,
    transparent: true,
    opacity: 0.6,
    depthTest: false,
    linewidth: viewerColors.measurementLineWidth,
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

export function createFaceHighlight(
  geometry: THREE.BufferGeometry,
  faceIndices: number[],
  mesh: THREE.Mesh,
  color: number = viewerColors.linePointToPoint
): THREE.Mesh {
  const index = geometry.index!;
  const posAttr = geometry.attributes.position;

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
        (child.material as THREE.Material).dispose();
      }
    }
    if (child instanceof CSS2DObject) {
      child.element.remove();
    }
  });
}
