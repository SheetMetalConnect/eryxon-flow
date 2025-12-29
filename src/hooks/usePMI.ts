/**
 * PMI (Product Manufacturing Information) Hook
 *
 * This hook provides:
 * 1. Async PMI extraction with Supabase realtime updates
 * 2. PMI data fetching from parts.metadata
 * 3. Realtime subscription for processing status
 * 4. Caching and loading states
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

/**
 * PMI processing status for async extraction
 */
export type PMIStatus = 'pending' | 'processing' | 'complete' | 'error';

export interface PMIMetadata {
  pmi?: PMIData;
  pmi_status?: PMIStatus;
  pmi_error?: string;
  pmi_extracted_at?: string;
  pmi_processing_time_ms?: number;
  pmi_progress?: number;  // 0-100
  pmi_stage?: string;     // Current processing stage
  pmi_summary?: {
    dimensions: number;
    geometric_tolerances: number;
    datums: number;
    surface_finishes: number;
    notes: number;
    graphical_pmi: number;
    total: number;
  };
}

// Debug logging - only in development
const DEBUG = import.meta.env.DEV;
const log = {
  debug: (msg: string, data?: unknown) => DEBUG && console.debug(`[PMI] ${msg}`, data ?? ''),
  info: (msg: string, data?: unknown) => DEBUG && console.info(`[PMI] ${msg}`, data ?? ''),
  warn: (msg: string, data?: unknown) => console.warn(`[PMI] ${msg}`, data ?? ''),
  error: (msg: string, data?: unknown) => console.error(`[PMI] ${msg}`, data ?? ''),
};

export interface Vector3 {
  x: number;
  y: number;
  z: number;
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
  modifier: string;  // Material modifier: Ⓜ (MMC), Ⓛ (LMC), etc.
  zone_modifier: string;  // Zone shape: ⌀ for cylindrical
  datum_refs: string[];
  text: string;
  position: Vector3;
  leader_points?: Vector3[];
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
  type: string;
  roughness_type?: string;  // Ra, Rz, Rmax, etc.
  roughness_value?: number;
  roughness_unit: string;
  machining_allowance?: number;
  lay_symbol?: string;  // =, ⊥, X, M, C, R, P
  text: string;
  position: Vector3;
}

export interface PMINote {
  id: string;
  type: string;  // note, callout, flag
  text: string;
  position: Vector3;
}

export interface PMIGraphical {
  id: string;
  type: string;  // line, arc, spline
  points: Vector3[];
}

export interface PMIData {
  version: string;
  dimensions: PMIDimension[];
  geometric_tolerances: PMIGeometricTolerance[];
  datums: PMIDatum[];
  surface_finishes: PMISurfaceFinish[];
  notes: PMINote[];
  graphical_pmi: PMIGraphical[];
}

export interface PMIExtractionResult {
  success: boolean;
  pmi: PMIData | null;
  error?: string;
  processing_time_ms: number;
  file_hash?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const PMI_SERVICE_URL = import.meta.env.VITE_PMI_SERVICE_URL || import.meta.env.VITE_CAD_SERVICE_URL;
const PMI_SERVICE_API_KEY = import.meta.env.VITE_CAD_SERVICE_API_KEY;

/**
 * Check if PMI service is configured
 */
export function isPMIServiceEnabled(): boolean {
  return Boolean(PMI_SERVICE_URL);
}

// ============================================================================
// Hook
// ============================================================================

export function usePMI(partId: string | undefined) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [pmiStatus, setPmiStatus] = useState<PMIStatus | null>(null);

  /**
   * Fetch PMI data from parts.metadata
   */
  const {
    data: pmiMetadata,
    isLoading: isLoadingPMI,
    error: fetchError,
    refetch: refetchPMI,
  } = useQuery({
    queryKey: ['pmi', partId],
    queryFn: async (): Promise<PMIMetadata | null> => {
      if (!partId) return null;

      const { data: part, error } = await supabase
        .from('parts')
        .select('metadata')
        .eq('id', partId)
        .single();

      if (error) throw error;

      // Extract PMI metadata
      const metadata = part?.metadata as PMIMetadata | null;
      return metadata || null;
    },
    enabled: !!partId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract PMI data and status from metadata
  const pmiData = pmiMetadata?.pmi || null;

  /**
   * Subscribe to realtime updates for PMI status
   */
  useEffect(() => {
    if (!partId) return;

    // Set initial status from fetched data
    if (pmiMetadata?.pmi_status) {
      setPmiStatus(pmiMetadata.pmi_status);
    }

    log.debug(`Subscribing to realtime updates for part ${partId}`);

    // Subscribe to changes on this specific part
    const channel = supabase
      .channel(`pmi-status-${partId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parts',
          filter: `id=eq.${partId}`,
        },
        (payload) => {
          const newMetadata = payload.new?.metadata as PMIMetadata | undefined;
          if (newMetadata) {
            // Log progress updates
            if (newMetadata.pmi_progress !== undefined || newMetadata.pmi_stage) {
              log.info(`Progress: ${newMetadata.pmi_progress ?? 0}% - ${newMetadata.pmi_stage ?? ''}`);
            }

            // Update local status
            if (newMetadata.pmi_status) {
              log.debug(`Status changed: ${newMetadata.pmi_status}`);
              setPmiStatus(newMetadata.pmi_status);

              // If processing complete, invalidate query to get fresh data
              if (newMetadata.pmi_status === 'complete') {
                log.info('Processing complete', {
                  time: newMetadata.pmi_processing_time_ms,
                  summary: newMetadata.pmi_summary,
                });
                queryClient.invalidateQueries({ queryKey: ['pmi', partId] });
                setIsExtracting(false);
              } else if (newMetadata.pmi_status === 'error') {
                log.error('Processing failed', newMetadata.pmi_error);
                queryClient.invalidateQueries({ queryKey: ['pmi', partId] });
                setIsExtracting(false);
              }
            }

            // Update error if present
            if (newMetadata.pmi_error) {
              setExtractionError(newMetadata.pmi_error);
            }
          }
        }
      )
      .subscribe((status) => {
        log.debug(`Subscription status: ${status}`);
      });

    // Cleanup subscription on unmount
    return () => {
      log.debug(`Unsubscribing from part ${partId}`);
      supabase.removeChannel(channel);
    };
  }, [partId, pmiMetadata?.pmi_status, queryClient]);

  /**
   * Extract PMI asynchronously via the PMI service
   * Uses Supabase realtime for status updates - no need to poll
   */
  const extractPMIAsync = useCallback(async (
    fileUrl: string,
    fileName: string
  ): Promise<{ accepted: boolean; error?: string }> => {
    if (!PMI_SERVICE_URL) {
      log.warn('PMI service not configured');
      return { accepted: false, error: 'PMI service not configured' };
    }

    if (!partId) {
      log.warn('No part ID provided');
      return { accepted: false, error: 'No part ID provided' };
    }

    // Only process STEP files
    const ext = fileName.toLowerCase().split('.').pop();
    if (!['step', 'stp'].includes(ext || '')) {
      log.debug(`Skipping non-STEP file: ${fileName}`);
      return { accepted: false, error: 'Not a STEP file' };
    }

    log.info(`Starting async extraction for ${fileName}`);

    setIsExtracting(true);
    setExtractionError(null);
    setPmiStatus('processing');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if configured
      if (PMI_SERVICE_API_KEY) {
        headers['X-API-Key'] = PMI_SERVICE_API_KEY;
      }

      log.debug(`Calling ${PMI_SERVICE_URL}/process-async`);

      const response = await fetch(`${PMI_SERVICE_URL}/process-async`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          part_id: partId,
          file_url: fileUrl,
          file_name: fileName,
          include_geometry: true,
          include_pmi: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`PMI extraction failed: HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.accepted) {
        throw new Error(result.message || 'Extraction not accepted');
      }

      // Processing started - status updates will come via realtime subscription
      return { accepted: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PMI extraction failed';
      setExtractionError(errorMessage);
      setIsExtracting(false);
      setPmiStatus('error');
      return { accepted: false, error: errorMessage };
    }
  }, [partId, session?.access_token]);

  /**
   * Extract PMI synchronously (legacy) - returns result directly
   */
  const extractPMI = useCallback(async (
    fileUrl: string,
    fileName: string
  ): Promise<PMIExtractionResult> => {
    // Check if PMI service is configured
    if (!PMI_SERVICE_URL) {
      return {
        success: false,
        pmi: null,
        error: 'PMI service not configured',
        processing_time_ms: 0,
      };
    }

    // Only process STEP files
    const ext = fileName.toLowerCase().split('.').pop();
    if (!['step', 'stp'].includes(ext || '')) {
      return {
        success: false,
        pmi: null,
        error: 'Not a STEP file',
        processing_time_ms: 0,
      };
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if configured
      if (PMI_SERVICE_API_KEY) {
        headers['X-API-Key'] = PMI_SERVICE_API_KEY;
      }

      const response = await fetch(`${PMI_SERVICE_URL}/extract`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          file_url: fileUrl,
          file_name: fileName,
        }),
      });

      if (!response.ok) {
        throw new Error(`PMI extraction failed: HTTP ${response.status}`);
      }

      const result: PMIExtractionResult = await response.json();

      if (result.success && result.pmi) {
        // Store PMI data in parts.metadata
        if (partId) {
          await storePMI(partId, result.pmi);
          // Invalidate cache to refresh data
          queryClient.invalidateQueries({ queryKey: ['pmi', partId] });
        }
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PMI extraction failed';
      setExtractionError(errorMessage);
      return {
        success: false,
        pmi: null,
        error: errorMessage,
        processing_time_ms: 0,
      };
    } finally {
      setIsExtracting(false);
    }
  }, [partId, queryClient]);

  /**
   * Store PMI data in parts.metadata
   */
  const storePMI = useCallback(async (partId: string, pmi: PMIData): Promise<void> => {
    // Get current metadata
    const { data: part, error: fetchError } = await supabase
      .from('parts')
      .select('metadata')
      .eq('id', partId)
      .single();

    if (fetchError) throw fetchError;

    // Merge PMI into existing metadata
    const currentMetadata = (part?.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...currentMetadata,
      pmi,
      pmi_extracted_at: new Date().toISOString(),
    };

    // Update the part
    const { error: updateError } = await supabase
      .from('parts')
      .update({ metadata: JSON.parse(JSON.stringify(updatedMetadata)) })
      .eq('id', partId);

    if (updateError) throw updateError;
  }, []);

  /**
   * Clear PMI data from a part
   */
  const clearPMI = useCallback(async (): Promise<void> => {
    if (!partId) return;

    const { data: part, error: fetchError } = await supabase
      .from('parts')
      .select('metadata')
      .eq('id', partId)
      .single();

    if (fetchError) throw fetchError;

    const currentMetadata = (part?.metadata as Record<string, unknown>) || {};
    const { pmi, pmi_extracted_at, ...restMetadata } = currentMetadata;

    await supabase
      .from('parts')
      .update({ metadata: JSON.parse(JSON.stringify(restMetadata)) })
      .eq('id', partId);

    queryClient.invalidateQueries({ queryKey: ['pmi', partId] });
  }, [partId, queryClient]);

  /**
   * Check if PMI data exists for this part
   */
  const hasPMI = Boolean(pmiData && (
    pmiData.dimensions?.length > 0 ||
    pmiData.geometric_tolerances?.length > 0 ||
    pmiData.datums?.length > 0 ||
    pmiData.surface_finishes?.length > 0 ||
    pmiData.notes?.length > 0 ||
    pmiData.graphical_pmi?.length > 0
  ));

  /**
   * Get PMI summary counts
   */
  const pmiSummary = pmiData ? {
    dimensionCount: pmiData.dimensions?.length || 0,
    toleranceCount: pmiData.geometric_tolerances?.length || 0,
    datumCount: pmiData.datums?.length || 0,
    surfaceFinishCount: pmiData.surface_finishes?.length || 0,
    noteCount: pmiData.notes?.length || 0,
    graphicalCount: pmiData.graphical_pmi?.length || 0,
    total: (pmiData.dimensions?.length || 0) +
           (pmiData.geometric_tolerances?.length || 0) +
           (pmiData.datums?.length || 0) +
           (pmiData.surface_finishes?.length || 0) +
           (pmiData.notes?.length || 0) +
           (pmiData.graphical_pmi?.length || 0),
  } : null;

  return {
    // Data
    pmiData,
    hasPMI,
    pmiSummary,
    pmiMetadata,

    // Status (for async processing)
    pmiStatus,
    pmiProgress: pmiMetadata?.pmi_progress ?? 0,
    pmiStage: pmiMetadata?.pmi_stage ?? '',
    pmiError: pmiMetadata?.pmi_error,
    pmiExtractedAt: pmiMetadata?.pmi_extracted_at,
    pmiProcessingTime: pmiMetadata?.pmi_processing_time_ms,

    // Loading states
    isLoadingPMI,
    isExtracting,
    isProcessing: pmiStatus === 'processing' || isExtracting,

    // Errors
    fetchError,
    extractionError,

    // Actions
    extractPMI,        // Sync extraction (legacy)
    extractPMIAsync,   // Async extraction with realtime updates
    clearPMI,
    refetchPMI,

    // Service status
    isPMIServiceEnabled: isPMIServiceEnabled(),
  };
}

/**
 * Hook to extract PMI during file upload flow
 * Use this in upload components to trigger extraction after successful upload
 */
export function usePMIExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const extract = useCallback(async (
    fileUrl: string,
    fileName: string
  ): Promise<PMIExtractionResult> => {
    if (!PMI_SERVICE_URL) {
      return {
        success: false,
        pmi: null,
        error: 'PMI service not configured',
        processing_time_ms: 0,
      };
    }

    const ext = fileName.toLowerCase().split('.').pop();
    if (!['step', 'stp'].includes(ext || '')) {
      return {
        success: false,
        pmi: null,
        processing_time_ms: 0,
      };
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if configured
      if (PMI_SERVICE_API_KEY) {
        headers['X-API-Key'] = PMI_SERVICE_API_KEY;
      }

      const response = await fetch(`${PMI_SERVICE_URL}/extract`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          file_url: fileUrl,
          file_name: fileName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Extraction failed';
      setExtractionError(errorMessage);
      return {
        success: false,
        pmi: null,
        error: errorMessage,
        processing_time_ms: 0,
      };
    } finally {
      setIsExtracting(false);
    }
  }, []);

  return {
    extract,
    isExtracting,
    extractionError,
    isEnabled: isPMIServiceEnabled(),
  };
}
