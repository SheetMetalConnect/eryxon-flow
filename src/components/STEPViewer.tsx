import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Focus,
  Grid3x3,
  Boxes,
  Loader2,
  Box,
  Hexagon,
  Ruler,
  Sparkles,
  Crosshair
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useTranslation } from 'react-i18next';
import { getCADConfig } from '@/config/cadBackend';
import type {
  PMIData,
  PMIDimension,
  PMISurfaceFinish,
  PMIWeldSymbol,
  GeometryData,
  MeshData,
} from '@/hooks/useCADProcessing';
import { decodeFloat32Array, decodeUint32Array } from '@/hooks/useCADProcessing';
import { installBVH } from './viewer/measurements/setupBVH';
import { useMeasurements } from './viewer/measurements/useMeasurements';
import { MeasurementToolbar } from './viewer/measurements/MeasurementToolbar';
import { MeasurementPanel } from './viewer/measurements/MeasurementPanel';
import type { ViewerRefs } from './viewer/measurements/types';

// Install BVH acceleration for fast raycasting
installBVH();

interface ModelDimensions {
  x: number;
  y: number;
  z: number;
  center: THREE.Vector3;
}

declare global {
  interface Window {
    occtimportjs?: () => Promise<any>;
  }
}

interface STEPViewerProps {
  url: string;
  title?: string;
  compact?: boolean;
  pmiData?: PMIData | null;
  /** Server-processed geometry data (if available) */
  serverGeometry?: GeometryData | null;
  /** Skip browser-based processing if server geometry is provided */
  preferServerGeometry?: boolean;
}

export function STEPViewer({
  url,
  title,
  compact = false,
  pmiData,
  serverGeometry,
  preferServerGeometry = true
}: STEPViewerProps) {
  const { t } = useTranslation();
  const occtScriptUrl = getCADConfig().frontend.wasmUrl;

  const [stepLoading, setStepLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [loadRetryCount, setLoadRetryCount] = useState(0);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [explodedView, setExplodedView] = useState(false);
  const [explosionFactor, setExplosionFactor] = useState(1);
  const [gridVisible, setGridVisible] = useState(true);
  const [edgesVisible, setEdgesVisible] = useState(true);
  const [showDimensions, setShowDimensions] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showPMI, setShowPMI] = useState(false);
  const [dimensions, setDimensions] = useState<ModelDimensions | null>(null);

  const [processingMode, setProcessingMode] = useState<'server' | 'browser' | null>(null);

  const [pmiFilter, setPmiFilter] = useState<'all' | 'dimensions' | 'tolerances' | 'datums' | 'surface' | 'welds' | 'notes' | 'graphical'>('all');

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const edgesRef = useRef<THREE.LineSegments[]>([]);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const originalPositionsRef = useRef<THREE.Vector3[]>([]);
  const explosionDataRef = useRef({
    separationVectors: [] as THREE.Vector3[],
    baseDistances: [] as number[],
    initialized: false,
  });

  const dimensionLinesRef = useRef<THREE.Group | null>(null);
  const originalMaterialsRef = useRef<THREE.Material[]>([]);

  const css2dRendererRef = useRef<CSS2DRenderer | null>(null);
  const pmiLayerRef = useRef<THREE.Group | null>(null);

  /**
   * Convert server mesh data (base64 encoded) to Three.js mesh
   */
  const createMeshFromServerData = useCallback((meshData: MeshData): THREE.Mesh => {
    const geometry = new THREE.BufferGeometry();

    const vertices = decodeFloat32Array(meshData.vertices_base64);
    const normals = decodeFloat32Array(meshData.normals_base64);
    const indices = decodeUint32Array(meshData.indices_base64);

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    const maxIndex = Math.max(...indices);
    if (maxIndex > 65535) {
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    } else {
      geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    }

    const color = new THREE.Color(
      meshData.color[0],
      meshData.color[1],
      meshData.color[2]
    );

    const material = new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
      metalness: 0.3,
      roughness: 0.6,
      flatShading: false,
    });

    return new THREE.Mesh(geometry, material);
  }, []);

  useEffect(() => {
    if (serverGeometry && preferServerGeometry) {
      setLibrariesLoaded(true);
      return;
    }

    const loadOcct = async () => {
      if (window.occtimportjs) {
        setLibrariesLoaded(true);
        return;
      }

      // Remove any previously failed script tag so retry works
      const existing = document.querySelector(`script[src="${occtScriptUrl}"]`);
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.src = occtScriptUrl;

      script.onload = () => {
        // Poll for the global to appear instead of a fixed timeout —
        // WASM init time varies by device/network speed
        let attempts = 0;
        const maxAttempts = 40; // 40 × 150ms = 6s max wait
        const poll = setInterval(() => {
          attempts++;
          if (window.occtimportjs) {
            clearInterval(poll);
            setLibrariesLoaded(true);
          } else if (attempts >= maxAttempts) {
            clearInterval(poll);
            setLoadingError('Failed to initialize STEP parser');
          }
        }, 150);
      };

      script.onerror = () => {
        setLoadingError('Failed to load STEP parser library');
      };

      document.head.appendChild(script);
    };

    loadOcct();
  }, [occtScriptUrl, serverGeometry, preferServerGeometry, loadRetryCount]);

  useEffect(() => {
    if (!librariesLoaded || !containerRef.current) return;

    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );
    camera.position.set(200, 200, 200);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      container.clientWidth,
      container.clientHeight
    );
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(0, 5, -5);
    scene.add(backLight);

    const grid = new THREE.GridHelper(1000, 50, 0x444444, 0x888888);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    scene.add(grid);
    gridRef.current = grid;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const css2dRenderer = new CSS2DRenderer();
    css2dRenderer.setSize(container.clientWidth, container.clientHeight);
    css2dRenderer.domElement.style.position = 'absolute';
    css2dRenderer.domElement.style.top = '0';
    css2dRenderer.domElement.style.left = '0';
    css2dRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(css2dRenderer.domElement);
    css2dRendererRef.current = css2dRenderer;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      css2dRenderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      css2dRenderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      if (container && css2dRenderer.domElement.parentNode === container) {
        container.removeChild(css2dRenderer.domElement);
      }
    };
  }, [librariesLoaded]);

  const clearMeshes = useCallback(() => {
    meshesRef.current.forEach((mesh) => {
      sceneRef.current?.remove(mesh);
      mesh.geometry.disposeBoundsTree();
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m: THREE.Material) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    meshesRef.current = [];

    edgesRef.current.forEach((edges) => {
      sceneRef.current?.remove(edges);
      edges.geometry.dispose();
      if (Array.isArray(edges.material)) {
        edges.material.forEach((m: THREE.Material) => m.dispose());
      } else {
        edges.material.dispose();
      }
    });
    edgesRef.current = [];

    originalPositionsRef.current = [];
    explosionDataRef.current.initialized = false;
  }, []);

  const addMeshToScene = useCallback((mesh: THREE.Mesh) => {
    if (!sceneRef.current) return;

    // Build BVH for accelerated raycasting (measurement tools)
    mesh.geometry.computeBoundsTree();

    meshesRef.current.push(mesh);
    originalPositionsRef.current.push(mesh.position.clone());
    sceneRef.current.add(mesh);

    const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, 30);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 1,
      opacity: 0.8,
      transparent: true,
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    edges.visible = edgesVisible;

    mesh.add(edges);
    edgesRef.current.push(edges);
  }, [edgesVisible]);

  const calculateDimensions = useCallback(() => {
    if (meshesRef.current.length === 0) return;

    const box = new THREE.Box3();
    meshesRef.current.forEach((mesh) => box.expandByObject(mesh));

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Dimensions in mm (assuming model units are mm)
    setDimensions({
      x: Math.round(size.x * 100) / 100,
      y: Math.round(size.y * 100) / 100,
      z: Math.round(size.z * 100) / 100,
      center: center,
    });
  }, []);

  const fitCameraToMeshes = useCallback(() => {
    if (
      !cameraRef.current ||
      !controlsRef.current ||
      meshesRef.current.length === 0
    )
      return;

    const box = new THREE.Box3();
    meshesRef.current.forEach((mesh) => box.expandByObject(mesh));

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    const distance = maxSize * 2;

    cameraRef.current.position.set(
      center.x + distance,
      center.y + distance,
      center.z + distance
    );

    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  }, []);

  const updateGridSize = useCallback(() => {
    if (!gridRef.current || !sceneRef.current || meshesRef.current.length === 0)
      return;

    const box = new THREE.Box3();
    meshesRef.current.forEach((mesh) => box.expandByObject(mesh));
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    const gridSize = Math.max(
      1000,
      Math.ceil((maxDimension * 3) / 100) * 100
    );
    const divisions = Math.max(10, Math.min(100, Math.round(gridSize / 100)));

    sceneRef.current.remove(gridRef.current);
    gridRef.current.geometry.dispose();
    if (Array.isArray(gridRef.current.material)) {
      gridRef.current.material.forEach((m: THREE.Material) => m.dispose());
    } else {
      gridRef.current.material.dispose();
    }

    const newGrid = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x888888);
    newGrid.material.transparent = true;
    newGrid.material.opacity = 0.35;
    newGrid.visible = gridVisible;

    sceneRef.current.add(newGrid);
    gridRef.current = newGrid;
  }, [gridVisible]);

  useEffect(() => {
    if (!librariesLoaded || !sceneRef.current) return;

    if (serverGeometry && preferServerGeometry && serverGeometry.meshes.length > 0) {
      setStepLoading(true);
      setLoadingError(null);
      setProcessingMode('server');

      try {
        clearMeshes();

        for (const meshData of serverGeometry.meshes) {
          const mesh = createMeshFromServerData(meshData);
          addMeshToScene(mesh);
        }

        originalMaterialsRef.current = meshesRef.current.map((mesh: THREE.Mesh) =>
          (mesh.material as THREE.Material).clone()
        );

        calculateDimensions();
        fitCameraToMeshes();
        updateGridSize();

        setStepLoading(false);
      } catch (err) {
        logger.error('STEPViewer', 'Server geometry rendering error', err);
        setLoadingError(
          err instanceof Error ? err.message : 'Failed to render geometry'
        );
        setStepLoading(false);
      }

      return;
    }

    if (!url) return;

    const loadSTEP = async () => {
      try {
        setStepLoading(true);
        setLoadingError(null);
        setProcessingMode('browser');

        if (!window.occtimportjs) {
          throw new Error('STEP parser not loaded');
        }
        const occt = await window.occtimportjs();

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const fileBuffer = new Uint8Array(arrayBuffer);

        const result = occt.ReadStepFile(fileBuffer, null);

        if (!result.meshes || result.meshes.length === 0) {
          throw new Error('No geometry found in STEP file');
        }

        clearMeshes();

        for (let i = 0; i < result.meshes.length; i++) {
          const meshData = result.meshes[i];

          if (!meshData.attributes?.position?.array) continue;

          const geometry = new THREE.BufferGeometry();

          // Vertices (CRITICAL: Must be Float32Array)
          const vertices =
            meshData.attributes.position.array instanceof Float32Array
              ? meshData.attributes.position.array
              : new Float32Array(meshData.attributes.position.array);
          geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(vertices, 3)
          );

          if (meshData.attributes.normal) {
            const normals =
              meshData.attributes.normal.array instanceof Float32Array
                ? meshData.attributes.normal.array
                : new Float32Array(meshData.attributes.normal.array);
            geometry.setAttribute(
              'normal',
              new THREE.BufferAttribute(normals, 3)
            );
          } else {
            geometry.computeVertexNormals();
          }

          // Indices (CRITICAL: Must be Uint16Array or Uint32Array)
          if (meshData.index?.array) {
            const indexArray = meshData.index.array;
            const maxIndex = Math.max(...indexArray);
            const indices =
              maxIndex > 65535
                ? new Uint32Array(indexArray)
                : new Uint16Array(indexArray);
            geometry.setIndex(new THREE.BufferAttribute(indices, 1));
          }

          const color = meshData.color
            ? new THREE.Color(
              meshData.color[0],
              meshData.color[1],
              meshData.color[2]
            )
            : new THREE.Color(0x4a90e2);

          const material = new THREE.MeshStandardMaterial({
            color,
            side: THREE.DoubleSide,
            metalness: 0.3,
            roughness: 0.6,
            flatShading: false,
          });

          const mesh = new THREE.Mesh(geometry, material);
          addMeshToScene(mesh);
        }

        originalMaterialsRef.current = meshesRef.current.map((mesh: THREE.Mesh) =>
          (mesh.material as THREE.Material).clone()
        );

        calculateDimensions();
        fitCameraToMeshes();
        updateGridSize();

        setStepLoading(false);
      } catch (err) {
        logger.error('STEPViewer', 'STEP loading error', err);
        setLoadingError(
          err instanceof Error ? err.message : 'Failed to load STEP file'
        );
        setStepLoading(false);
      }
    };

    loadSTEP();
  }, [url, librariesLoaded, serverGeometry, preferServerGeometry, edgesVisible, gridVisible, clearMeshes, addMeshToScene, createMeshFromServerData, calculateDimensions, fitCameraToMeshes, updateGridSize]);


  const initializeExplosionData = () => {
    const box = new THREE.Box3();
    meshesRef.current.forEach((mesh) => box.expandByObject(mesh));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    meshesRef.current.forEach((mesh, index) => {
      const meshBox = new THREE.Box3().setFromObject(mesh);
      const meshCenter = meshBox.getCenter(new THREE.Vector3());
      const relativePos = meshCenter.clone().sub(center);

        const separationVector =
        relativePos.length() > 0
          ? relativePos.clone().normalize()
          : new THREE.Vector3(0, 0, 1);

      const baseDistance = maxDimension * 0.4;

      explosionDataRef.current.separationVectors[index] = separationVector;
      explosionDataRef.current.baseDistances[index] = baseDistance;
    });

    explosionDataRef.current.initialized = true;
  };

  const applyExplosion = (factor: number) => {
    if (!explosionDataRef.current.initialized) return;

    meshesRef.current.forEach((mesh, index) => {
      const separationVector =
        explosionDataRef.current.separationVectors[index];
      const baseDistance = explosionDataRef.current.baseDistances[index];

      const offset = separationVector
        .clone()
        .multiplyScalar(baseDistance * factor);
      const newPosition = originalPositionsRef.current[index]
        .clone()
        .add(offset);
      mesh.position.copy(newPosition);
    });
  };

  const toggleExplodedView = () => {
    if (!explodedView) {
      meshesRef.current.forEach((mesh, index) => {
        originalPositionsRef.current[index] = mesh.position.clone();
      });

      if (!explosionDataRef.current.initialized) {
        initializeExplosionData();
      }

      applyExplosion(explosionFactor);
    } else {
      meshesRef.current.forEach((mesh, index) => {
        mesh.position.copy(originalPositionsRef.current[index]);
      });
    }

    setExplodedView(!explodedView);
  };

  const handleExplosionFactorChange = (values: number[]) => {
    const newFactor = values[0];
    setExplosionFactor(newFactor);
    if (explodedView) {
      applyExplosion(newFactor);
    }
  };

  const toggleWireframe = () => {
    meshesRef.current.forEach((mesh) => {
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m: THREE.Material) => {
            (m as THREE.MeshStandardMaterial).wireframe = !wireframeMode;
          });
        } else {
          (mesh.material as THREE.MeshStandardMaterial).wireframe = !wireframeMode;
        }
      }
    });
    setWireframeMode(!wireframeMode);
  };

  const toggleGrid = () => {
    if (gridRef.current) {
      gridRef.current.visible = !gridVisible;
      setGridVisible(!gridVisible);
    }
  };

  const toggleEdges = () => {
    edgesRef.current.forEach((edges) => {
      edges.visible = !edgesVisible;
    });
    setEdgesVisible(!edgesVisible);
  };


  const createDimensionVisualization = useCallback(() => {
    if (!sceneRef.current || !dimensions) return;

    if (dimensionLinesRef.current) {
      sceneRef.current.remove(dimensionLinesRef.current);
      dimensionLinesRef.current.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m: THREE.Material) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
    }

    const group = new THREE.Group();
    group.name = 'dimensionLines';

    const box = new THREE.Box3();
    meshesRef.current.forEach((mesh) => box.expandByObject(mesh));
    const min = box.min;
    const max = box.max;

    const offset = Math.max(dimensions.x, dimensions.y, dimensions.z) * 0.15;

    const colors = {
      x: 0x4a9eff, // Blue - X axis
      y: 0x34a853, // Green - Y axis
      z: 0xfbbc05, // Yellow - Z axis
    };

    const createDimensionLine = (
      start: THREE.Vector3,
      end: THREE.Vector3,
      color: number,
      label: string
    ) => {
      const lineGroup = new THREE.Group();

      const lineMaterial = new THREE.LineBasicMaterial({
        color,
        linewidth: 2,
        transparent: true,
        opacity: 0.9,
      });

      const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      lineGroup.add(line);

      const capLength = offset * 0.3;
      const direction = new THREE.Vector3().subVectors(end, start).normalize();
      const perpendicular = new THREE.Vector3();

      if (Math.abs(direction.y) < 0.9) {
        perpendicular.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
      } else {
        perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
      }

      const startCap1 = start.clone().add(perpendicular.clone().multiplyScalar(capLength / 2));
      const startCap2 = start.clone().sub(perpendicular.clone().multiplyScalar(capLength / 2));
      const startCapGeometry = new THREE.BufferGeometry().setFromPoints([startCap1, startCap2]);
      const startCap = new THREE.Line(startCapGeometry, lineMaterial);
      lineGroup.add(startCap);

      const endCap1 = end.clone().add(perpendicular.clone().multiplyScalar(capLength / 2));
      const endCap2 = end.clone().sub(perpendicular.clone().multiplyScalar(capLength / 2));
      const endCapGeometry = new THREE.BufferGeometry().setFromPoints([endCap1, endCap2]);
      const endCap = new THREE.Line(endCapGeometry, lineMaterial);
      lineGroup.add(endCap);

      const arrowLength = offset * 0.2;
      const arrowWidth = offset * 0.08;

      const arrowStartDir = direction.clone().negate();
      const arrow1 = start.clone().add(direction.clone().multiplyScalar(arrowLength));
      const arrowGeom1 = new THREE.BufferGeometry().setFromPoints([
        start,
        arrow1.clone().add(perpendicular.clone().multiplyScalar(arrowWidth)),
        arrow1.clone().sub(perpendicular.clone().multiplyScalar(arrowWidth)),
        start,
      ]);
      const arrowMesh1 = new THREE.Line(arrowGeom1, lineMaterial);
      lineGroup.add(arrowMesh1);

      const arrow2 = end.clone().sub(direction.clone().multiplyScalar(arrowLength));
      const arrowGeom2 = new THREE.BufferGeometry().setFromPoints([
        end,
        arrow2.clone().add(perpendicular.clone().multiplyScalar(arrowWidth)),
        arrow2.clone().sub(perpendicular.clone().multiplyScalar(arrowWidth)),
        end,
      ]);
      const arrowMesh2 = new THREE.Line(arrowGeom2, lineMaterial);
      lineGroup.add(arrowMesh2);

      return lineGroup;
    };

    const xStart = new THREE.Vector3(min.x, min.y, min.z - offset);
    const xEnd = new THREE.Vector3(max.x, min.y, min.z - offset);
    group.add(createDimensionLine(xStart, xEnd, colors.x, `${dimensions.x} mm`));

    const xExtMaterial = new THREE.LineBasicMaterial({ color: colors.x, transparent: true, opacity: 0.4 });
    const xExt1Geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x, min.y, min.z - offset * 1.2),
    ]);
    group.add(new THREE.Line(xExt1Geom, xExtMaterial));
    const xExt2Geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(max.x, min.y, min.z - offset * 1.2),
    ]);
    group.add(new THREE.Line(xExt2Geom, xExtMaterial));

    const yStart = new THREE.Vector3(min.x - offset, min.y, min.z);
    const yEnd = new THREE.Vector3(min.x - offset, max.y, min.z);
    group.add(createDimensionLine(yStart, yEnd, colors.y, `${dimensions.y} mm`));

    const yExtMaterial = new THREE.LineBasicMaterial({ color: colors.y, transparent: true, opacity: 0.4 });
    const yExt1Geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x - offset * 1.2, min.y, min.z),
    ]);
    group.add(new THREE.Line(yExt1Geom, yExtMaterial));
    const yExt2Geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(min.x - offset * 1.2, max.y, min.z),
    ]);
    group.add(new THREE.Line(yExt2Geom, yExtMaterial));

    const zStart = new THREE.Vector3(min.x - offset, min.y, min.z);
    const zEnd = new THREE.Vector3(min.x - offset, min.y, max.z);
    group.add(createDimensionLine(zStart, zEnd, colors.z, `${dimensions.z} mm`));

    const zExtMaterial = new THREE.LineBasicMaterial({ color: colors.z, transparent: true, opacity: 0.4 });
    const zExt1Geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x - offset * 1.2, min.y, min.z),
    ]);
    group.add(new THREE.Line(zExt1Geom, zExtMaterial));
    const zExt2Geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(min.x, min.y, max.z),
      new THREE.Vector3(min.x - offset * 1.2, min.y, max.z),
    ]);
    group.add(new THREE.Line(zExt2Geom, zExtMaterial));

    sceneRef.current.add(group);
    dimensionLinesRef.current = group;
  }, [dimensions]);

  const toggleDimensionDisplay = useCallback(() => {
    if (!showDimensions) {
      createDimensionVisualization();
    } else if (dimensionLinesRef.current && sceneRef.current) {
      sceneRef.current.remove(dimensionLinesRef.current);
      dimensionLinesRef.current = null;
    }
    setShowDimensions(!showDimensions);
  }, [showDimensions, createDimensionVisualization]);

  const applyFeatureHighlighting = useCallback(() => {
    meshesRef.current.forEach((mesh, index) => {
      const geometry = mesh.geometry;

      if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
      }

      const normals = geometry.attributes.normal;
      const positions = geometry.attributes.position;

      if (!normals || !positions) return;

      const vertexCount = positions.count;
      const curvatures = new Float32Array(vertexCount);

      const neighborMap = new Map<number, Set<number>>();

      if (geometry.index) {
        const indices = geometry.index.array;
        for (let i = 0; i < indices.length; i += 3) {
          const a = indices[i];
          const b = indices[i + 1];
          const c = indices[i + 2];

          if (!neighborMap.has(a)) neighborMap.set(a, new Set());
          if (!neighborMap.has(b)) neighborMap.set(b, new Set());
          if (!neighborMap.has(c)) neighborMap.set(c, new Set());

          neighborMap.get(a)!.add(b).add(c);
          neighborMap.get(b)!.add(a).add(c);
          neighborMap.get(c)!.add(a).add(b);
        }
      }

      const normalVec = new THREE.Vector3();
      const neighborNormal = new THREE.Vector3();

      for (let i = 0; i < vertexCount; i++) {
        normalVec.set(
          normals.getX(i),
          normals.getY(i),
          normals.getZ(i)
        );

        const neighbors = neighborMap.get(i);
        if (!neighbors || neighbors.size === 0) {
          curvatures[i] = 0;
          continue;
        }

        let totalDeviation = 0;
        neighbors.forEach(neighborIdx => {
          neighborNormal.set(
            normals.getX(neighborIdx),
            normals.getY(neighborIdx),
            normals.getZ(neighborIdx)
          );
          // Angle between normals (1 - dot product gives deviation)
          const dot = normalVec.dot(neighborNormal);
          totalDeviation += 1 - Math.abs(dot);
        });

        curvatures[i] = totalDeviation / neighbors.size;
      }

      let maxCurvature = 0;
      for (let i = 0; i < vertexCount; i++) {
        if (curvatures[i] > maxCurvature) maxCurvature = curvatures[i];
      }

      const colors = new Float32Array(vertexCount * 3);

      const originalMaterial = originalMaterialsRef.current[index] as THREE.MeshStandardMaterial;
      const baseColor = originalMaterial?.color || new THREE.Color(0x4a90e2);

      // Color scheme:
      // Flat surfaces (low curvature): original color
      // Curved surfaces (high curvature): highlight colors
      // - Medium curvature (bends): Orange
      // - High curvature (holes, edges): Magenta/Purple

      for (let i = 0; i < vertexCount; i++) {
        const normalizedCurvature = maxCurvature > 0 ? curvatures[i] / maxCurvature : 0;

        let r, g, b;

        if (normalizedCurvature < 0.15) {
          // Flat - use base color
          r = baseColor.r;
          g = baseColor.g;
          b = baseColor.b;
        } else if (normalizedCurvature < 0.4) {
          // Medium curvature (bends) - orange/amber gradient
          const t = (normalizedCurvature - 0.15) / 0.25;
          r = baseColor.r + (1.0 - baseColor.r) * t * 0.8;
          g = baseColor.g + (0.6 - baseColor.g) * t * 0.8;
          b = baseColor.b * (1 - t * 0.7);
        } else {
          // High curvature (holes, sharp edges) - magenta/purple
          const t = Math.min((normalizedCurvature - 0.4) / 0.6, 1);
          r = 0.8 + t * 0.2;
          g = 0.2;
          b = 0.6 + t * 0.4;
        }

        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }

      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const newMaterial = new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        metalness: 0.2,
        roughness: 0.5,
        flatShading: false,
      });

      mesh.material = newMaterial;
    });
  }, []);

  const removeFeatureHighlighting = useCallback(() => {
    meshesRef.current.forEach((mesh, index) => {
      if (originalMaterialsRef.current[index]) {
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }

        mesh.material = originalMaterialsRef.current[index].clone();

        if (mesh.geometry.attributes.color) {
          mesh.geometry.deleteAttribute('color');
        }
      }
    });
  }, []);

  const toggleFeatureHighlight = useCallback(() => {
    if (!showFeatures) {
      applyFeatureHighlighting();
    } else {
      removeFeatureHighlighting();
    }
    setShowFeatures(!showFeatures);
  }, [showFeatures, applyFeatureHighlighting, removeFeatureHighlighting]);

  const transformPMIPosition = useCallback((stepPosition: { x: number; y: number; z: number }, fallbackIndex?: number) => {
    if (!stepPosition || 
        typeof stepPosition.x !== 'number' || 
        typeof stepPosition.y !== 'number' || 
        typeof stepPosition.z !== 'number' ||
        !isFinite(stepPosition.x) ||
        !isFinite(stepPosition.y) ||
        !isFinite(stepPosition.z)) {
      logger.warn('STEPViewer', 'Invalid PMI position', stepPosition);
      return new THREE.Vector3(0, 0, 0);
    }

    const isZeroPosition = stepPosition.x === 0 && stepPosition.y === 0 && stepPosition.z === 0;
    
    if (isZeroPosition && typeof fallbackIndex === 'number' && meshesRef.current.length > 0) {
      // Backend failed to extract coordinates - use smart fallback positioning
      const box = new THREE.Box3();
      meshesRef.current.forEach((mesh) => box.expandByObject(mesh));
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      const totalDimensions = 27;
      const layers = 3;
      const layer = fallbackIndex % layers;
      const itemsPerLayer = Math.ceil(totalDimensions / layers);
      const angleStep = (360 / itemsPerLayer) * Math.PI / 180;
      const angle = (Math.floor(fallbackIndex / layers) * angleStep);
      
      const baseRadius = Math.max(size.x, size.y, size.z) * 0.7;
      const radius = baseRadius + (layer * size.x * 0.1);
      const heightOffset = (layer - 1) * size.y * 0.35;
      const height = center.y + heightOffset;
      
      logger.debug('STEPViewer', `Using fallback position for dimension ${fallbackIndex + 1}: [${center.x + Math.cos(angle) * radius}, ${height}, ${center.z + Math.sin(angle) * radius}]`);
      
      return new THREE.Vector3(
        center.x + Math.cos(angle) * radius,
        height,
        center.z + Math.sin(angle) * radius
      );
    }

    // Use coordinates from backend with potential coordinate system adjustment
    // Some STEP files may use different coordinate conventions
    const x = stepPosition.x;
    const y = stepPosition.y;
    const z = stepPosition.z;
    
    logger.debug('STEPViewer', `Using backend PMI position: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
    
    // If coordinates seem too far from geometry, scale them appropriately
    if (meshesRef.current.length > 0) {
      const box = new THREE.Box3();
      meshesRef.current.forEach((mesh) => box.expandByObject(mesh));
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);
      
      // Check if PMI coordinates are wildly out of scale compared to geometry
      const distanceFromCenter = new THREE.Vector3(x - center.x, y - center.y, z - center.z).length();
      const reasonableDistance = maxDimension * 2; // Allow PMI to be up to 2x the geometry size away
      
      if (distanceFromCenter > reasonableDistance) {
        logger.debug('STEPViewer', `PMI position too far (${distanceFromCenter.toFixed(2)} > ${reasonableDistance.toFixed(2)}), scaling down`);
        const scaleFactor = reasonableDistance / distanceFromCenter;
        return new THREE.Vector3(
          center.x + (x - center.x) * scaleFactor,
          center.y + (y - center.y) * scaleFactor, 
          center.z + (z - center.z) * scaleFactor
        );
      }
    }
    
    return new THREE.Vector3(x, y, z);
  }, []);

  const createArrowhead = useCallback((from: THREE.Vector3, to: THREE.Vector3): THREE.Mesh => {
    const direction = new THREE.Vector3().subVectors(to, from).normalize();
    const length = 2;
    const coneGeometry = new THREE.ConeGeometry(0.5, length, 8);
    const coneMaterial = new THREE.MeshBasicMaterial({ color: 0x00bcd4 });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    
    cone.position.copy(to);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    
    return cone;
  }, []);

  const createPMIVisualization = useCallback(() => {
    if (!sceneRef.current || !pmiData) return;

    const box = new THREE.Box3();
    meshesRef.current.forEach((mesh) => box.expandByObject(mesh));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    logger.debug('STEPViewer', 'Creating PMI visualization with data', {
      dimensions: pmiData.dimensions.length,
      tolerances: pmiData.geometric_tolerances.length,
      datums: pmiData.datums.length,
      processingMode,
      meshCount: meshesRef.current.length,
      geometryBounds: {
        center: [center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2)],
        size: [size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2)],
        min: [box.min.x.toFixed(2), box.min.y.toFixed(2), box.min.z.toFixed(2)],
        max: [box.max.x.toFixed(2), box.max.y.toFixed(2), box.max.z.toFixed(2)]
      }
    });

    if (pmiLayerRef.current) {
      pmiLayerRef.current.traverse((child: THREE.Object3D) => {
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
      sceneRef.current.remove(pmiLayerRef.current);
    }

    const group = new THREE.Group();
    group.name = 'pmiAnnotations';

    const invalidCoordinateCount = pmiData.dimensions.filter(dim =>
      dim.position.x === 0 && dim.position.y === 0 && dim.position.z === 0
    ).length;
    
    if (invalidCoordinateCount > 0) {
      logger.warn('STEPViewer', `Backend PMI coordinate issue: ${invalidCoordinateCount}/${pmiData.dimensions.length} dimensions have invalid coordinates [0,0,0]. Using fallback positioning.`);
    }

    const pmiColor = 0x00bcd4;
    const lineMaterial = new THREE.LineBasicMaterial({
      color: pmiColor,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });

    if (pmiFilter === 'all' || pmiFilter === 'dimensions') {
      pmiData.dimensions.forEach((dim, index) => {
        try {
          if (!dim || !dim.position || !dim.text) {
            logger.warn('STEPViewer', 'Invalid dimension data', dim);
            return;
          }

          logger.debug('STEPViewer', `Creating dimension ${index + 1}/${pmiData.dimensions.length}`, {
            text: dim.text,
            position: dim.position,
            type: dim.type
          });

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
          const transformedPos = transformPMIPosition(dim.position, index);
          
          if (meshesRef.current.length > 0) {
            const box = new THREE.Box3();
            meshesRef.current.forEach((mesh) => box.expandByObject(mesh));
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const direction = new THREE.Vector3().subVectors(transformedPos, center).normalize();
            const offset = Math.max(size.x, size.y, size.z) * 0.15;

            transformedPos.add(direction.multiplyScalar(offset));
          }
          
          logger.debug('STEPViewer', `Dimension ${index + 1} position - Original: [${dim.position.x.toFixed(2)}, ${dim.position.y.toFixed(2)}, ${dim.position.z.toFixed(2)}] -> Final: [${transformedPos.x.toFixed(2)}, ${transformedPos.y.toFixed(2)}, ${transformedPos.z.toFixed(2)}]`);
          
          label.position.copy(transformedPos);
          group.add(label);
          if (dim.leader_lines && dim.leader_lines.length > 0) {
            try {
              dim.leader_lines.forEach(leaderLine => {
                if (leaderLine.points && leaderLine.points.length >= 2) {
                  const points = leaderLine.points.map(p => transformPMIPosition(p));
                  const leaderGeom = new THREE.BufferGeometry().setFromPoints(points);
                  const line = new THREE.Line(leaderGeom, lineMaterial.clone());
                  group.add(line);

                  if (leaderLine.has_arrowhead && points.length >= 2) {
                    const arrowMesh = createArrowhead(points[points.length - 2], points[points.length - 1]);
                    group.add(arrowMesh);
                  }
                }
              });
            } catch (leaderError) {
              logger.error('STEPViewer', 'Error creating leader lines', leaderError);
            }
          }
          else if (dim.target_geometry && dim.target_geometry.attachment_points && dim.target_geometry.attachment_points.length > 0) {
            try {
              const labelPos = transformedPos;
              const targetPos = transformPMIPosition(dim.target_geometry.attachment_points[0]);
              
              const leaderGeom = new THREE.BufferGeometry().setFromPoints([labelPos, targetPos]);
              const line = new THREE.Line(leaderGeom, lineMaterial.clone());
              group.add(line);

              const arrowMesh = createArrowhead(labelPos, targetPos);
              group.add(arrowMesh);
            } catch (fallbackError) {
              logger.error('STEPViewer', 'Error creating fallback leader line', fallbackError);
            }
          }
        } catch (error) {
          logger.error('STEPViewer', 'Error creating dimension annotation', error);
        }
      });
    }

    if (pmiFilter === 'all' || pmiFilter === 'tolerances') {
      pmiData.geometric_tolerances.forEach((tol, index) => {
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
        const transformedPos = transformPMIPosition(tol.position);
        label.position.copy(transformedPos);
        group.add(label);
      });
    }

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
        const transformedPos = transformPMIPosition(datum.position);
        label.position.copy(transformedPos);
        group.add(label);
      });
    }

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
        const transformedPos = transformPMIPosition(finish.position);
        label.position.copy(transformedPos);
        group.add(label);
      });
    }

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
        const transformedPos = transformPMIPosition(weld.position);
        label.position.copy(transformedPos);
        group.add(label);
      });
    }

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
        const transformedPos = transformPMIPosition(note.position);
        label.position.copy(transformedPos);
        group.add(label);

        if (note.leader_points && note.leader_points.length >= 2) {
          const points = note.leader_points.map(p => transformPMIPosition(p));
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

    // Render graphical PMI for AP203/AP214 legacy formats (if filter allows)
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
        const transformedPos = transformPMIPosition(gfx.position);
        label.position.copy(transformedPos);
        group.add(label);
      });
    }

    sceneRef.current.add(group);
    pmiLayerRef.current = group;
    
    logger.debug('STEPViewer', `PMI group added to scene with ${group.children.length} total children. Scene now has ${sceneRef.current.children.length} children.`);
  }, [pmiData, pmiFilter, transformPMIPosition]);

  const removePMIVisualization = useCallback(() => {
    if (!sceneRef.current || !pmiLayerRef.current) return;

    pmiLayerRef.current.traverse((child: THREE.Object3D) => {
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

    sceneRef.current.remove(pmiLayerRef.current);
    pmiLayerRef.current = null;
  }, []);

  const togglePMI = useCallback(() => {
    logger.debug('STEPViewer', 'Toggling PMI display', { currentState: showPMI, pmiDataAvailable: !!pmiData });
    
    if (!pmiData) return;

    const newState = !showPMI;

    if (newState) {
      if (!pmiLayerRef.current) {
        createPMIVisualization();
      } else {
        pmiLayerRef.current.visible = true;
      }
    } else {
      if (pmiLayerRef.current) {
        pmiLayerRef.current.visible = false;
      }
    }
    
    setShowPMI(newState);
  }, [showPMI, createPMIVisualization, removePMIVisualization, pmiData]);

  useEffect(() => {
    if (showPMI && pmiData) {
      createPMIVisualization();
    }
  }, [pmiFilter, showPMI, pmiData, createPMIVisualization]);

  // ── Measurement Tools ──────────────────────────────────────────
  const viewerRefs = useMemo<ViewerRefs | null>(() => {
    if (
      containerRef.current && sceneRef.current && cameraRef.current &&
      rendererRef.current && controlsRef.current && meshesRef.current.length > 0
    ) {
      return {
        container: containerRef.current,
        scene: sceneRef.current,
        camera: cameraRef.current,
        renderer: rendererRef.current,
        meshes: meshesRef.current,
        controls: controlsRef.current,
      };
    }
    return null;
  // Re-compute when loading finishes and meshes are available
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepLoading]);

  const {
    mode: measurementMode,
    phase: measurementPhase,
    results: measurements,
    activateMode,
    clearAll: clearMeasurements,
    deleteResult: deleteMeasurement,
  } = useMeasurements({ viewerRefs });

  // Check if PMI data is available - covers all 7 backend PMI types
  const hasPMIData = pmiData && (
    pmiData.dimensions.length > 0 ||
    pmiData.geometric_tolerances.length > 0 ||
    pmiData.datums.length > 0 ||
    (pmiData.surface_finishes?.length ?? 0) > 0 ||
    (pmiData.weld_symbols?.length ?? 0) > 0 ||
    (pmiData.notes?.length ?? 0) > 0 ||
    (pmiData.graphical_pmi?.length ?? 0) > 0
  );

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="glass-card m-2 mb-0 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
          <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={fitCameraToMeshes}
          disabled={stepLoading || meshesRef.current.length === 0}
          className="h-7 w-7 p-0"
          title="Focus / Fit to view"
        >
          <Focus className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleGrid}
          disabled={stepLoading}
          className={cn("h-7 w-7 p-0", gridVisible && "bg-primary/20 text-primary")}
          title="Toggle grid"
        >
          <Grid3x3 className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleWireframe}
          disabled={stepLoading || meshesRef.current.length === 0}
          className={cn("h-7 w-7 p-0", wireframeMode && "bg-primary/20 text-primary")}
          title="Wireframe mode"
        >
          <Box className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleEdges}
          disabled={stepLoading || meshesRef.current.length === 0}
          className={cn("h-7 w-7 p-0", edgesVisible && "bg-primary/20 text-primary")}
          title="Show edges"
        >
          <Hexagon className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExplodedView}
          disabled={stepLoading || meshesRef.current.length === 0}
          className={cn("h-7 w-7 p-0", explodedView && "bg-primary/20 text-primary")}
          title="Exploded view"
        >
          <Boxes className="h-3.5 w-3.5" />
        </Button>

        {explodedView && (
          <div className="flex items-center gap-1.5 ml-1">
            <Slider
              value={[explosionFactor]}
              onValueChange={handleExplosionFactorChange}
              min={0}
              max={2}
              step={0.1}
              className="w-20"
            />
            <span className="text-[10px] text-muted-foreground tabular-nums w-6">
              {explosionFactor.toFixed(1)}
            </span>
          </div>
        )}

        <div className="w-px h-4 bg-border mx-0.5" />

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDimensionDisplay}
          disabled={stepLoading || meshesRef.current.length === 0 || !dimensions}
          className={cn("h-7 w-7 p-0", showDimensions && "bg-primary/20 text-primary")}
          title={showDimensions ? t('parts.cadViewer.hideDimensions') : t('parts.cadViewer.showDimensions')}
        >
          <Ruler className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFeatureHighlight}
          disabled={stepLoading || meshesRef.current.length === 0}
          className={cn("h-7 w-7 p-0", showFeatures && "bg-primary/20 text-primary")}
          title={showFeatures ? t('parts.cadViewer.hideFeatures') : t('parts.cadViewer.showFeatures')}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </Button>

        {hasPMIData && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePMI}
              disabled={stepLoading || meshesRef.current.length === 0}
              className={cn("h-7 w-7 p-0", showPMI && "bg-cyan-500/20 text-cyan-600")}
              title={showPMI ? t('parts.cadViewer.hidePMI') : t('parts.cadViewer.showPMI')}
            >
              <Crosshair className="h-3.5 w-3.5" />
            </Button>
          </>
        )}

        {/* Measurement Tools */}
        <div className="w-px h-4 bg-border mx-0.5" />
        <MeasurementToolbar
          mode={measurementMode}
          phase={measurementPhase}
          onModeChange={activateMode}
          onClearAll={clearMeasurements}
          measurementCount={measurements.length}
          disabled={stepLoading || meshesRef.current.length === 0}
        />
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-surface">
        <div ref={containerRef} className="absolute inset-0" />

        {showDimensions && dimensions && (
          <div className="absolute top-3 right-3 z-10">
            <div className="glass-card p-3 min-w-[180px]">
              <div className="flex items-center gap-2 mb-2.5">
                <Ruler className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  {t('parts.cadViewer.boundingBox')}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex items-center justify-center text-[8px] font-bold text-white bg-[hsl(var(--brand-primary-light))]">
                      X
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {t('parts.cadViewer.length')}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-foreground tabular-nums">
                    {dimensions.x.toFixed(2)}
                    <span className="text-muted-foreground ml-0.5">mm</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex items-center justify-center text-[8px] font-bold text-white bg-[hsl(var(--color-success))]">
                      Y
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {t('parts.cadViewer.height')}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-foreground tabular-nums">
                    {dimensions.y.toFixed(2)}
                    <span className="text-muted-foreground ml-0.5">mm</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex items-center justify-center text-[8px] font-bold text-black bg-[hsl(var(--color-warning))]">
                      Z
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {t('parts.cadViewer.width')}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-foreground tabular-nums">
                    {dimensions.z.toFixed(2)}
                    <span className="text-muted-foreground ml-0.5">mm</span>
                  </span>
                </div>
              </div>

              <div className="border-t border-border/50 my-2.5" />

              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] text-muted-foreground">
                  {t('parts.cadViewer.measuredFromCad')}
                </span>
              </div>
            </div>
          </div>
        )}

        {showFeatures && (
          <div className="absolute bottom-3 right-3 z-10">
            <div className="glass-card p-2.5 min-w-[160px]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold text-foreground">
                  {t('parts.cadViewer.highlightFeatures')}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-[10px] text-muted-foreground">{t('parts.cadViewer.flatSurfaces')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--status-on-hold))]" />
                  <span className="text-[10px] text-muted-foreground">{t('parts.cadViewer.bendsCurves')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--stage-bending))]" />
                  <span className="text-[10px] text-muted-foreground">{t('parts.cadViewer.holesEdges')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
            <div className="glass-card px-4 py-2 flex items-center gap-3">
              {/* Mode indicator */}
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                  {measurementMode === 'point-to-point' && 'Distance'}
                  {measurementMode === 'face-distance' && 'Thickness'}
                  {measurementMode === 'face-angle' && 'Angle'}
                  {measurementMode === 'radius' && 'Radius'}
                </span>
              </div>
              <div className="w-px h-3 bg-border" />
              {/* Instruction */}
              <span className="text-[11px] text-muted-foreground">
                {(measurementMode === 'point-to-point' || measurementMode === 'radius') && (
                  measurementPhase === 'picking_first'
                    ? t('parts.cadViewer.measurements.selectFirstPoint')
                    : t('parts.cadViewer.measurements.selectSecondPoint')
                )}
                {(measurementMode === 'face-distance' || measurementMode === 'face-angle') && (
                  measurementPhase === 'picking_first'
                    ? t('parts.cadViewer.measurements.selectFirstFace')
                    : t('parts.cadViewer.measurements.selectSecondFace')
                )}
              </span>
              <div className="w-px h-3 bg-border" />
              {/* Keyboard hint */}
              <div className="flex items-center gap-1">
                <kbd className="text-[9px] bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded font-mono border border-border/50">
                  ESC
                </kbd>
                <span className="text-[9px] text-muted-foreground/60">cancel</span>
              </div>
            </div>
          </div>
        )}

        {stepLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                {processingMode === 'server'
                  ? t('parts.cadViewer.processingServer')
                  : t('parts.cadViewer.processingBrowser')}
              </p>
              {processingMode && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  processingMode === 'server'
                    ? "bg-cyan-500/20 text-cyan-600"
                    : "bg-amber-500/20 text-amber-600"
                )}>
                  {processingMode === 'server'
                    ? t('parts.cadViewer.serverProcessing')
                    : t('parts.cadViewer.browserProcessing')}
                </span>
              )}
            </div>
          </div>
        )}

        {loadingError && !stepLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="text-center p-4 max-w-xs">
              <div className="text-destructive text-3xl mb-2 opacity-50">⚠️</div>
              <p className="text-xs text-muted-foreground mb-3">{loadingError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoadingError(null);
                  setLibrariesLoaded(false);
                  setLoadRetryCount(c => c + 1);
                }}
                className="text-xs"
              >
                {t('parts.cadViewer.retryProcessing')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
