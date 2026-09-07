/**
 * CAD Processing Hook
 *
 * This hook provides CAD file processing with configurable backends:
 * 1. Geometry extraction (tessellated meshes as base64)
 * 2. PMI/MBD extraction (dimensions, tolerances, datums, surface finishes, weld symbols)
 * 3. Thumbnail generation (optional)
 *
 * Backend modes (configurable via cadBackend.ts):
 * - 'custom': Eryxon3D Docker-based backend (recommended)
 * - 'byob': Bring Your Own Backend (CAD Exchanger SDK, etc.)
 * - 'frontend': Browser-only processing via occt-import-js (fallback)
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { QueryKeys } from '@/lib/queryClient';
import { logger } from '@/lib/logger';
import { invokeCadProxy, type CADSourceRef } from '@/lib/cadProxy';
import {
  buildProcessedMetadata,
  type CADMetadataContext,
} from '@/lib/cadProcessingMetadata';
import {
  getCADConfig,
  getActiveTimeout,
  isBackendAvailable,
  determineBestBackend,
  setCADBackendMode,
  type CADBackendMode,
} from '@/config/cadBackend';

import type { Vector3, BoundingBox, MeshData, GeometryData, Tolerance, AssociatedGeometry, LeaderLine, TargetGeometry, PMIDimension, PMIGeometricTolerance, PMIDatum, PMISurfaceFinish, PMIWeldSymbol, PMINote, PMIGraphical, PMIStatistics, PMIData, CADProcessingResult } from '@/types/cad';
export type { Vector3, BoundingBox, MeshData, GeometryData, Tolerance, AssociatedGeometry, LeaderLine, TargetGeometry, PMIDimension, PMIGeometricTolerance, PMIDatum, PMISurfaceFinish, PMIWeldSymbol, PMINote, PMIGraphical, PMIStatistics, PMIData, CADProcessingResult } from '@/types/cad';

/**
 * Check if CAD processing service is configured (custom or byob backend)
 */
export function isCADServiceEnabled(): boolean {
  return isBackendAvailable('custom') || isBackendAvailable('byob');
}

/**
 * Get the current backend mode
 */
export function getBackendMode(): CADBackendMode {
  return getCADConfig().mode;
}

/**
 * Switch to a different backend mode
 */
export function switchBackendMode(mode: CADBackendMode): void {
  setCADBackendMode(mode);
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: 'pmiExtraction' | 'thumbnails' | 'geometry'): boolean {
  return getCADConfig().features[feature];
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
  const profile = useProfile();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  /**
   * Process a CAD file through the configured backend
   */
  const processCAD = useCallback(async (
    source: CADSourceRef,
    fileName: string,
    options: UseCADProcessingOptions = {}
  ): Promise<CADProcessingResult> => {
    const config = getCADConfig();
    const {
      includeGeometry = config.features.geometry,
      includePMI = config.features.pmiExtraction,
      generateThumbnail = config.features.thumbnails,
      thumbnailSize = 256,
    } = options;

    const currentMode = config.mode;

    if (currentMode === 'frontend') {
      return {
        success: false,
        geometry: null,
        pmi: null,
        thumbnail_base64: null,
        file_hash: null,
        processing_time_ms: 0,
        error: 'No server backend configured - use browser processing',
      };
    }

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
      const timeout = getActiveTimeout();
      const result = await Promise.race<CADProcessingResult>([
        invokeCadProxy<CADProcessingResult>({
          action: 'process',
          source,
          file_name: fileName,
          include_geometry: includeGeometry,
          include_pmi: includePMI,
          generate_thumbnail: generateThumbnail,
          thumbnail_size: thumbnailSize,
        }),
        new Promise<CADProcessingResult>((_, reject) => {
          setTimeout(() => reject(new Error('CAD processing timed out')), timeout);
        }),
      ]);

      if (!result.success) {
        setProcessingError(result.error || 'Processing failed');
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.name === 'AbortError'
          ? 'CAD processing timed out'
          : error.message
        : 'CAD processing failed';
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
    pmi: PMIData | null,
    context: CADMetadataContext,
  ): Promise<void> => {
    // Scope metadata reads to the active tenant when available.
    let partQuery = supabase
      .from('parts')
      .select('metadata')
      .eq('id', partId);
    if (profile?.tenant_id) partQuery = partQuery.eq('tenant_id', profile.tenant_id);
    const { data: part, error: fetchError } = await partQuery.single();

    if (fetchError) throw fetchError;

    const currentMetadata = (part?.metadata as Record<string, unknown>) || {};
    const updatedMetadata = buildProcessedMetadata(
      currentMetadata,
      geometry,
      pmi,
      context,
    );

    // Note: We don't store the full geometry meshes in metadata
    // as they can be large. Instead, we could store in a separate
    // storage bucket or cache if needed.

    let updateQuery = supabase
      .from('parts')
      .update({ metadata: JSON.parse(JSON.stringify(updatedMetadata)) })
      .eq('id', partId);
    if (profile?.tenant_id) updateQuery = updateQuery.eq('tenant_id', profile.tenant_id);
    const { error: updateError } = await updateQuery;

    if (updateError) throw updateError;
  }, [profile?.tenant_id]);

  /**
   * Process and store CAD data for a part
   */
  const processAndStore = useCallback(async (
    partId: string,
    source: CADSourceRef,
    fileName: string,
    options?: UseCADProcessingOptions,
    context?: { sourcePath?: string | null },
  ): Promise<CADProcessingResult> => {
    const result = await processCAD(source, fileName, options);

    if (result.success) {
      try {
        await storeProcessedData(partId, result.geometry, result.pmi, {
          backendMode: getCADConfig().mode,
          fileHash: result.file_hash,
          fileName,
          processedAt: new Date().toISOString(),
          processingTimeMs: result.processing_time_ms,
          sourcePath: context?.sourcePath ?? null,
        });
        queryClient.invalidateQueries({ queryKey: QueryKeys.pmi.byPart(partId) });
        queryClient.invalidateQueries({ queryKey: QueryKeys.parts.detail(partId) });
      } catch (error) {
        logger.error('useCADProcessing', 'Failed to store processed data', error);
        // Don't fail the whole operation if storage fails
      }
    }

    return result;
  }, [processCAD, storeProcessedData, queryClient]);

  return {
    isProcessing,
    processingError,
    processCAD,
    processAndStore,
    storeProcessedData,
    decodeFloat32Array,
    decodeUint32Array,
    backendMode: getCADConfig().mode,
    isCADServiceEnabled: isCADServiceEnabled(),
    isServerBackendActive: getCADConfig().mode !== 'frontend' && isCADServiceEnabled(),
    isFrontendFallback: getCADConfig().mode === 'frontend',
    config: getCADConfig(),
    switchBackendMode,
    determineBestBackend,
  };
}

/**
 * Hook to get cached/stored geometry for a part
 * Returns geometry data if it was previously processed and cached
 */
export function useCachedGeometry(partId: string | undefined) {
  return useQuery({
    queryKey: QueryKeys.pmi.geometry(partId ?? ''),
    queryFn: async () => {
      if (!partId) return null;

      const { data: part, error } = await supabase
        .from('parts')
        .select('metadata')
        .eq('id', partId)
        .single();

      if (error) throw error;

      const metadata = part?.metadata as Record<string, unknown> | null;

      if (!metadata?.geometry_processed) {
        return null;
      }

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
