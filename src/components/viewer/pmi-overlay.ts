import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type {
  PMIData,
  PMIDimension,
} from '@/hooks/useCADProcessing';
import { logger } from '@/lib/logger';
import type { PMIFilter } from './types';

// ── Position helpers ──────────────────────────────────────────────

/**
 * Transform a STEP-origin PMI position into scene-space.
 * Falls back to a radial layout around the bounding box when the backend
 * returns [0,0,0].
 */
export function transformPMIPosition(
  stepPosition: { x: number; y: number; z: number },
  meshes: THREE.Mesh[],
  fallbackIndex?: number
): THREE.Vector3 {
  if (
    !stepPosition ||
    typeof stepPosition.x !== 'number' ||
    typeof stepPosition.y !== 'number' ||
    typeof stepPosition.z !== 'number' ||
    !isFinite(stepPosition.x) ||
    !isFinite(stepPosition.y) ||
    !isFinite(stepPosition.z)
  ) {
    logger.warn('STEPViewer', 'Invalid PMI position', stepPosition);
    return new THREE.Vector3(0, 0, 0);
  }

  const isZeroPosition =
    stepPosition.x === 0 && stepPosition.y === 0 && stepPosition.z === 0;

  if (isZeroPosition && typeof fallbackIndex === 'number' && meshes.length > 0) {
    const box = new THREE.Box3();
    meshes.forEach((mesh) => box.expandByObject(mesh));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const totalDimensions = 27;
    const layers = 3;
    const layer = fallbackIndex % layers;
    const itemsPerLayer = Math.ceil(totalDimensions / layers);
    const angleStep = ((360 / itemsPerLayer) * Math.PI) / 180;
    const angle = Math.floor(fallbackIndex / layers) * angleStep;

    const baseRadius = Math.max(size.x, size.y, size.z) * 0.7;
    const radius = baseRadius + layer * size.x * 0.1;
    const heightOffset = (layer - 1) * size.y * 0.35;
    const height = center.y + heightOffset;

    logger.debug(
      'STEPViewer',
      `Using fallback position for dimension ${fallbackIndex + 1}: [${center.x + Math.cos(angle) * radius}, ${height}, ${center.z + Math.sin(angle) * radius}]`
    );

    return new THREE.Vector3(
      center.x + Math.cos(angle) * radius,
      height,
      center.z + Math.sin(angle) * radius
    );
  }

  const x = stepPosition.x;
  const y = stepPosition.y;
  const z = stepPosition.z;

  logger.debug(
    'STEPViewer',
    `Using backend PMI position: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`
  );

  if (meshes.length > 0) {
    const box = new THREE.Box3();
    meshes.forEach((mesh) => box.expandByObject(mesh));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    const distanceFromCenter = new THREE.Vector3(
      x - center.x,
      y - center.y,
      z - center.z
    ).length();
    const reasonableDistance = maxDimension * 2;

    if (distanceFromCenter > reasonableDistance) {
      logger.debug(
        'STEPViewer',
        `PMI position too far (${distanceFromCenter.toFixed(2)} > ${reasonableDistance.toFixed(2)}), scaling down`
      );
      const scaleFactor = reasonableDistance / distanceFromCenter;
      return new THREE.Vector3(
        center.x + (x - center.x) * scaleFactor,
        center.y + (y - center.y) * scaleFactor,
        center.z + (z - center.z) * scaleFactor
      );
    }
  }

  return new THREE.Vector3(x, y, z);
}

// ── Arrowhead helper ──────────────────────────────────────────────

export function createArrowhead(
  from: THREE.Vector3,
  to: THREE.Vector3
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(to, from).normalize();
  const length = 2;
  const coneGeometry = new THREE.ConeGeometry(0.5, length, 8);
  const coneMaterial = new THREE.MeshBasicMaterial({ color: 0x00bcd4 });
  const cone = new THREE.Mesh(coneGeometry, coneMaterial);

  cone.position.copy(to);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  return cone;
}

// ── Dispose a PMI group ──────────────────────────────────────────

export function disposePMIGroup(scene: THREE.Scene, group: THREE.Group): void {
  group.traverse((child: THREE.Object3D) => {
    if (child instanceof CSS2DObject) {
      if (child.element.parentNode) {
        child.element.parentNode.removeChild(child.element);
      }
    }
    if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m: THREE.Material) => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
    }
  });
  scene.remove(group);
}

// ── Build the full PMI annotation layer ──────────────────────────

export function createPMIVisualization(
  scene: THREE.Scene,
  meshes: THREE.Mesh[],
  pmiData: PMIData,
  pmiFilter: PMIFilter,
  existingGroup: THREE.Group | null,
  processingMode: 'server' | 'browser' | null
): THREE.Group {
  const box = new THREE.Box3();
  meshes.forEach((mesh) => box.expandByObject(mesh));
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  logger.debug('STEPViewer', 'Creating PMI visualization with data', {
    dimensions: pmiData.dimensions.length,
    tolerances: pmiData.geometric_tolerances.length,
    datums: pmiData.datums.length,
    processingMode,
    meshCount: meshes.length,
    geometryBounds: {
      center: [center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2)],
      size: [size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2)],
      min: [box.min.x.toFixed(2), box.min.y.toFixed(2), box.min.z.toFixed(2)],
      max: [box.max.x.toFixed(2), box.max.y.toFixed(2), box.max.z.toFixed(2)],
    },
  });

  if (existingGroup) {
    disposePMIGroup(scene, existingGroup);
  }

  const group = new THREE.Group();
  group.name = 'pmiAnnotations';

  const invalidCoordinateCount = pmiData.dimensions.filter(
    (dim) => dim.position.x === 0 && dim.position.y === 0 && dim.position.z === 0
  ).length;

  if (invalidCoordinateCount > 0) {
    logger.warn(
      'STEPViewer',
      `Backend PMI coordinate issue: ${invalidCoordinateCount}/${pmiData.dimensions.length} dimensions have invalid coordinates [0,0,0]. Using fallback positioning.`
    );
  }

  const pmiColor = 0x00bcd4;
  const lineMaterial = new THREE.LineBasicMaterial({
    color: pmiColor,
    linewidth: 2,
    transparent: true,
    opacity: 0.9,
  });

  // ── Dimensions ──────────────────────────────────────────
  if (pmiFilter === 'all' || pmiFilter === 'dimensions') {
    pmiData.dimensions.forEach((dim: PMIDimension, index: number) => {
      try {
        if (!dim || !dim.position || !dim.text) {
          logger.warn('STEPViewer', 'Invalid dimension data', dim);
          return;
        }

        logger.debug(
          'STEPViewer',
          `Creating dimension ${index + 1}/${pmiData.dimensions.length}`,
          { text: dim.text, position: dim.position, type: dim.type }
        );

        const labelDiv = document.createElement('div');
        labelDiv.className = 'pmi-label';
        labelDiv.style.cssText = `
          background: rgba(255, 255, 255, 0.95);
          color: #1a1a1a;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 11px;
          font-family: 'Segoe UI', system-ui, sans-serif;
          font-weight: 500;
          white-space: nowrap;
          pointer-events: none;
          border: 1px solid #0891b2;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(4px);
        `;
        labelDiv.textContent = dim.text;
        labelDiv.title = `${dim.type}: ${dim.text}`;

        const label = new CSS2DObject(labelDiv);
        const transformedPos = transformPMIPosition(dim.position, meshes, index);

        if (meshes.length > 0) {
          const innerBox = new THREE.Box3();
          meshes.forEach((mesh) => innerBox.expandByObject(mesh));
          const innerCenter = innerBox.getCenter(new THREE.Vector3());
          const innerSize = innerBox.getSize(new THREE.Vector3());

          const direction = new THREE.Vector3()
            .subVectors(transformedPos, innerCenter)
            .normalize();
          const offset = Math.max(innerSize.x, innerSize.y, innerSize.z) * 0.15;
          transformedPos.add(direction.multiplyScalar(offset));
        }

        logger.debug(
          'STEPViewer',
          `Dimension ${index + 1} position - Original: [${dim.position.x.toFixed(2)}, ${dim.position.y.toFixed(2)}, ${dim.position.z.toFixed(2)}] -> Final: [${transformedPos.x.toFixed(2)}, ${transformedPos.y.toFixed(2)}, ${transformedPos.z.toFixed(2)}]`
        );

        label.position.copy(transformedPos);
        group.add(label);

        if (dim.leader_lines && dim.leader_lines.length > 0) {
          try {
            dim.leader_lines.forEach((leaderLine) => {
              if (leaderLine.points && leaderLine.points.length >= 2) {
                const points = leaderLine.points.map((p) =>
                  transformPMIPosition(p, meshes)
                );
                const leaderGeom = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(leaderGeom, lineMaterial.clone());
                group.add(line);

                if (leaderLine.has_arrowhead && points.length >= 2) {
                  const arrowMesh = createArrowhead(
                    points[points.length - 2],
                    points[points.length - 1]
                  );
                  group.add(arrowMesh);
                }
              }
            });
          } catch (leaderError) {
            logger.error('STEPViewer', 'Error creating leader lines', leaderError);
          }
        } else if (
          dim.target_geometry &&
          dim.target_geometry.attachment_points &&
          dim.target_geometry.attachment_points.length > 0
        ) {
          try {
            const labelPos = transformedPos;
            const targetPos = transformPMIPosition(
              dim.target_geometry.attachment_points[0],
              meshes
            );

            const leaderGeom = new THREE.BufferGeometry().setFromPoints([
              labelPos,
              targetPos,
            ]);
            const line = new THREE.Line(leaderGeom, lineMaterial.clone());
            group.add(line);

            const arrowMesh = createArrowhead(labelPos, targetPos);
            group.add(arrowMesh);
          } catch (fallbackError) {
            logger.error(
              'STEPViewer',
              'Error creating fallback leader line',
              fallbackError
            );
          }
        }
      } catch (error) {
        logger.error('STEPViewer', 'Error creating dimension annotation', error);
      }
    });
  }

  // ── Tolerances ──────────────────────────────────────────
  if (pmiFilter === 'all' || pmiFilter === 'tolerances') {
    pmiData.geometric_tolerances.forEach((tol) => {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'pmi-gdt-label';
      labelDiv.style.cssText = `
        background: rgba(156, 39, 176, 0.95);
        color: white;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 10px;
        font-family: ui-monospace, monospace;
        font-weight: 500;
        white-space: nowrap;
        pointer-events: none;
        border: 1px solid rgba(156, 39, 176, 1);
      `;
      labelDiv.textContent = tol.text;
      labelDiv.title = `${tol.type}: ${tol.text}`;

      const label = new CSS2DObject(labelDiv);
      const transformedPos = transformPMIPosition(tol.position, meshes);
      label.position.copy(transformedPos);
      group.add(label);
    });
  }

  // ── Datums ──────────────────────────────────────────────
  if (pmiFilter === 'all' || pmiFilter === 'datums') {
    pmiData.datums.forEach((datum) => {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'pmi-datum-label';
      labelDiv.style.cssText = `
        background: rgba(76, 175, 80, 0.95);
        color: white;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 10px;
        font-family: ui-monospace, monospace;
        font-weight: 600;
        white-space: nowrap;
        pointer-events: none;
        border: 1px solid rgba(76, 175, 80, 1);
      `;
      labelDiv.textContent = datum.label;
      labelDiv.title = `Datum ${datum.label}`;

      const label = new CSS2DObject(labelDiv);
      const transformedPos = transformPMIPosition(datum.position, meshes);
      label.position.copy(transformedPos);
      group.add(label);
    });
  }

  // ── Surface finishes ────────────────────────────────────
  if ((pmiFilter === 'all' || pmiFilter === 'surface') && pmiData.surface_finishes) {
    pmiData.surface_finishes.forEach((finish) => {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'pmi-surface-label';
      labelDiv.style.cssText = `
        background: rgba(255, 152, 0, 0.95);
        color: white;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 10px;
        font-family: ui-monospace, monospace;
        font-weight: 500;
        white-space: nowrap;
        pointer-events: none;
        border: 1px solid rgba(255, 152, 0, 1);
      `;
      labelDiv.textContent = finish.text;
      labelDiv.title = `Surface Finish: ${finish.parameter} ${finish.value} ${finish.unit}`;

      const label = new CSS2DObject(labelDiv);
      const transformedPos = transformPMIPosition(finish.position, meshes);
      label.position.copy(transformedPos);
      group.add(label);
    });
  }

  // ── Weld symbols ────────────────────────────────────────
  if ((pmiFilter === 'all' || pmiFilter === 'welds') && pmiData.weld_symbols) {
    pmiData.weld_symbols.forEach((weld) => {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'pmi-weld-label';
      labelDiv.style.cssText = `
        background: rgba(244, 67, 54, 0.95);
        color: white;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 10px;
        font-family: ui-monospace, monospace;
        font-weight: 500;
        white-space: nowrap;
        pointer-events: none;
        border: 1px solid rgba(244, 67, 54, 1);
      `;
      labelDiv.textContent = weld.text;
      labelDiv.title = `Weld: ${weld.weld_type}${weld.process ? ` (${weld.process})` : ''}`;

      const label = new CSS2DObject(labelDiv);
      const transformedPos = transformPMIPosition(weld.position, meshes);
      label.position.copy(transformedPos);
      group.add(label);
    });
  }

  // ── Notes ───────────────────────────────────────────────
  if ((pmiFilter === 'all' || pmiFilter === 'notes') && pmiData.notes) {
    pmiData.notes.forEach((note) => {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'pmi-note-label';
      labelDiv.style.cssText = `
        background: rgba(96, 125, 139, 0.95);
        color: white;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 9px;
        font-family: ui-monospace, monospace;
        font-weight: 400;
        max-width: 120px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
        border: 1px solid rgba(96, 125, 139, 1);
      `;
      labelDiv.textContent = note.text;
      labelDiv.title = `Note: ${note.text}`;

      const label = new CSS2DObject(labelDiv);
      const transformedPos = transformPMIPosition(note.position, meshes);
      label.position.copy(transformedPos);
      group.add(label);

      if (note.leader_points && note.leader_points.length >= 2) {
        const points = note.leader_points.map((p) =>
          transformPMIPosition(p, meshes)
        );
        const leaderGeom = new THREE.BufferGeometry().setFromPoints(points);
        const noteMaterial = new THREE.LineBasicMaterial({
          color: 0x607d8b,
          linewidth: 1,
          transparent: true,
          opacity: 0.8,
        });
        const leaderLine = new THREE.Line(leaderGeom, noteMaterial);
        group.add(leaderLine);
      }
    });
  }

  // ── Graphical PMI (AP203/AP214 legacy) ──────────────────
  if ((pmiFilter === 'all' || pmiFilter === 'graphical') && pmiData.graphical_pmi) {
    pmiData.graphical_pmi.forEach((gfx) => {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'pmi-graphical-label';
      labelDiv.style.cssText = `
        background: rgba(63, 81, 181, 0.95);
        color: white;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 10px;
        font-family: ui-monospace, monospace;
        font-weight: 500;
        white-space: nowrap;
        pointer-events: none;
        border: 1px solid rgba(63, 81, 181, 1);
      `;
      labelDiv.textContent = gfx.text;
      labelDiv.title = `${gfx.type}: ${gfx.text}`;

      const label = new CSS2DObject(labelDiv);
      const transformedPos = transformPMIPosition(gfx.position, meshes);
      label.position.copy(transformedPos);
      group.add(label);
    });
  }

  scene.add(group);

  logger.debug(
    'STEPViewer',
    `PMI group added to scene with ${group.children.length} total children. Scene now has ${scene.children.length} children.`
  );

  return group;
}
