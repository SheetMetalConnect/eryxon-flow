import type { CADBackendMode } from "@/config/cadBackend";
import type { BoundingBox, GeometryData, PMIData } from "@/hooks/useCADProcessing";

type MetadataRecord = Record<string, unknown>;

export interface CADProcessingSnapshot {
  backend_mode: CADBackendMode;
  file_hash: string | null;
  file_name: string;
  geometry_available: boolean;
  pmi_available: boolean;
  processed_at: string;
  processing_time_ms: number | null;
  source_path: string | null;
}

export interface CADMetadataContext {
  backendMode: CADBackendMode;
  fileHash?: string | null;
  fileName: string;
  processedAt: string;
  processingTimeMs?: number | null;
  sourcePath?: string | null;
}

export interface CADCompatibleMetadata extends MetadataRecord {
  bounding_box?: BoundingBox | null;
  cad_processing?: CADProcessingSnapshot;
  geometry_faces?: number | null;
  geometry_processed?: boolean;
  geometry_vertices?: number | null;
  pmi?: PMIData | null;
  pmi_extracted_at?: string | null;
  processed_at?: string;
}

export function buildProcessedMetadata(
  currentMetadata: MetadataRecord,
  geometry: GeometryData | null,
  pmi: PMIData | null,
  context: CADMetadataContext,
): CADCompatibleMetadata {
  return {
    ...currentMetadata,
    geometry_processed: Boolean(geometry),
    geometry_vertices: geometry?.total_vertices ?? null,
    geometry_faces: geometry?.total_faces ?? null,
    bounding_box: geometry?.bounding_box ?? null,
    pmi,
    pmi_extracted_at: pmi ? context.processedAt : null,
    processed_at: context.processedAt,
    cad_processing: {
      backend_mode: context.backendMode,
      file_hash: context.fileHash ?? null,
      file_name: context.fileName,
      geometry_available: Boolean(geometry),
      pmi_available: Boolean(pmi),
      processed_at: context.processedAt,
      processing_time_ms: context.processingTimeMs ?? null,
      source_path: context.sourcePath ?? null,
    },
  };
}

export function getStoredPMIForPath(
  metadata: MetadataRecord | null | undefined,
  sourcePath?: string | null,
): PMIData | null {
  if (!metadata || typeof metadata !== "object") return null;

  const record = metadata as CADCompatibleMetadata;
  if (!record.pmi) return null;

  const storedPath = record.cad_processing?.source_path ?? null;

  if (sourcePath && storedPath && storedPath !== sourcePath) {
    return null;
  }

  if (sourcePath && !storedPath) {
    return null;
  }

  return record.pmi;
}
