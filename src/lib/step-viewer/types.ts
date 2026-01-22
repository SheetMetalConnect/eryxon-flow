/**
 * STEPViewer Type Definitions
 */

import * as THREE from 'three';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface STEPViewerProps {
  /** URL to the STEP file */
  url: string;
  /** Optional title for the viewer */
  title?: string;
  /** Compact mode for smaller containers */
  compact?: boolean;
}

// =============================================================================
// DIMENSIONS
// =============================================================================

export interface ModelDimensions {
  /** X dimension (length) in model units */
  x: number;
  /** Y dimension (height) in model units */
  y: number;
  /** Z dimension (width) in model units */
  z: number;
  /** Center point of bounding box */
  center: THREE.Vector3;
}

// =============================================================================
// OCCT IMPORT TYPES
// =============================================================================

/** Mesh data from occt-import-js */
export interface OcctMeshData {
  name?: string;
  color?: [number, number, number];
  brep_faces?: OcctBrepFace[];
  attributes?: {
    position?: { array: Float32Array | number[] };
    normal?: { array: Float32Array | number[] };
  };
  index?: {
    array: Uint16Array | Uint32Array | number[];
  };
}

/** B-Rep face from OCCT with edge information */
export interface OcctBrepFace {
  first?: number;
  last?: number;
  edge_loops?: OcctEdgeLoop[];
}

/** Edge loop containing edges */
export interface OcctEdgeLoop {
  edges?: OcctEdge[];
}

/** Individual edge from OCCT kernel */
export interface OcctEdge {
  vertex_coord?: number[][];
}

/** Result from occt-import-js ReadStepFile */
export interface OcctImportResult {
  success: boolean;
  meshes: OcctMeshData[];
  edges?: OcctEdge[];
}

// =============================================================================
// INTERNAL STATE
// =============================================================================

export interface ExplosionData {
  separationVectors: THREE.Vector3[];
  baseDistances: number[];
  initialized: boolean;
}

// =============================================================================
// DISPOSAL
// =============================================================================

export type DisposableObject = THREE.Mesh | THREE.LineSegments | THREE.Line | THREE.Group;

export interface DisposalResult {
  disposed: number;
  errors: string[];
}
