import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ── Measurement Modes ──────────────────────────────────────────────

export type MeasurementMode =
  | 'none'
  | 'point-to-point'
  | 'face-distance'
  | 'face-angle'
  | 'radius';

export type MeasurementPhase =
  | 'idle'
  | 'picking_first'
  | 'picking_second';

// ── Snap System ────────────────────────────────────────────────────

export type SnapType = 'vertex' | 'edge' | 'face';

export interface SnapTarget {
  point: THREE.Vector3;
  type: SnapType;
  mesh: THREE.Mesh;
  faceIndex: number;
  normal: THREE.Vector3;
}

// ── Measurement Results ────────────────────────────────────────────

export interface PointToPointResult {
  id: string;
  type: 'point-to-point';
  pointA: THREE.Vector3;
  pointB: THREE.Vector3;
  distance: number;
}

export interface FaceDistanceResult {
  id: string;
  type: 'face-distance';
  faceA: { centroid: THREE.Vector3; normal: THREE.Vector3 };
  faceB: { centroid: THREE.Vector3; normal: THREE.Vector3 };
  distance: number;
  isParallel: boolean;
}

export interface FaceAngleResult {
  id: string;
  type: 'face-angle';
  faceA: { centroid: THREE.Vector3; normal: THREE.Vector3 };
  faceB: { centroid: THREE.Vector3; normal: THREE.Vector3 };
  includedAngleDeg: number;
  bendAngleDeg: number;
}

export interface RadiusResult {
  id: string;
  type: 'radius';
  center: THREE.Vector3;
  axis: THREE.Vector3;
  radius: number;
  diameter: number;
  confidence: number;
}

export type MeasurementResult =
  | PointToPointResult
  | FaceDistanceResult
  | FaceAngleResult
  | RadiusResult;

// ── Scene Object Refs ──────────────────────────────────────────────

export interface ViewerRefs {
  container: HTMLDivElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  meshes: THREE.Mesh[];
  controls: OrbitControls;
}
