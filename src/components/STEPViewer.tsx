import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

// Interface for calculated dimensions
interface ModelDimensions {
  x: number;
  y: number;
  z: number;
  center: THREE.Vector3;
}

// Extend Window interface for occt-import-js
declare global {
  interface Window {
    occtimportjs?: () => Promise<any>;
  }
}

// Unified part color - steel blue for professional CAD look
const UNIFIED_PART_COLOR = new THREE.Color(0x6b8cae);

interface STEPViewerProps {
  url: string;
  title?: string;
  compact?: boolean;
}

export function STEPViewer({
  url,
  title,
  compact = false,
}: STEPViewerProps) {
  const { t } = useTranslation();

  // State
  const [stepLoading, setStepLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [explodedView, setExplodedView] = useState(false);
  const [explosionFactor, setExplosionFactor] = useState(1);
  const [gridVisible, setGridVisible] = useState(true);
  const [edgesVisible, setEdgesVisible] = useState(true);
  const [showDimensions, setShowDimensions] = useState(false);
  const [dimensions, setDimensions] = useState<ModelDimensions | null>(null);

  // Three.js refs
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const edgesRef = useRef<THREE.LineSegments[]>([]);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Explosion state refs
  const originalPositionsRef = useRef<THREE.Vector3[]>([]);
  const explosionDataRef = useRef({
    separationVectors: [] as THREE.Vector3[],
    baseDistances: [] as number[],
    initialized: false,
  });

  // Dimension lines ref
  const dimensionLinesRef = useRef<THREE.Group | null>(null);

  // Load occt-import-js library from CDN
  useEffect(() => {
    const loadOcct = async () => {
      if (!window.occtimportjs) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js';

        script.onload = () => {
          // Wait for library initialization
          setTimeout(() => {
            if (window.occtimportjs) {
              setLibrariesLoaded(true);
            } else {
              setLoadingError('Failed to initialize STEP parser');
            }
          }, 500);
        };

        script.onerror = () => {
          setLoadingError('Failed to load STEP parser library');
        };

        document.head.appendChild(script);
      } else {
        setLibrariesLoaded(true);
      }
    };

    loadOcct();
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!librariesLoaded || !containerRef.current) return;

    // Capture container ref for cleanup
    const container = containerRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );
    camera.position.set(200, 200, 200);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      container.clientWidth,
      container.clientHeight
    );
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights - Multiple directional lights for better edge visibility
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    // Back light for better edge definition
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(0, 5, -5);
    scene.add(backLight);

    // Grid
    const grid = new THREE.GridHelper(1000, 50, 0x444444, 0x888888);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    scene.add(grid);
    gridRef.current = grid;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [librariesLoaded]);

  /**
   * Clear existing meshes and edges from the scene
   */
  const clearMeshes = useCallback(() => {
    // Clear existing meshes
    meshesRef.current.forEach((mesh) => {
      sceneRef.current?.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    meshesRef.current = [];

    // Clear existing edges
    edgesRef.current.forEach((edges) => {
      sceneRef.current?.remove(edges);
      edges.geometry.dispose();
      if (Array.isArray(edges.material)) {
        edges.material.forEach(m => m.dispose());
      } else {
        edges.material.dispose();
      }
    });
    edgesRef.current = [];

    originalPositionsRef.current = [];
    explosionDataRef.current.initialized = false;
  }, []);

  /**
   * Add a mesh to the scene with edges
   */
  const addMeshToScene = useCallback((mesh: THREE.Mesh) => {
    if (!sceneRef.current) return;

    meshesRef.current.push(mesh);
    originalPositionsRef.current.push(mesh.position.clone());
    sceneRef.current.add(mesh);

    // Add edges for better contour visibility (threshold angle: 30 degrees)
    const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, 30);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 1,
      opacity: 0.8,
      transparent: true,
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    edges.visible = edgesVisible;

    // Position edges with mesh (for exploded view)
    mesh.add(edges);
    edgesRef.current.push(edges);
  }, [edgesVisible]);

  // Calculate dimensions from bounding box
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

  // Fit camera to meshes
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

  // Update grid size based on model
  const updateGridSize = useCallback(() => {
    if (!gridRef.current || !sceneRef.current || meshesRef.current.length === 0)
      return;

    const box = new THREE.Box3();
    meshesRef.current.forEach((mesh) => box.expandByObject(mesh));
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    // Grid size = 3x assembly size
    const gridSize = Math.max(
      1000,
      Math.ceil((maxDimension * 3) / 100) * 100
    );
    const divisions = Math.max(10, Math.min(100, Math.round(gridSize / 100)));

    // Remove old grid
    sceneRef.current.remove(gridRef.current);
    gridRef.current.geometry.dispose();
    if (Array.isArray(gridRef.current.material)) {
      gridRef.current.material.forEach(m => m.dispose());
    } else {
      gridRef.current.material.dispose();
    }

    // Create new grid
    const newGrid = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x888888);
    newGrid.material.transparent = true;
    newGrid.material.opacity = 0.35;
    newGrid.visible = gridVisible;

    sceneRef.current.add(newGrid);
    gridRef.current = newGrid;
  }, [gridVisible]);

  // Load and render STEP file using frontend processing
  useEffect(() => {
    if (!librariesLoaded || !sceneRef.current || !url) return;

    const loadSTEP = async () => {
      try {
        setStepLoading(true);
        setLoadingError(null);

        // Initialize occt-import-js
        if (!window.occtimportjs) {
          throw new Error('STEP parser not loaded');
        }
        const occt = await window.occtimportjs();

        // Fetch STEP file
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const fileBuffer = new Uint8Array(arrayBuffer);

        // Parse STEP
        const result = occt.ReadStepFile(fileBuffer, null);

        if (!result.meshes || result.meshes.length === 0) {
          throw new Error('No geometry found in STEP file');
        }

        clearMeshes();

        // Convert to Three.js meshes with unified color
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

          // Normals
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

          // Material - Using unified color for all parts
          const material = new THREE.MeshStandardMaterial({
            color: UNIFIED_PART_COLOR,
            side: THREE.DoubleSide,
            metalness: 0.3,
            roughness: 0.6,
            flatShading: false,
          });

          // Create and add mesh
          const mesh = new THREE.Mesh(geometry, material);
          addMeshToScene(mesh);
        }

        // Calculate dimensions
        calculateDimensions();

        // Fit camera to view
        fitCameraToMeshes();
        updateGridSize();

        setStepLoading(false);
      } catch (err) {
        console.error('STEP loading error:', err);
        setLoadingError(
          err instanceof Error ? err.message : 'Failed to load STEP file'
        );
        setStepLoading(false);
      }
    };

    loadSTEP();
  }, [url, librariesLoaded, edgesVisible, gridVisible, clearMeshes, addMeshToScene, calculateDimensions, fitCameraToMeshes, updateGridSize]);


  // Initialize explosion data
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

      // Determine separation direction
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

  // Apply explosion effect
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

  // Toggle exploded view
  const toggleExplodedView = () => {
    if (!explodedView) {
      // Store original positions
      meshesRef.current.forEach((mesh, index) => {
        originalPositionsRef.current[index] = mesh.position.clone();
      });

      if (!explosionDataRef.current.initialized) {
        initializeExplosionData();
      }

      applyExplosion(explosionFactor);
    } else {
      // Return to original positions
      meshesRef.current.forEach((mesh, index) => {
        mesh.position.copy(originalPositionsRef.current[index]);
      });
    }

    setExplodedView(!explodedView);
  };

  // Handle explosion factor change
  const handleExplosionFactorChange = (values: number[]) => {
    const newFactor = values[0];
    setExplosionFactor(newFactor);
    if (explodedView) {
      applyExplosion(newFactor);
    }
  };

  // Toggle wireframe mode
  const toggleWireframe = () => {
    meshesRef.current.forEach((mesh) => {
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => {
            m.wireframe = !wireframeMode;
          });
        } else {
          mesh.material.wireframe = !wireframeMode;
        }
      }
    });
    setWireframeMode(!wireframeMode);
  };

  // Toggle grid visibility
  const toggleGrid = () => {
    if (gridRef.current) {
      gridRef.current.visible = !gridVisible;
      setGridVisible(!gridVisible);
    }
  };

  // Toggle edges visibility
  const toggleEdges = () => {
    edgesRef.current.forEach((edges) => {
      edges.visible = !edgesVisible;
    });
    setEdgesVisible(!edgesVisible);
  };


  // Create dimension visualization lines in 3D
  const createDimensionVisualization = useCallback(() => {
    if (!sceneRef.current || !dimensions) return;

    // Remove existing dimension lines
    if (dimensionLinesRef.current) {
      sceneRef.current.remove(dimensionLinesRef.current);
      dimensionLinesRef.current.traverse((child) => {
        if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
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

    // Offset for dimension lines (outside the model)
    const offset = Math.max(dimensions.x, dimensions.y, dimensions.z) * 0.15;

    // Colors for each axis - matching design system
    const colors = {
      x: 0x4a9eff, // Blue - X axis
      y: 0x34a853, // Green - Y axis
      z: 0xfbbc05, // Yellow - Z axis
    };

    // Create dimension line helper
    const createDimensionLine = (
      start: THREE.Vector3,
      end: THREE.Vector3,
      color: number,
      label: string
    ) => {
      const lineGroup = new THREE.Group();

      // Main dimension line
      const lineMaterial = new THREE.LineBasicMaterial({
        color,
        linewidth: 2,
        transparent: true,
        opacity: 0.9,
      });

      const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      lineGroup.add(line);

      // End caps (small perpendicular lines)
      const capLength = offset * 0.3;
      const direction = new THREE.Vector3().subVectors(end, start).normalize();
      const perpendicular = new THREE.Vector3();

      // Find a perpendicular vector
      if (Math.abs(direction.y) < 0.9) {
        perpendicular.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
      } else {
        perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
      }

      // Start cap
      const startCap1 = start.clone().add(perpendicular.clone().multiplyScalar(capLength / 2));
      const startCap2 = start.clone().sub(perpendicular.clone().multiplyScalar(capLength / 2));
      const startCapGeometry = new THREE.BufferGeometry().setFromPoints([startCap1, startCap2]);
      const startCap = new THREE.Line(startCapGeometry, lineMaterial);
      lineGroup.add(startCap);

      // End cap
      const endCap1 = end.clone().add(perpendicular.clone().multiplyScalar(capLength / 2));
      const endCap2 = end.clone().sub(perpendicular.clone().multiplyScalar(capLength / 2));
      const endCapGeometry = new THREE.BufferGeometry().setFromPoints([endCap1, endCap2]);
      const endCap = new THREE.Line(endCapGeometry, lineMaterial);
      lineGroup.add(endCap);

      // Arrow heads
      const arrowLength = offset * 0.2;
      const arrowWidth = offset * 0.08;

      // Arrow at start pointing outward
      const arrow1 = start.clone().add(direction.clone().multiplyScalar(arrowLength));
      const arrowGeom1 = new THREE.BufferGeometry().setFromPoints([
        start,
        arrow1.clone().add(perpendicular.clone().multiplyScalar(arrowWidth)),
        arrow1.clone().sub(perpendicular.clone().multiplyScalar(arrowWidth)),
        start,
      ]);
      const arrowMesh1 = new THREE.Line(arrowGeom1, lineMaterial);
      lineGroup.add(arrowMesh1);

      // Arrow at end pointing outward
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

    // X dimension (along bottom, offset in -Z direction)
    const xStart = new THREE.Vector3(min.x, min.y, min.z - offset);
    const xEnd = new THREE.Vector3(max.x, min.y, min.z - offset);
    group.add(createDimensionLine(xStart, xEnd, colors.x, `${dimensions.x} mm`));

    // Extension lines for X
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

    // Y dimension (along left side, offset in -X direction)
    const yStart = new THREE.Vector3(min.x - offset, min.y, min.z);
    const yEnd = new THREE.Vector3(min.x - offset, max.y, min.z);
    group.add(createDimensionLine(yStart, yEnd, colors.y, `${dimensions.y} mm`));

    // Extension lines for Y
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

    // Z dimension (along back edge, offset in -X direction)
    const zStart = new THREE.Vector3(min.x - offset, min.y, min.z);
    const zEnd = new THREE.Vector3(min.x - offset, min.y, max.z);
    group.add(createDimensionLine(zStart, zEnd, colors.z, `${dimensions.z} mm`));

    // Extension lines for Z
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

  // Toggle dimension display
  const toggleDimensionDisplay = useCallback(() => {
    if (!showDimensions) {
      createDimensionVisualization();
    } else if (dimensionLinesRef.current && sceneRef.current) {
      sceneRef.current.remove(dimensionLinesRef.current);
      dimensionLinesRef.current = null;
    }
    setShowDimensions(!showDimensions);
  }, [showDimensions, createDimensionVisualization]);

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Professional CAD Toolbar */}
      <div className="glass-card m-2 mb-0 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={fitCameraToMeshes}
              disabled={stepLoading || meshesRef.current.length === 0}
              className="h-7 w-7 p-0"
              title={t('parts.cadViewer.fitToView')}
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
              title={t('parts.cadViewer.toggleGrid')}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleWireframe}
              disabled={stepLoading || meshesRef.current.length === 0}
              className={cn("h-7 w-7 p-0", wireframeMode && "bg-primary/20 text-primary")}
              title={t('parts.cadViewer.wireframeMode')}
            >
              <Box className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleEdges}
              disabled={stepLoading || meshesRef.current.length === 0}
              className={cn("h-7 w-7 p-0", edgesVisible && "bg-primary/20 text-primary")}
              title={t('parts.cadViewer.showEdges')}
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
              title={t('parts.cadViewer.explodedView')}
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
          </div>

          {/* Expand button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            title={t('parts.cadViewer.expand')}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('parts.cadViewer.expand')}</span>
          </Button>
        </div>
      </div>

      {/* 3D Viewer Container */}
      <div className="flex-1 relative bg-surface">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Dimension Overlay Panel */}
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
                {/* X Dimension */}
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

                {/* Y Dimension */}
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

                {/* Z Dimension */}
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

              {/* Divider */}
              <div className="border-t border-border/50 my-2.5" />

              {/* Source indicator */}
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] text-muted-foreground">
                  {t('parts.cadViewer.measuredFromCad')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {stepLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                {t('parts.cadViewer.loading')}
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
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
                  setTimeout(() => setLibrariesLoaded(true), 100);
                }}
                className="text-xs"
              >
                {t('parts.cadViewer.retry')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
