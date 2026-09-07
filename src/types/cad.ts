export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
}

export interface MeshData {
  vertices_base64: string;
  normals_base64: string;
  indices_base64: string;
  vertex_count: number;
  face_count: number;
  color: [number, number, number];
}

export interface GeometryData {
  meshes: MeshData[];
  bounding_box: BoundingBox;
  total_vertices: number;
  total_faces: number;
}

export interface Tolerance {
  upper: number;
  lower: number;
  type: string;
}

export interface AssociatedGeometry {
  face_ids: string[];
  edge_ids: string[];
}

export interface LeaderLine {
  type: 'line' | 'polyline';
  points: Vector3[];
  start: Vector3;
  end: Vector3;
  has_arrowhead: boolean;
}

export interface TargetGeometry {
  shape_aspect_refs: string[];
  feature_type: string;
  attachment_points: Vector3[];
}

export interface PMIDimension {
  id: string;
  type: 'linear' | 'angular' | 'radius' | 'diameter' | 'ordinate';
  value: number;
  unit: string;
  tolerance?: Tolerance;
  text: string;
  position: Vector3;
  leader_points: Vector3[]; // Legacy field - kept for compatibility
  leader_lines?: LeaderLine[]; // NEW - explicit leader line geometry
  target_geometry?: TargetGeometry; // NEW - target geometry with attachment points
  associated_geometry?: AssociatedGeometry;
}

export interface PMIGeometricTolerance {
  id: string;
  type: string;
  value: number;
  unit: string;
  symbol: string;
  datum_refs: string[];
  modifiers: string[];
  text: string;
  position: Vector3;
  leader_points: Vector3[];
  associated_geometry?: AssociatedGeometry;
}

export interface PMIDatum {
  id: string;
  label: string;
  position: Vector3;
  associated_geometry?: AssociatedGeometry;
}

export interface PMISurfaceFinish {
  id: string;
  type: 'roughness' | 'waviness' | 'lay' | 'composite';
  parameter: string;  // Ra, Rz, Rq, etc.
  value: number;
  unit: string;
  upper_limit?: number;
  lower_limit?: number;
  sampling_length?: number;
  method?: string;
  text: string;
  position: Vector3;
  associated_geometry?: AssociatedGeometry;
}

export interface PMIWeldSymbol {
  id: string;
  weld_type: string;  // fillet, groove, spot, seam, etc.
  arrow_side?: {
    weld_symbol?: string;
    size?: number;
    length?: number;
    pitch?: number;
    contour?: string;
  };
  other_side?: {
    weld_symbol?: string;
    size?: number;
    length?: number;
    pitch?: number;
    contour?: string;
  };
  process?: string;
  field_weld: boolean;
  all_around: boolean;
  tail_note?: string;
  text: string;
  position: Vector3;
  associated_geometry?: AssociatedGeometry;
}

export interface PMINote {
  id: string;
  text: string;
  position: Vector3;
  leader_points?: Vector3[];
  associated_geometry?: AssociatedGeometry;
}

export interface PMIGraphical {
  id: string;
  type: string;
  text: string;
  position: Vector3;
  font_size?: number;
  color?: string;
  associated_geometry?: AssociatedGeometry;
}

export interface PMIStatistics {
  dimension_count: number;
  tolerance_count: number;
  datum_count: number;
  surface_finish_count: number;
  weld_count: number;
}

export interface PMIData {
  version: string;
  source?: string;  // 'text_parser' | 'xcaf' | etc.
  schema?: string;  // 'AP242' | 'AP203/AP214'
  dimensions: PMIDimension[];
  geometric_tolerances: PMIGeometricTolerance[];
  datums: PMIDatum[];
  surface_finishes?: PMISurfaceFinish[];
  weld_symbols?: PMIWeldSymbol[];
  notes?: PMINote[];
  graphical_pmi?: PMIGraphical[];
  statistics?: PMIStatistics;
}

export interface CADProcessingResult {
  success: boolean;
  geometry: GeometryData | null;
  pmi: PMIData | null;
  thumbnail_base64: string | null;
  file_hash: string | null;
  processing_time_ms: number;
  error?: string;
}
