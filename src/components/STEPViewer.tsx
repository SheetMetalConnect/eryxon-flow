import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Maximize2,
  Grid3x3,
  Boxes,
  Loader2,
  Box,
  Hexagon
} from 'lucide-react';

// Extend Window interface for occt-import-js
declare global {
  interface Window {
    occtimportjs?: () => Promise<any>;
  }
}

interface STEPViewerProps {
  url: string;
  title?: string;
}

export function STEPViewer({ url, title }: STEPViewerProps) {
  // State
  const [stepLoading, setStepLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [explodedView, setExplodedView] = useState(false);
  const [explosionFactor, setExplosionFactor] = useState(1);
  const [gridVisible, setGridVisible] = useState(true);
  const [edgesVisible, setEdgesVisible] = useState(true);

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

  // Load and parse STEP file
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

        // Convert to Three.js meshes
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

          // Material - Using MeshStandardMaterial for better PBR rendering
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

          // Create and add mesh
          const mesh = new THREE.Mesh(geometry, material);
          meshesRef.current.push(mesh);
          originalPositionsRef.current.push(mesh.position.clone());
          sceneRef.current.add(mesh);

          // Add edges for better contour visibility (threshold angle: 30 degrees)
          const edgesGeometry = new THREE.EdgesGeometry(geometry, 30);
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
        }

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
  }, [url, librariesLoaded, edgesVisible, gridVisible]);

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

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-card border-b border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={fitCameraToMeshes}
          disabled={stepLoading || meshesRef.current.length === 0}
          className="bg-card text-foreground hover:bg-accent"
        >
          <Maximize2 className="h-4 w-4 mr-1" />
          Fit View
        </Button>

        <Button
          variant={gridVisible ? 'default' : 'outline'}
          size="sm"
          onClick={toggleGrid}
          disabled={stepLoading}
          className={gridVisible ? "" : "bg-card text-foreground hover:bg-accent"}
        >
          <Grid3x3 className="h-4 w-4 mr-1" />
          Grid
        </Button>

        <Button
          variant={wireframeMode ? 'default' : 'outline'}
          size="sm"
          onClick={toggleWireframe}
          disabled={stepLoading || meshesRef.current.length === 0}
          className={wireframeMode ? "" : "bg-card text-foreground hover:bg-accent"}
        >
          <Box className="h-4 w-4 mr-1" />
          Wireframe
        </Button>

        <Button
          variant={edgesVisible ? 'default' : 'outline'}
          size="sm"
          onClick={toggleEdges}
          disabled={stepLoading || meshesRef.current.length === 0}
          title="Toggle edge/contour visibility"
          className={edgesVisible ? "" : "bg-card text-foreground hover:bg-accent"}
        >
          <Hexagon className="h-4 w-4 mr-1" />
          Edges
        </Button>

        <Button
          variant={explodedView ? 'default' : 'outline'}
          size="sm"
          onClick={toggleExplodedView}
          disabled={stepLoading || meshesRef.current.length === 0}
          className={explodedView ? "" : "bg-card text-foreground hover:bg-accent"}
        >
          <Boxes className="h-4 w-4 mr-1" />
          Explode
        </Button>

        {explodedView && (
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-muted-foreground">Explosion:</span>
            <Slider
              value={[explosionFactor]}
              onValueChange={handleExplosionFactorChange}
              min={0}
              max={2}
              step={0.1}
              className="w-32"
            />
          </div>
        )}

        {title && (
          <div className="ml-auto text-sm font-medium text-muted-foreground">
            {title}
          </div>
        )}
      </div>

      {/* 3D Viewer Container */}
      <div className="flex-1 relative bg-accent/5">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Loading Overlay */}
        {stepLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading 3D model...</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {loadingError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="text-center p-6 max-w-md">
              <div className="text-destructive text-5xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Failed to Load 3D Model
              </h3>
              <p className="text-sm text-muted-foreground">{loadingError}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
