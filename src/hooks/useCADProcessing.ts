/**
 * CAD Processing Hook
 *
 * This hook provides server-side CAD file processing:
 * 1. Geometry extraction (tessellated meshes as base64)
 * 2. PMI/MBD extraction (dimensions, tolerances, datums)
 * 3. Thumbnail generation (optional)
 *
 * Falls back to browser-based processing if server is unavailable.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

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

export interface PMIDimension {
  id: string;
  type: 'linear' | 'angular' | 'radius' | 'diameter' | 'ordinate';
  value: number;
  unit: string;
  tolerance?: Tolerance;
  text: string;
  position: Vector3;
  leader_points: Vector3[];
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

export interface PMIData {
  version: string;
  dimensions: PMIDimension[];
  geometric_tolerances: PMIGeometricTolerance[];
  datums: PMIDatum[];
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

// ============================================================================
// Configuration
// ============================================================================

const CAD_SERVICE_URL = import.meta.env.VITE_CAD_SERVICE_URL || import.meta.env.VITE_PMI_SERVICE_URL;
const CAD_SERVICE_API_KEY = import.meta.env.VITE_CAD_SERVICE_API_KEY;

/**
 * Check if CAD processing service is configured
 */
export function isCADServiceEnabled(): boolean {
  return Boolean(CAD_SERVICE_URL);
}

/**
 * Decode base64 to Float32Array
 */
export function decodeFloat32Array(base64: string): Float32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Float32Array(bytes.buffer);
}

/**
 * Decode base64 to Uint32Array
 */
export function decodeUint32Array(base64: string): Uint32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Uint32Array(bytes.buffer);
}

// ============================================================================
// Hook
// ============================================================================

interface UseCADProcessingOptions {
  /** Include geometry extraction */
  includeGeometry?: boolean;
  /** Include PMI extraction */
  includePMI?: boolean;
  /** Generate thumbnail */
  generateThumbnail?: boolean;
  /** Thumbnail size in pixels */
  thumbnailSize?: number;
}

export function useCADProcessing() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  /**
   * Process a CAD file through the server
   */
  const processCAD = useCallback(async (
    fileUrl: string,
    fileName: string,
    options: UseCADProcessingOptions = {}
  ): Promise<CADProcessingResult> => {
    const {
      includeGeometry = true,
      includePMI = true,
      generateThumbnail = false,
      thumbnailSize = 256,
    } = options;

    // Check if service is configured
    if (!CAD_SERVICE_URL) {
      return {
        success: false,
        geometry: null,
        pmi: null,
        thumbnail_base64: null,
        file_hash: null,
        processing_time_ms: 0,
        error: 'CAD processing service not configured',
      };
    }

    // Check file extension
    const ext = fileName.toLowerCase().split('.').pop();
    const supportedFormats = ['step', 'stp', 'iges', 'igs', 'brep'];
    if (!ext || !supportedFormats.includes(ext)) {
      return {
        success: false,
        geometry: null,
        pmi: null,
        thumbnail_base64: null,
        file_hash: null,
        processing_time_ms: 0,
        error: `Unsupported file format: ${ext}`,
      };
    }

    setIsProcessing(true);
    setProcessingError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if configured
      if (CAD_SERVICE_API_KEY) {
        headers['X-API-Key'] = CAD_SERVICE_API_KEY;
      }

      const response = await fetch(`${CAD_SERVICE_URL}/process`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          file_url: fileUrl,
          file_name: fileName,
          include_geometry: includeGeometry,
          include_pmi: includePMI,
          generate_thumbnail: generateThumbnail,
          thumbnail_size: thumbnailSize,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('CAD service authentication failed');
        }
        throw new Error(`CAD processing failed: HTTP ${response.status}`);
      }

      const result: CADProcessingResult = await response.json();

      if (!result.success) {
        setProcessingError(result.error || 'Processing failed');
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'CAD processing failed';
      setProcessingError(errorMessage);
      return {
        success: false,
        geometry: null,
        pmi: null,
        thumbnail_base64: null,
        file_hash: null,
        processing_time_ms: 0,
        error: errorMessage,
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Store processed data in parts.metadata
   */
  const storeProcessedData = useCallback(async (
    partId: string,
    geometry: GeometryData | null,
    pmi: PMIData | null
  ): Promise<void> => {
    // Get current metadata
    const { data: part, error: fetchError } = await supabase
      .from('parts')
      .select('metadata')
      .eq('id', partId)
      .single();

    if (fetchError) throw fetchError;

    // Merge into existing metadata
    const currentMetadata = (part?.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...(geometry && {
        geometry_processed: true,
        geometry_vertices: geometry.total_vertices,
        geometry_faces: geometry.total_faces,
        bounding_box: geometry.bounding_box,
      }),
      ...(pmi && {
        pmi,
        pmi_extracted_at: new Date().toISOString(),
      }),
      processed_at: new Date().toISOString(),
    };

    // Note: We don't store the full geometry meshes in metadata
    // as they can be large. Instead, we could store in a separate
    // storage bucket or cache if needed.

    const { error: updateError } = await supabase
      .from('parts')
      .update({ metadata: updatedMetadata })
      .eq('id', partId);

    if (updateError) throw updateError;
  }, []);

  /**
   * Process and store CAD data for a part
   */
  const processAndStore = useCallback(async (
    partId: string,
    fileUrl: string,
    fileName: string,
    options?: UseCADProcessingOptions
  ): Promise<CADProcessingResult> => {
    const result = await processCAD(fileUrl, fileName, options);

    if (result.success) {
      try {
        await storeProcessedData(partId, result.geometry, result.pmi);
        queryClient.invalidateQueries({ queryKey: ['pmi', partId] });
        queryClient.invalidateQueries({ queryKey: ['part', partId] });
      } catch (error) {
        console.error('Failed to store processed data:', error);
        // Don't fail the whole operation if storage fails
      }
    }

    return result;
  }, [processCAD, storeProcessedData, queryClient]);

  return {
    // State
    isProcessing,
    processingError,

    // Actions
    processCAD,
    processAndStore,
    storeProcessedData,

    // Utilities
    decodeFloat32Array,
    decodeUint32Array,

    // Service status
    isCADServiceEnabled: isCADServiceEnabled(),
  };
}

/**
 * Hook to get cached/stored geometry for a part
 * Returns geometry data if it was previously processed and cached
 */
export function useCachedGeometry(partId: string | undefined) {
  return useQuery({
    queryKey: ['geometry', partId],
    queryFn: async () => {
      if (!partId) return null;

      const { data: part, error } = await supabase
        .from('parts')
        .select('metadata')
        .eq('id', partId)
        .single();

      if (error) throw error;

      const metadata = part?.metadata as Record<string, unknown> | null;

      // Check if geometry was processed
      if (!metadata?.geometry_processed) {
        return null;
      }

      // Return bounding box and stats (full geometry not stored in DB)
      return {
        bounding_box: metadata.bounding_box as BoundingBox | undefined,
        total_vertices: metadata.geometry_vertices as number | undefined,
        total_faces: metadata.geometry_faces as number | undefined,
        processed_at: metadata.processed_at as string | undefined,
      };
    },
    enabled: !!partId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
