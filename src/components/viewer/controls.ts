import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Create OrbitControls with standard CAD viewer damping.
 */
export function createOrbitControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  return controls;
}

/**
 * Zoom-to-fit: reposition camera and orbit target so all meshes are visible.
 */
export function fitCameraToMeshes(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  meshes: THREE.Mesh[]
): void {
  if (meshes.length === 0) return;

  const box = new THREE.Box3();
  meshes.forEach((mesh) => box.expandByObject(mesh));

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const distance = maxSize * 2;

  camera.position.set(
    center.x + distance,
    center.y + distance,
    center.z + distance
  );

  controls.target.copy(center);
  controls.update();
}
