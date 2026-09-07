import * as THREE from 'three';
import type { ViewerThemePalette } from '@/theme/theme';

// ── Two-level grid with edge fade (Onshape/Fusion 360 style) ──────────

export function createFadingGridMaterial(color: number, baseOpacity: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: baseOpacity },
      uGridExtent: { value: 500 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uGridExtent;
      varying vec3 vWorldPos;
      void main() {
        float dist = length(vWorldPos.xz);
        float fadeStart = uGridExtent * 0.6;
        float fadeEnd = uGridExtent;
        float fade = 1.0 - smoothstep(fadeStart, fadeEnd, dist);
        gl_FragColor = vec4(uColor, uOpacity * fade);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function createTwoLevelGrid(
  size: number,
  majorDivisions: number,
  palette: ViewerThemePalette
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'viewer_grid';

  for (const [divisions, color, opacity, elevation] of [
    [majorDivisions * 5, palette.gridMinor, palette.gridMinorOpacity, 0],
    [majorDivisions, palette.gridMajor, palette.gridMajorOpacity, 0.01],
  ]) {
    const helper = new THREE.GridHelper(size, divisions);
    const material = createFadingGridMaterial(color, opacity);
    material.uniforms.uGridExtent.value = size / 2;
    const lines = new THREE.LineSegments(helper.geometry, material);
    helper.material.dispose();
    lines.position.y = elevation;
    group.add(lines);
  }

  return group;
}

/** Dispose all children of a grid group. */
export function disposeGridGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    if ((child as THREE.Mesh).material) {
      const mat = (child as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose());
      else (mat as THREE.Material).dispose();
    }
  });
}

/**
 * Replace the current grid with one sized to fit the loaded model.
 * Returns the new grid group.
 */
export function rebuildGridForModel(
  scene: THREE.Scene,
  currentGrid: THREE.Group,
  meshes: THREE.Mesh[],
  palette: ViewerThemePalette,
  visible: boolean
): THREE.Group {
  scene.remove(currentGrid);
  disposeGridGroup(currentGrid);

  const box = new THREE.Box3();
  meshes.forEach((mesh) => box.expandByObject(mesh));
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);

  const gridSize = Math.max(1000, Math.ceil((maxDimension * 3) / 100) * 100);
  const divisions = Math.max(10, Math.min(100, Math.round(gridSize / 100)));

  const newGrid = createTwoLevelGrid(gridSize, divisions, palette);
  newGrid.visible = visible;
  scene.add(newGrid);

  return newGrid;
}
