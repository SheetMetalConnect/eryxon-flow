import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
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
  Crosshair,
  Maximize,
  Minimize,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useTranslation } from 'react-i18next';
import { getCADConfig } from '@/config/cadBackend';
import type { MeshData } from '@/hooks/useCADProcessing';
import { decodeFloat32Array, decodeUint32Array } from '@/hooks/useCADProcessing';
import { viewerThemes } from '@/theme/theme';
import { useThemeMode } from '@/theme/ThemeProvider';
import { installBVH } from './viewer/measurements/setupBVH';
import { useMeasurements } from './viewer/measurements/useMeasurements';
import { MeasurementToolbar } from './viewer/measurements/MeasurementToolbar';
import { MeasurementPanel } from './viewer/measurements/MeasurementPanel';
import type { ViewerRefs } from './viewer/measurements/types';

// Extracted modules
import type { STEPViewerProps, ModelDimensions, ExplosionData, PMIFilter } from './viewer/types';
import { createScene, startRenderLoop, createResizeHandler, disposeScene, syncTheme } from './viewer/scene';
import type { SceneObjects } from './viewer/scene';
import { createOrbitControls, fitCameraToMeshes } from './viewer/controls';
import { createTwoLevelGrid, rebuildGridForModel, disposeGridGroup } from './viewer/grid';
import { createPMIVisualization, disposePMIGroup } from './viewer/pmi-overlay';

// Install BVH acceleration for fast raycasting
installBVH();

declare global {
  interface Window {
    occtimportjs?: () => Promise<any>;
  }
}

export function STEPViewer({
  url,
  title,
  compact = false,
  pmiData,
  serverGeometry,
  preferServerGeometry = true,
}: STEPViewerProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeMode();
  const palette = viewerThemes[resolvedTheme];
  const occtScriptUrl = getCADConfig().frontend.wasmUrl;

  // ── State ──────────────────────────────────────────────────────
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pmiFilter, setPmiFilter] = useState<PMIFilter>('all');

  // ── Refs ───────────────────────────────────────────────────────
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneObjRef = useRef<SceneObjects | null>(null);
  const controlsRef = useRef<ReturnType<typeof createOrbitControls> | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const edgesRef = useRef<THREE.LineSegments[]>([]);
  const gridRef = useRef<THREE.Group | null>(null);
  const originalPositionsRef = useRef<THREE.Vector3[]>([]);
  const explosionDataRef = useRef<ExplosionData>({
    separationVectors: [],
    baseDistances: [],
    initialized: false,
  });
  const dimensionLinesRef = useRef<THREE.Group | null>(null);
  const originalMaterialsRef = useRef<THREE.Material[]>([]);
  const pmiLayerRef = useRef<THREE.Group | null>(null);

  // ── Server mesh factory ────────────────────────────────────────
  const createMeshFromServerData = useCallback(
    (meshData: MeshData): THREE.Mesh => {
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

      const color = meshData.color
        ? new THREE.Color(meshData.color[0], meshData.color[1], meshData.color[2])
        : new THREE.Color(palette.modelDefault);

      const material = new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        metalness: palette.modelMetalness,
        roughness: palette.modelRoughness,
        flatShading: false,
      });

      return new THREE.Mesh(geometry, material);
    },
    [palette]
  );

  // ── WASM library loader ────────────────────────────────────────
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

      const existing = document.querySelector(`script[src="${occtScriptUrl}"]`);
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.src = occtScriptUrl;

      script.onload = () => {
        let attempts = 0;
        const maxAttempts = 40;
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

  // ── Scene bootstrap ────────────────────────────────────────────
  useEffect(() => {
    if (!librariesLoaded || !containerRef.current) return;

    const container = containerRef.current;
    const so = createScene(container, palette);
    sceneObjRef.current = so;

    const gridGroup = createTwoLevelGrid(1000, 50, palette);
    so.scene.add(gridGroup);
    gridRef.current = gridGroup;

    const controls = createOrbitControls(so.camera, so.renderer.domElement);
    controlsRef.current = controls;

    const stopLoop = startRenderLoop(so.scene, so.camera, so.renderer, so.css2dRenderer, controls);
    const removeResize = createResizeHandler(container, so.camera, so.renderer, so.css2dRenderer);

    return () => {
      removeResize();
      stopLoop();
      disposeScene(container, so.renderer, so.css2dRenderer);
    };
  }, [librariesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mesh helpers ───────────────────────────────────────────────
  const clearMeshes = useCallback(() => {
    const scene = sceneObjRef.current?.scene;
    meshesRef.current.forEach((mesh) => {
      scene?.remove(mesh);
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
      scene?.remove(edges);
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

  const addMeshToScene = useCallback(
    (mesh: THREE.Mesh) => {
      const scene = sceneObjRef.current?.scene;
      if (!scene) return;

      mesh.geometry.computeBoundsTree();
      meshesRef.current.push(mesh);
      originalPositionsRef.current.push(mesh.position.clone());
      scene.add(mesh);

      const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, 30);
      const edgesMaterial = new THREE.LineBasicMaterial({
        color: palette.edgeColor,
        linewidth: 2,
        opacity: palette.edgeOpacity,
        transparent: palette.edgeOpacity < 1,
      });
      const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
      edges.visible = edgesVisible;

      mesh.add(edges);
      edgesRef.current.push(edges);
    },
    [edgesVisible, palette]
  );

  const calculateDimensions = useCallback(() => {
    if (meshesRef.current.length === 0) return;
    const box = new THREE.Box3();
    meshesRef.current.forEach((mesh) => box.expandByObject(mesh));
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    setDimensions({
      x: Math.round(size.x * 100) / 100,
      y: Math.round(size.y * 100) / 100,
      z: Math.round(size.z * 100) / 100,
      center,
    });
  }, []);

  const handleFitCamera = useCallback(() => {
    if (!sceneObjRef.current || !controlsRef.current || meshesRef.current.length === 0) return;
    fitCameraToMeshes(sceneObjRef.current.camera, controlsRef.current, meshesRef.current);
  }, []);

  const updateGridSize = useCallback(() => {
    const scene = sceneObjRef.current?.scene;
    if (!gridRef.current || !scene || meshesRef.current.length === 0) return;
    gridRef.current = rebuildGridForModel(scene, gridRef.current, meshesRef.current, palette, gridVisible);
  }, [gridVisible, palette]);

  // ── Load geometry ──────────────────────────────────────────────
  useEffect(() => {
    if (!librariesLoaded || !sceneObjRef.current) return;

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
        handleFitCamera();
        updateGridSize();
        setStepLoading(false);
      } catch (err) {
        logger.error('STEPViewer', 'Server geometry rendering error', err);
        setLoadingError(err instanceof Error ? err.message : 'Failed to render geometry');
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

        if (!window.occtimportjs) throw new Error('STEP parser not loaded');
        const occt = await window.occtimportjs();

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
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
          const vertices =
            meshData.attributes.position.array instanceof Float32Array
              ? meshData.attributes.position.array
              : new Float32Array(meshData.attributes.position.array);
          geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

          if (meshData.attributes.normal) {
            const normals =
              meshData.attributes.normal.array instanceof Float32Array
                ? meshData.attributes.normal.array
                : new Float32Array(meshData.attributes.normal.array);
            geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
          } else {
            geometry.computeVertexNormals();
          }

          if (meshData.index?.array) {
            const indexArray = meshData.index.array;
            const maxIndex = Math.max(...indexArray);
            const indices = maxIndex > 65535 ? new Uint32Array(indexArray) : new Uint16Array(indexArray);
            geometry.setIndex(new THREE.BufferAttribute(indices, 1));
          }

          const color = meshData.color
            ? new THREE.Color(meshData.color[0], meshData.color[1], meshData.color[2])
            : new THREE.Color(palette.modelDefault);

          const material = new THREE.MeshStandardMaterial({
            color,
            side: THREE.DoubleSide,
            metalness: palette.modelMetalness,
            roughness: palette.modelRoughness,
            flatShading: false,
          });

          const mesh = new THREE.Mesh(geometry, material);
          addMeshToScene(mesh);
        }

        originalMaterialsRef.current = meshesRef.current.map((mesh: THREE.Mesh) =>
          (mesh.material as THREE.Material).clone()
        );
        calculateDimensions();
        handleFitCamera();
        updateGridSize();
        setStepLoading(false);
      } catch (err) {
        logger.error('STEPViewer', 'STEP loading error', err);
        setLoadingError(err instanceof Error ? err.message : 'Failed to load STEP file');
        setStepLoading(false);
      }
    };

    loadSTEP();
  }, [url, librariesLoaded, serverGeometry, preferServerGeometry, edgesVisible, gridVisible, clearMeshes, addMeshToScene, createMeshFromServerData, calculateDimensions, handleFitCamera, updateGridSize, palette]);

  // ── Explosion helpers ──────────────────────────────────────────
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
        relativePos.length() > 0 ? relativePos.clone().normalize() : new THREE.Vector3(0, 0, 1);
      const baseDistance = maxDimension * 0.4;
      explosionDataRef.current.separationVectors[index] = separationVector;
      explosionDataRef.current.baseDistances[index] = baseDistance;
    });
    explosionDataRef.current.initialized = true;
  };

  const applyExplosion = (factor: number) => {
    if (!explosionDataRef.current.initialized) return;
    meshesRef.current.forEach((mesh, index) => {
      const offset = explosionDataRef.current.separationVectors[index]
        .clone()
        .multiplyScalar(explosionDataRef.current.baseDistances[index] * factor);
      mesh.position.copy(originalPositionsRef.current[index].clone().add(offset));
    });
  };

  const toggleExplodedView = () => {
    if (!explodedView) {
      meshesRef.current.forEach((mesh, index) => {
        originalPositionsRef.current[index] = mesh.position.clone();
      });
      if (!explosionDataRef.current.initialized) initializeExplosionData();
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
    if (explodedView) applyExplosion(newFactor);
  };

  // ── View toggles ──────────────────────────────────────────────
  const toggleWireframe = () => {
    meshesRef.current.forEach((mesh) => {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m: THREE.Material) => {
          (m as THREE.MeshStandardMaterial).wireframe = !wireframeMode;
        });
      } else {
        (mesh.material as THREE.MeshStandardMaterial).wireframe = !wireframeMode;
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

  // ── Fullscreen ────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    const el = fullscreenContainerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      logger.error('STEPViewer', 'Fullscreen toggle failed', err);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // ── Reactive theme sync ────────────────────────────────────────
  useEffect(() => {
    const so = sceneObjRef.current;
    if (!so) return;

    syncTheme(so.scene, palette, {
      ambient: so.ambientLight,
      key: so.keyLight,
      fill: so.fillLight,
      back: so.backLight,
    }, edgesRef.current);

    // Rebuild grid with new palette
    if (gridRef.current && meshesRef.current.length > 0) {
      gridRef.current = rebuildGridForModel(
        so.scene,
        gridRef.current,
        meshesRef.current,
        palette,
        gridRef.current.visible
      );
    }
  }, [palette]);

  // ── Dimension visualization ────────────────────────────────────
  const createDimensionVisualization = useCallback(() => {
    const scene = sceneObjRef.current?.scene;
    if (!scene || !dimensions) return;

    if (dimensionLinesRef.current) {
      scene.remove(dimensionLinesRef.current);
      dimensionLinesRef.current.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m: THREE.Material) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
        if (child instanceof CSS2DObject) {
          child.element.remove();
        }
      });
    }

    const group = new THREE.Group();
    group.name = 'dimensionLines';

    const box = new THREE.Box3();
    meshesRef.current.forEach((mesh) => box.expandByObject(mesh));
    const min = box.min;
    const max = box.max;

    const maxDim = Math.max(dimensions.x, dimensions.y, dimensions.z);
    const offset = maxDim * 0.12;

    const colors = { x: 0xef4444, y: 0x22c55e, z: 0x3b82f6 };
    const colorLabels = { x: '#EF4444', y: '#22C55E', z: '#3B82F6' };

    const createDimensionLine = (
      start: THREE.Vector3,
      end: THREE.Vector3,
      color: number,
      colorLabel: string,
      label: string,
      axisName: string
    ) => {
      const lineGroup = new THREE.Group();
      const lineMaterial = new THREE.LineBasicMaterial({
        color,
        linewidth: 1,
        transparent: true,
        opacity: 0.8,
        depthTest: false,
      });

      const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.renderOrder = 990;
      lineGroup.add(line);

      const direction = new THREE.Vector3().subVectors(end, start).normalize();
      const perpendicular = new THREE.Vector3();
      if (Math.abs(direction.y) < 0.9) {
        perpendicular.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
      } else {
        perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
      }

      const capLength = maxDim * 0.015;
      for (const pt of [start, end]) {
        const cap1 = pt.clone().add(perpendicular.clone().multiplyScalar(capLength));
        const cap2 = pt.clone().sub(perpendicular.clone().multiplyScalar(capLength));
        const capGeo = new THREE.BufferGeometry().setFromPoints([cap1, cap2]);
        const cap = new THREE.Line(capGeo, lineMaterial);
        cap.renderOrder = 990;
        lineGroup.add(cap);
      }

      const arrowLen = maxDim * 0.02;
      const arrowHalfW = maxDim * 0.005;
      for (const [origin, dir] of [
        [start, direction],
        [end, direction.clone().negate()],
      ] as const) {
        const tip = origin;
        const back = origin.clone().add((dir as THREE.Vector3).clone().multiplyScalar(arrowLen));
        const positions = new Float32Array([
          tip.x, tip.y, tip.z,
          back.x + perpendicular.x * arrowHalfW, back.y + perpendicular.y * arrowHalfW, back.z + perpendicular.z * arrowHalfW,
          back.x - perpendicular.x * arrowHalfW, back.y - perpendicular.y * arrowHalfW, back.z - perpendicular.z * arrowHalfW,
        ]);
        const arrowGeo = new THREE.BufferGeometry();
        arrowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const arrowMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.8 });
        const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
        arrowMesh.renderOrder = 991;
        lineGroup.add(arrowMesh);
      }

      const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const labelDiv = document.createElement('div');
      labelDiv.style.cssText = [
        `background: rgba(0, 0, 0, 0.75)`,
        `color: ${colorLabel}`,
        'padding: 2px 6px',
        'border-radius: 3px',
        'font-size: 11px',
        'font-weight: 600',
        "font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace",
        'white-space: nowrap',
        'pointer-events: none',
        'user-select: none',
        `border: 1px solid ${colorLabel}40`,
        'backdrop-filter: blur(4px)',
        'z-index: 5',
      ].join(';');
      labelDiv.textContent = `${axisName} ${label}`;
      const css2dLabel = new CSS2DObject(labelDiv);
      css2dLabel.position.copy(midpoint);
      lineGroup.add(css2dLabel);

      return lineGroup;
    };

    // X dimension
    const xStart = new THREE.Vector3(min.x, min.y, min.z - offset);
    const xEnd = new THREE.Vector3(max.x, min.y, min.z - offset);
    group.add(createDimensionLine(xStart, xEnd, colors.x, colorLabels.x, `${dimensions.x.toFixed(2)} mm`, 'X'));

    const xExtMat = new THREE.LineBasicMaterial({ color: colors.x, transparent: true, opacity: 0.3, depthTest: false });
    for (const xVal of [min.x, max.x]) {
      const extGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xVal, min.y, min.z),
        new THREE.Vector3(xVal, min.y, min.z - offset * 1.15),
      ]);
      const ext = new THREE.Line(extGeo, xExtMat);
      ext.renderOrder = 989;
      group.add(ext);
    }

    // Y dimension
    const yStart = new THREE.Vector3(min.x - offset, min.y, min.z);
    const yEnd = new THREE.Vector3(min.x - offset, max.y, min.z);
    group.add(createDimensionLine(yStart, yEnd, colors.y, colorLabels.y, `${dimensions.y.toFixed(2)} mm`, 'Y'));

    const yExtMat = new THREE.LineBasicMaterial({ color: colors.y, transparent: true, opacity: 0.3, depthTest: false });
    for (const yVal of [min.y, max.y]) {
      const extGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(min.x, yVal, min.z),
        new THREE.Vector3(min.x - offset * 1.15, yVal, min.z),
      ]);
      const ext = new THREE.Line(extGeo, yExtMat);
      ext.renderOrder = 989;
      group.add(ext);
    }

    // Z dimension
    const zStart = new THREE.Vector3(min.x, min.y, min.z - offset);
    const zEnd = new THREE.Vector3(min.x, min.y, max.z - offset);
    group.add(createDimensionLine(zStart, zEnd, colors.z, colorLabels.z, `${dimensions.z.toFixed(2)} mm`, 'Z'));

    const zExtMat = new THREE.LineBasicMaterial({ color: colors.z, transparent: true, opacity: 0.3, depthTest: false });
    for (const zVal of [min.z, max.z]) {
      const extGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(min.x, min.y, zVal),
        new THREE.Vector3(min.x, min.y, zVal - offset * 0.15),
      ]);
      const ext = new THREE.Line(extGeo, zExtMat);
      ext.renderOrder = 989;
      group.add(ext);
    }

    scene.add(group);
    dimensionLinesRef.current = group;
  }, [dimensions]);

  const toggleDimensionDisplay = useCallback(() => {
    if (!showDimensions) {
      createDimensionVisualization();
    } else if (dimensionLinesRef.current && sceneObjRef.current?.scene) {
      sceneObjRef.current.scene.remove(dimensionLinesRef.current);
      dimensionLinesRef.current = null;
    }
    setShowDimensions(!showDimensions);
  }, [showDimensions, createDimensionVisualization]);

  // ── Feature highlighting ──────────────────────────────────────
  const applyFeatureHighlighting = useCallback(() => {
    meshesRef.current.forEach((mesh, index) => {
      const geometry = mesh.geometry;
      if (!geometry.attributes.normal) geometry.computeVertexNormals();
      const normals = geometry.attributes.normal;
      const positions = geometry.attributes.position;
      if (!normals || !positions) return;

      const vertexCount = positions.count;
      const curvatures = new Float32Array(vertexCount);
      const neighborMap = new Map<number, Set<number>>();

      if (geometry.index) {
        const indices = geometry.index.array;
        for (let i = 0; i < indices.length; i += 3) {
          const a = indices[i], b = indices[i + 1], c = indices[i + 2];
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
        normalVec.set(normals.getX(i), normals.getY(i), normals.getZ(i));
        const neighbors = neighborMap.get(i);
        if (!neighbors || neighbors.size === 0) { curvatures[i] = 0; continue; }
        let totalDeviation = 0;
        neighbors.forEach((neighborIdx) => {
          neighborNormal.set(normals.getX(neighborIdx), normals.getY(neighborIdx), normals.getZ(neighborIdx));
          totalDeviation += 1 - Math.abs(normalVec.dot(neighborNormal));
        });
        curvatures[i] = totalDeviation / neighbors.size;
      }

      let maxCurvature = 0;
      for (let i = 0; i < vertexCount; i++) {
        if (curvatures[i] > maxCurvature) maxCurvature = curvatures[i];
      }

      const vertexColors = new Float32Array(vertexCount * 3);
      const originalMaterial = originalMaterialsRef.current[index] as THREE.MeshStandardMaterial;
      const baseColor = originalMaterial?.color || new THREE.Color(0x4a90e2);

      for (let i = 0; i < vertexCount; i++) {
        const nc = maxCurvature > 0 ? curvatures[i] / maxCurvature : 0;
        let r: number, g: number, b: number;
        if (nc < 0.15) {
          r = baseColor.r; g = baseColor.g; b = baseColor.b;
        } else if (nc < 0.4) {
          const tt = (nc - 0.15) / 0.25;
          r = baseColor.r + (1.0 - baseColor.r) * tt * 0.8;
          g = baseColor.g + (0.6 - baseColor.g) * tt * 0.8;
          b = baseColor.b * (1 - tt * 0.7);
        } else {
          const tt = Math.min((nc - 0.4) / 0.6, 1);
          r = 0.8 + tt * 0.2; g = 0.2; b = 0.6 + tt * 0.4;
        }
        vertexColors[i * 3] = r;
        vertexColors[i * 3 + 1] = g;
        vertexColors[i * 3 + 2] = b;
      }

      geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));
      mesh.material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        metalness: 0.2,
        roughness: 0.5,
        flatShading: false,
      });
    });
  }, []);

  const removeFeatureHighlighting = useCallback(() => {
    meshesRef.current.forEach((mesh, index) => {
      if (originalMaterialsRef.current[index]) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          mesh.material.dispose();
        }
        mesh.material = originalMaterialsRef.current[index].clone();
        if (mesh.geometry.attributes.color) mesh.geometry.deleteAttribute('color');
      }
    });
  }, []);

  const toggleFeatureHighlight = useCallback(() => {
    if (!showFeatures) applyFeatureHighlighting();
    else removeFeatureHighlighting();
    setShowFeatures(!showFeatures);
  }, [showFeatures, applyFeatureHighlighting, removeFeatureHighlighting]);

  // ── PMI ────────────────────────────────────────────────────────
  const handleTogglePMI = useCallback(() => {
    if (!pmiData || !sceneObjRef.current) return;
    const newState = !showPMI;
    if (newState) {
      if (!pmiLayerRef.current) {
        pmiLayerRef.current = createPMIVisualization(
          sceneObjRef.current.scene, meshesRef.current, pmiData, pmiFilter, pmiLayerRef.current, processingMode
        );
      } else {
        pmiLayerRef.current.visible = true;
      }
    } else {
      if (pmiLayerRef.current) pmiLayerRef.current.visible = false;
    }
    setShowPMI(newState);
  }, [showPMI, pmiData, pmiFilter, processingMode]);

  useEffect(() => {
    if (showPMI && pmiData && sceneObjRef.current) {
      pmiLayerRef.current = createPMIVisualization(
        sceneObjRef.current.scene, meshesRef.current, pmiData, pmiFilter, pmiLayerRef.current, processingMode
      );
    }
  }, [pmiFilter, showPMI, pmiData, processingMode]);

  // ── Measurement wiring ─────────────────────────────────────────
  const viewerRefs = useMemo<ViewerRefs | null>(() => {
    const so = sceneObjRef.current;
    if (
      containerRef.current && so && controlsRef.current && meshesRef.current.length > 0
    ) {
      return {
        container: containerRef.current,
        scene: so.scene,
        camera: so.camera,
        renderer: so.renderer,
        meshes: meshesRef.current,
        controls: controlsRef.current,
      };
    }
    return null;
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

  const hasPMIData =
    pmiData &&
    (pmiData.dimensions.length > 0 ||
      pmiData.geometric_tolerances.length > 0 ||
      pmiData.datums.length > 0 ||
      (pmiData.surface_finishes?.length ?? 0) > 0 ||
      (pmiData.weld_symbols?.length ?? 0) > 0 ||
      (pmiData.notes?.length ?? 0) > 0 ||
      (pmiData.graphical_pmi?.length ?? 0) > 0);

  // ── JSX ────────────────────────────────────────────────────────
  return (
    <div
      ref={fullscreenContainerRef}
      className={cn('flex flex-col h-full w-full bg-background', isFullscreen && 'fixed inset-0 z-[9999]')}
    >
      <div className="glass-card m-2 mb-0 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleFitCamera} disabled={stepLoading || meshesRef.current.length === 0} className="h-7 w-7 p-0" title="Focus / Fit to view"><Focus className="h-3.5 w-3.5" /></Button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Button variant="ghost" size="sm" onClick={toggleGrid} disabled={stepLoading} className={cn('h-7 w-7 p-0', gridVisible && 'bg-primary/20 text-primary')} title="Toggle grid"><Grid3x3 className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={toggleWireframe} disabled={stepLoading || meshesRef.current.length === 0} className={cn('h-7 w-7 p-0', wireframeMode && 'bg-primary/20 text-primary')} title="Wireframe mode"><Box className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={toggleEdges} disabled={stepLoading || meshesRef.current.length === 0} className={cn('h-7 w-7 p-0', edgesVisible && 'bg-primary/20 text-primary')} title="Show edges"><Hexagon className="h-3.5 w-3.5" /></Button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Button variant="ghost" size="sm" onClick={toggleExplodedView} disabled={stepLoading || meshesRef.current.length === 0} className={cn('h-7 w-7 p-0', explodedView && 'bg-primary/20 text-primary')} title="Exploded view"><Boxes className="h-3.5 w-3.5" /></Button>
            {explodedView && (
              <div className="flex items-center gap-1.5 ml-1">
                <Slider value={[explosionFactor]} onValueChange={handleExplosionFactorChange} min={0} max={2} step={0.1} className="w-20" />
                <span className="text-[10px] text-muted-foreground tabular-nums w-6">{explosionFactor.toFixed(1)}</span>
              </div>
            )}
            <div className="w-px h-4 bg-border mx-0.5" />
            <Button variant="ghost" size="sm" onClick={toggleDimensionDisplay} disabled={stepLoading || meshesRef.current.length === 0 || !dimensions} className={cn('h-7 w-7 p-0', showDimensions && 'bg-primary/20 text-primary')} title={showDimensions ? t('parts.cadViewer.hideDimensions') : t('parts.cadViewer.showDimensions')}><Ruler className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={toggleFeatureHighlight} disabled={stepLoading || meshesRef.current.length === 0} className={cn('h-7 w-7 p-0', showFeatures && 'bg-primary/20 text-primary')} title={showFeatures ? t('parts.cadViewer.hideFeatures') : t('parts.cadViewer.showFeatures')}><Sparkles className="h-3.5 w-3.5" /></Button>
            {hasPMIData && (
              <>
                <div className="w-px h-4 bg-border mx-0.5" />
                <Button variant="ghost" size="sm" onClick={handleTogglePMI} disabled={stepLoading || meshesRef.current.length === 0} className={cn('h-7 w-7 p-0', showPMI && 'bg-cyan-500/20 text-cyan-600')} title={showPMI ? t('parts.cadViewer.hidePMI') : t('parts.cadViewer.showPMI')}><Crosshair className="h-3.5 w-3.5" /></Button>
              </>
            )}
            <div className="w-px h-4 bg-border mx-0.5" />
            <MeasurementToolbar mode={measurementMode} phase={measurementPhase} onModeChange={activateMode} onClearAll={clearMeasurements} measurementCount={measurements.length} disabled={stepLoading || meshesRef.current.length === 0} />
          </div>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-7 w-7 p-0 ml-auto" title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}>
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 relative bg-surface">
        <div ref={containerRef} className="absolute inset-0" />

        {showFeatures && (
          <div className="absolute bottom-3 right-3 z-10">
            <div className="glass-card p-2.5 min-w-[160px]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold text-foreground">{t('parts.cadViewer.highlightFeatures')}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-primary" /><span className="text-[10px] text-muted-foreground">{t('parts.cadViewer.flatSurfaces')}</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--status-on-hold))]" /><span className="text-[10px] text-muted-foreground">{t('parts.cadViewer.bendsCurves')}</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--stage-bending))]" /><span className="text-[10px] text-muted-foreground">{t('parts.cadViewer.holesEdges')}</span></div>
              </div>
            </div>
          </div>
        )}

        {measurements.length > 0 && <MeasurementPanel results={measurements} onDelete={deleteMeasurement} />}

        {measurementMode !== 'none' && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
            <div className="glass-card px-4 py-2 flex items-center gap-3">
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
              <span className="text-[11px] text-muted-foreground">
                {(measurementMode === 'point-to-point' || measurementMode === 'radius') &&
                  (measurementPhase === 'picking_first' ? t('parts.cadViewer.measurements.selectFirstPoint') : t('parts.cadViewer.measurements.selectSecondPoint'))}
                {(measurementMode === 'face-distance' || measurementMode === 'face-angle') &&
                  (measurementPhase === 'picking_first' ? t('parts.cadViewer.measurements.selectFirstFace') : t('parts.cadViewer.measurements.selectSecondFace'))}
              </span>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1">
                <kbd className="text-[9px] bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded font-mono border border-border/50">ESC</kbd>
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
                {processingMode === 'server' ? t('parts.cadViewer.processingServer') : t('parts.cadViewer.processingBrowser')}
              </p>
              {processingMode && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', processingMode === 'server' ? 'bg-cyan-500/20 text-cyan-600' : 'bg-amber-500/20 text-amber-600')}>
                  {processingMode === 'server' ? t('parts.cadViewer.serverProcessing') : t('parts.cadViewer.browserProcessing')}
                </span>
              )}
            </div>
          </div>
        )}

        {loadingError && !stepLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="text-center p-4 max-w-xs">
              <div className="text-destructive text-3xl mb-2 opacity-50">&#9888;&#65039;</div>
              <p className="text-xs text-muted-foreground mb-3">{loadingError}</p>
              <Button variant="outline" size="sm" onClick={() => { setLoadingError(null); setLibrariesLoaded(false); setLoadRetryCount((c) => c + 1); }} className="text-xs">
                {t('parts.cadViewer.retryProcessing')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
