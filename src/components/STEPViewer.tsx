import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Focus,
  Grid3x3,
  Boxes,
  Loader2,
  Box,
  Hexagon,
  Ruler,
  RotateCcw,
  ListTree,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { getCADConfig } from '@/config/cadBackend';

// Import constants and utilities
import {
  COLORS,
  MATERIAL_DEFAULTS,
  LIGHTING_DEFAULTS,
  EDGE_DEFAULTS,
  CAMERA_DEFAULTS,
  GRID_DEFAULTS,
  PERFORMANCE_DEFAULTS,
  EXPLOSION_DEFAULTS,
  DIMENSION_DEFAULTS,
} from '@/lib/step-viewer/constants';
import type {
  STEPViewerProps,
  ModelDimensions,
  OcctMeshData,
  OcctImportResult,
  ExplosionData,
  AssemblyInfo,
  PartInfo,
} from '@/lib/step-viewer/types';
import {
  disposeMeshArray,
  disposeEdgeArray,
  disposeGrid,
  disposeDimensionLines,
} from '@/lib/step-viewer/dispose';

// Extend Window interface for occt-import-js
declare global {
  interface Window {
    occtimportjs?: () => Promise<{
      ReadStepFile: (buffer: Uint8Array, options: unknown) => OcctImportResult;
    }>;
  }
}

// Shared material instance for performance
let sharedMaterial: THREE.MeshPhysicalMaterial | null = null;

function getSharedMaterial(): THREE.MeshPhysicalMaterial {
  if (!sharedMaterial) {
    sharedMaterial = new THREE.MeshPhysicalMaterial({
      color: COLORS.PART,
      side: THREE.DoubleSide,
      metalness: MATERIAL_DEFAULTS.METALNESS,
      roughness: MATERIAL_DEFAULTS.ROUGHNESS,
      flatShading: false,
    });
  }
  return sharedMaterial;
}

// Shared edge material
let sharedEdgeMaterial: THREE.LineBasicMaterial | null = null;

function getSharedEdgeMaterial(): THREE.LineBasicMaterial {
  if (!sharedEdgeMaterial) {
    sharedEdgeMaterial = new THREE.LineBasicMaterial({
      color: COLORS.EDGE,
      linewidth: EDGE_DEFAULTS.WIDTH,
      opacity: EDGE_DEFAULTS.OPACITY,
      transparent: true,
    });
  }
  return sharedEdgeMaterial;
}

/**
 * Toolbar toggle button with tooltip
 */
function ToolbarToggle({
  pressed,
  onPressedChange,
  disabled,
  tooltip,
  children,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={pressed}
          onPressedChange={onPressedChange}
          disabled={disabled}
          className="h-8 w-8 p-0 data-[state=on]:bg-primary/20 data-[state=on]:text-primary"
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Toolbar action button with tooltip (non-toggle)
 */
function ToolbarAction({
  onClick,
  disabled,
  tooltip,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={onClick}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function STEPViewer({ url }: STEPViewerProps) {
  const { t } = useTranslation();

  // State
  const [stepLoading, setStepLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [explodedView, setExplodedView] = useState(false);
  const [explosionFactor, setExplosionFactor] = useState(EXPLOSION_DEFAULTS.DEFAULT_FACTOR);
  const [gridVisible, setGridVisible] = useState(true);
  const [edgesVisible, setEdgesVisible] = useState(true);
  const [showDimensions, setShowDimensions] = useState(false);
  const [dimensions, setDimensions] = useState<ModelDimensions | null>(null);
  const [assemblyInfo, setAssemblyInfo] = useState<AssemblyInfo | null>(null);
  const [showAssemblyTree, setShowAssemblyTree] = useState(false);

  // Three.js refs
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const edgesRef = useRef<(THREE.LineSegments | THREE.Line)[]>([]);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Explosion state refs
  const originalPositionsRef = useRef<THREE.Vector3[]>([]);
  const explosionDataRef = useRef<ExplosionData>({
    separationVectors: [],
    baseDistances: [],
    initialized: false,
  });

  // Dimension lines ref
  const dimensionLinesRef = useRef<THREE.Group | null>(null);

  // Light refs for scene-size updates
  const hemisphereLightRef = useRef<THREE.HemisphereLight | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Visibility refs (avoid re-renders)
  const edgesVisibleRef = useRef(edgesVisible);
  const gridVisibleRef = useRef(gridVisible);

  useEffect(() => { edgesVisibleRef.current = edgesVisible; }, [edgesVisible]);
  useEffect(() => { gridVisibleRef.current = gridVisible; }, [gridVisible]);

  // Load occt-import-js library from CDN
  useEffect(() => {
    const loadOcct = async () => {
      if (!window.occtimportjs) {
        const config = getCADConfig();
        const script = document.createElement('script');
        script.src = config.frontend.wasmUrl;

        script.onload = () => {
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

    const container = containerRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.BACKGROUND);
    sceneRef.current = scene;

    // Camera (improved settings)
    const camera = new THREE.PerspectiveCamera(
      CAMERA_DEFAULTS.FOV,
      container.clientWidth / container.clientHeight,
      CAMERA_DEFAULTS.NEAR,
      CAMERA_DEFAULTS.FAR
    );
    camera.position.set(200, 200, 200);
    cameraRef.current = camera;

    // Renderer with performance optimization
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio / PERFORMANCE_DEFAULTS.PIXEL_RATIO_DIVISOR);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting - Two-light setup (HemisphereLight + DirectionalLight)
    const hemisphereLight = new THREE.HemisphereLight(
      LIGHTING_DEFAULTS.HEMISPHERE.SKY_COLOR,
      LIGHTING_DEFAULTS.HEMISPHERE.GROUND_COLOR,
      LIGHTING_DEFAULTS.HEMISPHERE.INTENSITY
    );
    scene.add(hemisphereLight);
    hemisphereLightRef.current = hemisphereLight;

    const directionalLight = new THREE.DirectionalLight(
      LIGHTING_DEFAULTS.DIRECTIONAL.COLOR,
      LIGHTING_DEFAULTS.DIRECTIONAL.INTENSITY
    );
    directionalLight.position.set(100, 150, 100);
    scene.add(directionalLight);
    directionalLightRef.current = directionalLight;

    // Grid
    const grid = new THREE.GridHelper(GRID_DEFAULTS.MIN_SIZE, 50, COLORS.GRID.CENTER, COLORS.GRID.LINES);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = GRID_DEFAULTS.OPACITY;
    scene.add(grid);
    gridRef.current = grid;

    // Controls with improved damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = CAMERA_DEFAULTS.DAMPING_FACTOR;
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
   * Update light positions based on scene size
   */
  const updateLightPositions = useCallback((sceneSize: number) => {
    if (directionalLightRef.current) {
      directionalLightRef.current.position.set(
        sceneSize * LIGHTING_DEFAULTS.DIRECTIONAL.POSITION.X,
        sceneSize * LIGHTING_DEFAULTS.DIRECTIONAL.POSITION.Y,
        sceneSize * LIGHTING_DEFAULTS.DIRECTIONAL.POSITION.Z
      );
    }
    if (hemisphereLightRef.current) {
      hemisphereLightRef.current.position.set(0, sceneSize * 0.75, 0);
    }
  }, []);

  /**
   * Clear existing meshes and edges with safe disposal
   */
  const clearMeshes = useCallback(() => {
    const scene = sceneRef.current;
    disposeMeshArray(meshesRef.current, scene);
    meshesRef.current = [];
    disposeEdgeArray(edgesRef.current, scene);
    edgesRef.current = [];
    originalPositionsRef.current = [];
    explosionDataRef.current.initialized = false;
  }, []);

  /**
   * Add a mesh to the scene with computed edges
   */
  const addMeshToScene = useCallback((mesh: THREE.Mesh) => {
    if (!sceneRef.current) return;

    meshesRef.current.push(mesh);
    originalPositionsRef.current.push(mesh.position.clone());
    sceneRef.current.add(mesh);

    // Add computed edges for contour visibility
    const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, EDGE_DEFAULTS.THRESHOLD_ANGLE);
    const edges = new THREE.LineSegments(edgesGeometry, getSharedEdgeMaterial());
    edges.visible = edgesVisibleRef.current;
    mesh.add(edges);
    edgesRef.current.push(edges);
  }, []);

  /**
   * Extract and render CAD edges from OCCT data when available
   * Edges are added to the parent mesh so they inherit transforms during explosion
   */
  const addCadEdgesToScene = useCallback((parentMesh: THREE.Object3D, meshData: OcctMeshData) => {
    if (!parentMesh || !meshData.brep_faces) return;

    meshData.brep_faces.forEach(face => {
      if (!face.edge_loops) return;
      face.edge_loops.forEach(loop => {
        if (!loop.edges) return;
        loop.edges.forEach(edge => {
          if (!edge.vertex_coord || edge.vertex_coord.length < 2) return;
          const points = edge.vertex_coord.map(c => new THREE.Vector3(c[0], c[1], c[2]));
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geometry, getSharedEdgeMaterial());
          line.visible = edgesVisibleRef.current;
          parentMesh.add(line);
          edgesRef.current.push(line);
        });
      });
    });
  }, []);

  // Calculate dimensions from bounding box
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
      center: center,
    });

    // Update lighting based on model size
    const maxSize = Math.max(size.x, size.y, size.z);
    updateLightPositions(maxSize);
  }, [updateLightPositions]);

  // Fit camera to meshes
  const fitCameraToMeshes = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current || meshesRef.current.length === 0) return;

    const box = new THREE.Box3();
    meshesRef.current.forEach((mesh) => box.expandByObject(mesh));

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    const distance = maxSize * CAMERA_DEFAULTS.INITIAL_DISTANCE_MULTIPLIER;

    cameraRef.current.position.set(center.x + distance, center.y + distance, center.z + distance);
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  }, []);

  // Update grid size based on model
  const updateGridSize = useCallback(() => {
    if (!gridRef.current || !sceneRef.current || meshesRef.current.length === 0) return;

    const box = new THREE.Box3();
    meshesRef.current.forEach((mesh) => box.expandByObject(mesh));
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    const gridSize = Math.max(GRID_DEFAULTS.MIN_SIZE, Math.ceil((maxDimension * GRID_DEFAULTS.SIZE_MULTIPLIER) / 100) * 100);
    const divisions = Math.max(GRID_DEFAULTS.MIN_DIVISIONS, Math.min(GRID_DEFAULTS.MAX_DIVISIONS, Math.round(gridSize / 100)));

    disposeGrid(gridRef.current, sceneRef.current);

    const newGrid = new THREE.GridHelper(gridSize, divisions, COLORS.GRID.CENTER, COLORS.GRID.LINES);
    (newGrid.material as THREE.Material).transparent = true;
    (newGrid.material as THREE.Material).opacity = GRID_DEFAULTS.OPACITY;
    newGrid.visible = gridVisibleRef.current;

    sceneRef.current.add(newGrid);
    gridRef.current = newGrid;
  }, []);

  // Load and render STEP file
  useEffect(() => {
    if (!librariesLoaded || !sceneRef.current || !url) return;

    const loadSTEP = async () => {
      try {
        setStepLoading(true);
        setLoadingError(null);
        setAssemblyInfo(null);

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

        // Debug: Log the result structure to understand what occt-import-js provides
        if (import.meta.env.DEV) {
          console.log('[STEPViewer] occt-import-js result:', {
            meshCount: result.meshes.length,
            meshes: result.meshes.map((m, i) => ({
              index: i,
              name: m.name,
              color: m.color,
              hasPosition: !!m.attributes?.position,
              hasBrepFaces: !!m.brep_faces?.length,
            })),
          });
        }

        clearMeshes();

        // Build assembly info from parsed STEP data
        const parts: PartInfo[] = [];

        // Create individual meshes (preserves explosion view functionality)
        for (let i = 0; i < result.meshes.length; i++) {
          const meshData = result.meshes[i];
          if (!meshData.attributes?.position?.array) continue;

          const geometry = new THREE.BufferGeometry();

          const vertices = meshData.attributes.position.array instanceof Float32Array
            ? meshData.attributes.position.array
            : new Float32Array(meshData.attributes.position.array);
          geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

          if (meshData.attributes.normal?.array) {
            const normals = meshData.attributes.normal.array instanceof Float32Array
              ? meshData.attributes.normal.array
              : new Float32Array(meshData.attributes.normal.array);
            geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
          } else {
            geometry.computeVertexNormals();
          }

          if (meshData.index?.array) {
            const indexArray = meshData.index.array;
            // Compute maxIndex safely without spreading (avoids JS argument limit for large arrays)
            let maxIndex = 0;
            for (let j = 0; j < indexArray.length; j++) {
              if (indexArray[j] > maxIndex) {
                maxIndex = indexArray[j];
              }
            }
            const indices = maxIndex > 65535 ? new Uint32Array(indexArray) : new Uint16Array(indexArray);
            geometry.setIndex(new THREE.BufferAttribute(indices, 1));
          }

          const mesh = new THREE.Mesh(geometry, getSharedMaterial());
          
          // Store part name on the mesh for later reference
          const partName = meshData.name || `Part ${i + 1}`;
          mesh.name = partName;
          mesh.userData.partIndex = i;
          
          addMeshToScene(mesh);
          // Add CAD edges to mesh (not scene) so they inherit transforms during explosion
          addCadEdgesToScene(mesh, meshData);

          // Track part info for assembly tree
          parts.push({
            index: i,
            name: partName,
            visible: true,
            selected: false,
          });
        }

        // Set assembly info
        const newAssemblyInfo: AssemblyInfo = {
          partCount: parts.length,
          parts,
          isAssembly: parts.length > 1,
        };
        setAssemblyInfo(newAssemblyInfo);

        if (import.meta.env.DEV) {
          console.log('[STEPViewer] Assembly info:', newAssemblyInfo);
        }

        calculateDimensions();
        fitCameraToMeshes();
        updateGridSize();
        setStepLoading(false);
      } catch (err) {
        console.error('STEP loading error:', err);
        setLoadingError(err instanceof Error ? err.message : 'Failed to load STEP file');
        setStepLoading(false);
      }
    };

    loadSTEP();
  }, [url, librariesLoaded, clearMeshes, addMeshToScene, addCadEdgesToScene, calculateDimensions, fitCameraToMeshes, updateGridSize]);

  // Explosion view functions
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
      const separationVector = relativePos.length() > 0 ? relativePos.clone().normalize() : new THREE.Vector3(0, 0, 1);
      const baseDistance = maxDimension * EXPLOSION_DEFAULTS.BASE_DISTANCE_MULTIPLIER;

      explosionDataRef.current.separationVectors[index] = separationVector;
      explosionDataRef.current.baseDistances[index] = baseDistance;
    });

    explosionDataRef.current.initialized = true;
  };

  const applyExplosion = (factor: number) => {
    if (!explosionDataRef.current.initialized) return;

    meshesRef.current.forEach((mesh, index) => {
      const separationVector = explosionDataRef.current.separationVectors[index];
      const baseDistance = explosionDataRef.current.baseDistances[index];
      const offset = separationVector.clone().multiplyScalar(baseDistance * factor);
      const newPosition = originalPositionsRef.current[index].clone().add(offset);
      mesh.position.copy(newPosition);
    });
  };

  const handleExplodedViewChange = (pressed: boolean) => {
    if (pressed) {
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
    setExplodedView(pressed);
  };

  const handleExplosionFactorChange = (values: number[]) => {
    const newFactor = values[0];
    setExplosionFactor(newFactor);
    if (explodedView) {
      applyExplosion(newFactor);
    }
  };

  // Toggle functions
  const handleWireframeChange = (pressed: boolean) => {
    meshesRef.current.forEach((mesh) => {
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => { m.wireframe = pressed; });
        } else {
          mesh.material.wireframe = pressed;
        }
      }
    });
    setWireframeMode(pressed);
  };

  const handleGridChange = (pressed: boolean) => {
    if (gridRef.current) {
      gridRef.current.visible = pressed;
      setGridVisible(pressed);
    }
  };

  const handleEdgesChange = (pressed: boolean) => {
    edgesRef.current.forEach((edges) => {
      edges.visible = pressed;
    });
    setEdgesVisible(pressed);
  };

  // Toggle part visibility in assembly tree
  const handlePartVisibilityToggle = (partIndex: number) => {
    if (!assemblyInfo) return;

    const mesh = meshesRef.current[partIndex];
    if (!mesh) return;

    const newVisible = !mesh.visible;
    mesh.visible = newVisible;

    // Also toggle edges associated with this mesh
    // Edges are added as children of the mesh
    mesh.traverse((child) => {
      child.visible = newVisible;
    });

    // Update assembly info state
    setAssemblyInfo(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        parts: prev.parts.map((part, idx) =>
          idx === partIndex ? { ...part, visible: newVisible } : part
        ),
      };
    });
  };

  // Dimension visualization
  const createDimensionVisualization = useCallback(() => {
    if (!sceneRef.current || !dimensions) return;

    disposeDimensionLines(dimensionLinesRef.current, sceneRef.current);

    const group = new THREE.Group();
    group.name = 'dimensionLines';

    const box = new THREE.Box3();
    meshesRef.current.forEach((mesh) => box.expandByObject(mesh));
    const min = box.min;
    const max = box.max;

    const offset = Math.max(dimensions.x, dimensions.y, dimensions.z) * DIMENSION_DEFAULTS.OFFSET_MULTIPLIER;
    const colors = COLORS.DIMENSIONS;

    const createDimensionLine = (start: THREE.Vector3, end: THREE.Vector3, color: number) => {
      const lineGroup = new THREE.Group();

      const lineMaterial = new THREE.LineBasicMaterial({
        color,
        linewidth: 2,
        transparent: true,
        opacity: DIMENSION_DEFAULTS.LINE_OPACITY,
      });

      const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
      lineGroup.add(new THREE.Line(lineGeometry, lineMaterial));

      const capLength = offset * DIMENSION_DEFAULTS.CAP_LENGTH_MULTIPLIER;
      const direction = new THREE.Vector3().subVectors(end, start).normalize();
      const perpendicular = new THREE.Vector3();

      if (Math.abs(direction.y) < 0.9) {
        perpendicular.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
      } else {
        perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
      }

      // Caps
      const startCap1 = start.clone().add(perpendicular.clone().multiplyScalar(capLength / 2));
      const startCap2 = start.clone().sub(perpendicular.clone().multiplyScalar(capLength / 2));
      lineGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([startCap1, startCap2]), lineMaterial));

      const endCap1 = end.clone().add(perpendicular.clone().multiplyScalar(capLength / 2));
      const endCap2 = end.clone().sub(perpendicular.clone().multiplyScalar(capLength / 2));
      lineGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([endCap1, endCap2]), lineMaterial));

      // Arrows
      const arrowLength = offset * DIMENSION_DEFAULTS.ARROW_LENGTH_MULTIPLIER;
      const arrowWidth = offset * DIMENSION_DEFAULTS.ARROW_WIDTH_MULTIPLIER;

      const arrow1 = start.clone().add(direction.clone().multiplyScalar(arrowLength));
      lineGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        start,
        arrow1.clone().add(perpendicular.clone().multiplyScalar(arrowWidth)),
        arrow1.clone().sub(perpendicular.clone().multiplyScalar(arrowWidth)),
        start,
      ]), lineMaterial));

      const arrow2 = end.clone().sub(direction.clone().multiplyScalar(arrowLength));
      lineGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        end,
        arrow2.clone().add(perpendicular.clone().multiplyScalar(arrowWidth)),
        arrow2.clone().sub(perpendicular.clone().multiplyScalar(arrowWidth)),
        end,
      ]), lineMaterial));

      return lineGroup;
    };

    // X dimension
    group.add(createDimensionLine(
      new THREE.Vector3(min.x, min.y, min.z - offset),
      new THREE.Vector3(max.x, min.y, min.z - offset),
      colors.X
    ));
    const xExtMaterial = new THREE.LineBasicMaterial({ color: colors.X, transparent: true, opacity: DIMENSION_DEFAULTS.EXTENSION_OPACITY });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x, min.y, min.z - offset * DIMENSION_DEFAULTS.EXTENSION_MULTIPLIER),
    ]), xExtMaterial));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(max.x, min.y, min.z - offset * DIMENSION_DEFAULTS.EXTENSION_MULTIPLIER),
    ]), xExtMaterial));

    // Y dimension
    group.add(createDimensionLine(
      new THREE.Vector3(min.x - offset, min.y, min.z),
      new THREE.Vector3(min.x - offset, max.y, min.z),
      colors.Y
    ));
    const yExtMaterial = new THREE.LineBasicMaterial({ color: colors.Y, transparent: true, opacity: DIMENSION_DEFAULTS.EXTENSION_OPACITY });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x - offset * DIMENSION_DEFAULTS.EXTENSION_MULTIPLIER, min.y, min.z),
    ]), yExtMaterial));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(min.x - offset * DIMENSION_DEFAULTS.EXTENSION_MULTIPLIER, max.y, min.z),
    ]), yExtMaterial));

    // Z dimension
    group.add(createDimensionLine(
      new THREE.Vector3(min.x - offset, min.y, min.z),
      new THREE.Vector3(min.x - offset, min.y, max.z),
      colors.Z
    ));
    const zExtMaterial = new THREE.LineBasicMaterial({ color: colors.Z, transparent: true, opacity: DIMENSION_DEFAULTS.EXTENSION_OPACITY });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x - offset * DIMENSION_DEFAULTS.EXTENSION_MULTIPLIER, min.y, min.z),
    ]), zExtMaterial));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(min.x, min.y, max.z),
      new THREE.Vector3(min.x - offset * DIMENSION_DEFAULTS.EXTENSION_MULTIPLIER, min.y, max.z),
    ]), zExtMaterial));

    sceneRef.current.add(group);
    dimensionLinesRef.current = group;
  }, [dimensions]);

  const handleDimensionsChange = useCallback((pressed: boolean) => {
    if (pressed) {
      createDimensionVisualization();
    } else if (dimensionLinesRef.current && sceneRef.current) {
      // Use dispose utility to properly free GPU resources (geometries/materials)
      disposeDimensionLines(dimensionLinesRef.current, sceneRef.current);
      dimensionLinesRef.current = null;
    }
    setShowDimensions(pressed);
  }, [createDimensionVisualization]);

  const hasMeshes = meshesRef.current.length > 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full w-full bg-background">
        {/* CAD Toolbar using design system Toggle components */}
        <div className="glass-card m-2 mb-0 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30">
            <div className="flex items-center gap-0.5">
              {/* View Controls */}
              <ToolbarAction
                onClick={fitCameraToMeshes}
                disabled={stepLoading || !hasMeshes}
                tooltip={t('parts.cadViewer.fitToView')}
              >
                <Focus className="h-4 w-4" />
              </ToolbarAction>

              <ToolbarAction
                onClick={() => {
                  if (controlsRef.current) {
                    controlsRef.current.reset();
                  }
                }}
                disabled={stepLoading || !hasMeshes}
                tooltip={t('parts.cadViewer.resetView', 'Reset View')}
              >
                <RotateCcw className="h-4 w-4" />
              </ToolbarAction>

              <div className="w-px h-5 bg-border mx-1" />

              {/* Display Toggles */}
              <ToolbarToggle
                pressed={gridVisible}
                onPressedChange={handleGridChange}
                disabled={stepLoading}
                tooltip={t('parts.cadViewer.toggleGrid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </ToolbarToggle>

              <ToolbarToggle
                pressed={wireframeMode}
                onPressedChange={handleWireframeChange}
                disabled={stepLoading || !hasMeshes}
                tooltip={t('parts.cadViewer.wireframeMode')}
              >
                <Box className="h-4 w-4" />
              </ToolbarToggle>

              <ToolbarToggle
                pressed={edgesVisible}
                onPressedChange={handleEdgesChange}
                disabled={stepLoading || !hasMeshes}
                tooltip={t('parts.cadViewer.showEdges')}
              >
                <Hexagon className="h-4 w-4" />
              </ToolbarToggle>

              <div className="w-px h-5 bg-border mx-1" />

              {/* Assembly & Measurement */}
              <ToolbarToggle
                pressed={explodedView}
                onPressedChange={handleExplodedViewChange}
                disabled={stepLoading || !hasMeshes || !assemblyInfo?.isAssembly}
                tooltip={
                  assemblyInfo?.isAssembly
                    ? t('parts.cadViewer.explodedView')
                    : t('parts.cadViewer.explodedViewSinglePart', 'Explode (requires assembly)')
                }
              >
                <Boxes className="h-4 w-4" />
              </ToolbarToggle>

              {explodedView && assemblyInfo?.isAssembly && (
                <div className="flex items-center gap-1.5 ml-1">
                  <Slider
                    value={[explosionFactor]}
                    onValueChange={handleExplosionFactorChange}
                    min={EXPLOSION_DEFAULTS.MIN_FACTOR}
                    max={EXPLOSION_DEFAULTS.MAX_FACTOR}
                    step={EXPLOSION_DEFAULTS.STEP}
                    className="w-20"
                  />
                  <span className="text-[10px] text-muted-foreground tabular-nums w-6">
                    {explosionFactor.toFixed(1)}
                  </span>
                </div>
              )}

              {/* Assembly Tree Toggle - only show for assemblies */}
              {assemblyInfo?.isAssembly && (
                <ToolbarToggle
                  pressed={showAssemblyTree}
                  onPressedChange={setShowAssemblyTree}
                  disabled={stepLoading || !hasMeshes}
                  tooltip={t('parts.cadViewer.assemblyTree', 'Assembly Tree')}
                >
                  <ListTree className="h-4 w-4" />
                </ToolbarToggle>
              )}

              <div className="w-px h-5 bg-border mx-1" />

              <ToolbarToggle
                pressed={showDimensions}
                onPressedChange={handleDimensionsChange}
                disabled={stepLoading || !hasMeshes || !dimensions}
                tooltip={showDimensions ? t('parts.cadViewer.hideDimensions') : t('parts.cadViewer.showDimensions')}
              >
                <Ruler className="h-4 w-4" />
              </ToolbarToggle>
            </div>
          </div>
        </div>

        {/* 3D Viewer Container */}
        <div className="flex-1 relative bg-surface">
          <div ref={containerRef} className="absolute inset-0" />

          {/* Assembly Tree Overlay Panel */}
          {showAssemblyTree && assemblyInfo && assemblyInfo.isAssembly && (
            <div className="absolute top-3 left-3 z-10">
              <div className="glass-card p-3 min-w-[200px] max-w-[280px] max-h-[300px] overflow-auto">
                <div className="flex items-center gap-2 mb-2.5">
                  <ListTree className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {t('parts.cadViewer.assemblyTree', 'Assembly')}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {assemblyInfo.partCount} {t('parts.cadViewer.parts', 'parts')}
                  </span>
                </div>
                <div className="space-y-1">
                  {assemblyInfo.parts.map((part) => (
                    <div
                      key={part.index}
                      className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/50 cursor-pointer group"
                      onClick={() => handlePartVisibilityToggle(part.index)}
                    >
                      <button
                        className="flex-shrink-0 p-0.5 rounded hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePartVisibilityToggle(part.index);
                        }}
                      >
                        {part.visible ? (
                          <Eye className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-muted-foreground/50" />
                        )}
                      </button>
                      <span
                        className={cn(
                          "text-[11px] truncate flex-1",
                          part.visible ? "text-foreground" : "text-muted-foreground/50"
                        )}
                        title={part.name}
                      >
                        {part.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                  <div className="flex items-center justify-between gap-3">
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
                  <div className="flex items-center justify-between gap-3">
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
                  <div className="flex items-center justify-between gap-3">
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
                <div className="text-destructive text-3xl mb-2 opacity-50">&#9888;</div>
                <p className="text-xs text-muted-foreground mb-3">{loadingError}</p>
                <Toggle
                  size="sm"
                  pressed={false}
                  onPressedChange={() => {
                    setLoadingError(null);
                    setLibrariesLoaded(false);
                    setTimeout(() => setLibrariesLoaded(true), 100);
                  }}
                  className="text-xs"
                >
                  {t('parts.cadViewer.retry')}
                </Toggle>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
