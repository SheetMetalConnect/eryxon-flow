import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { ViewerThemePalette } from '@/theme/theme';

// ── Scene initialization result ───────────────────────────────────

export interface SceneObjects {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  css2dRenderer: CSS2DRenderer;
  ambientLight: THREE.AmbientLight;
  keyLight: THREE.DirectionalLight;
  fillLight: THREE.DirectionalLight;
  backLight: THREE.DirectionalLight;
}

/**
 * Create the Three.js scene, camera, renderer, CSS2D overlay, and 3-point lighting rig.
 * Appends the WebGL and CSS2D canvases to `container`.
 */
export function createScene(
  container: HTMLDivElement,
  palette: ViewerThemePalette
): SceneObjects {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.sceneBackground);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    10000
  );
  camera.position.set(200, 200, 200);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // CSS2D overlay for labels
  const css2dRenderer = new CSS2DRenderer();
  css2dRenderer.setSize(container.clientWidth, container.clientHeight);
  css2dRenderer.domElement.style.position = 'absolute';
  css2dRenderer.domElement.style.top = '0';
  css2dRenderer.domElement.style.left = '0';
  css2dRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(css2dRenderer.domElement);

  // 3-point lighting rig
  const ambientLight = new THREE.AmbientLight(0xffffff, palette.ambientIntensity);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, palette.keyLightIntensity);
  keyLight.position.set(5, 5, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, palette.fillLightIntensity);
  fillLight.position.set(-5, 0, -5);
  scene.add(fillLight);

  const backLight = new THREE.DirectionalLight(0xffffff, palette.backLightIntensity);
  backLight.position.set(0, 5, -5);
  scene.add(backLight);

  return { scene, camera, renderer, css2dRenderer, ambientLight, keyLight, fillLight, backLight };
}

/**
 * Start the render loop. Returns a cleanup function that cancels the animation frame.
 */
export function startRenderLoop(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  css2dRenderer: CSS2DRenderer,
  controls: { update(): void }
): () => void {
  let frameId: number | null = null;

  const animate = () => {
    frameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    css2dRenderer.render(scene, camera);
  };
  animate();

  return () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
  };
}

/**
 * Create a resize handler that keeps camera aspect and renderer sizes in sync.
 * Returns a cleanup function that removes the event listener.
 */
export function createResizeHandler(
  container: HTMLDivElement,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  css2dRenderer: CSS2DRenderer
): () => void {
  const handleResize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    css2dRenderer.setSize(width, height);
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}

/**
 * Dispose the WebGL renderer and remove both canvases from the container.
 */
export function disposeScene(
  container: HTMLDivElement,
  renderer: THREE.WebGLRenderer,
  css2dRenderer: CSS2DRenderer
): void {
  renderer.dispose();
  if (renderer.domElement.parentNode === container) {
    container.removeChild(renderer.domElement);
  }
  if (css2dRenderer.domElement.parentNode === container) {
    container.removeChild(css2dRenderer.domElement);
  }
}

/**
 * Sync lighting and background to a new palette (dark/light mode switch).
 */
export function syncTheme(
  scene: THREE.Scene,
  palette: ViewerThemePalette,
  lights: {
    ambient: THREE.AmbientLight;
    key: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
    back: THREE.DirectionalLight;
  },
  edges: THREE.LineSegments[]
): void {
  (scene.background as THREE.Color)?.set(palette.sceneBackground);

  lights.ambient.intensity = palette.ambientIntensity;
  lights.key.intensity = palette.keyLightIntensity;
  lights.fill.intensity = palette.fillLightIntensity;
  lights.back.intensity = palette.backLightIntensity;

  edges.forEach((edge) => {
    const mat = edge.material as THREE.LineBasicMaterial;
    mat.color.set(palette.edgeColor);
    mat.opacity = palette.edgeOpacity;
    mat.transparent = palette.edgeOpacity < 1;
  });
}
