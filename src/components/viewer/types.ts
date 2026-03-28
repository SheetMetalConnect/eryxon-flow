import type * as THREE from 'three';
import type { PMIData, GeometryData } from '@/hooks/useCADProcessing';

// ── Model Dimensions ──────────────────────────────────────────────
export interface ModelDimensions {
  x: number;
  y: number;
  z: number;
  center: THREE.Vector3;
}

// ── Component Props ───────────────────────────────────────────────
export interface STEPViewerProps {
  url: string;
  title?: string;
  compact?: boolean;
  pmiData?: PMIData | null;
  /** Server-processed geometry data (if available) */
  serverGeometry?: GeometryData | null;
  /** Skip browser-based processing if server geometry is provided */
  preferServerGeometry?: boolean;
}

// ── Explosion State ───────────────────────────────────────────────
export interface ExplosionData {
  separationVectors: THREE.Vector3[];
  baseDistances: number[];
  initialized: boolean;
}

// ── PMI Filter ────────────────────────────────────────────────────
export type PMIFilter =
  | 'all'
  | 'dimensions'
  | 'tolerances'
  | 'datums'
  | 'surface'
  | 'welds'
  | 'notes'
  | 'graphical';
