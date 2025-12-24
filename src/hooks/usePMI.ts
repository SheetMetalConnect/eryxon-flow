/**
 * PMI (Product Manufacturing Information) Hook
 *
 * This hook provides:
 * 1. PMI extraction trigger after STEP file upload
 * 2. PMI data fetching from parts.metadata
 * 3. Caching and loading states
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

const PMI_SERVICE_URL = import.meta.env.VITE_PMI_SERVICE_URL;

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

  /**
   * Fetch PMI data from parts.metadata
   */
  const {
    data: pmiData,
    isLoading: isLoadingPMI,
    error: fetchError,
    refetch: refetchPMI,
  } = useQuery({
    queryKey: ['pmi', partId],
    queryFn: async (): Promise<PMIData | null> => {
      if (!partId) return null;

      const { data: part, error } = await supabase
        .from('parts')
        .select('metadata')
        .eq('id', partId)
        .single();

      if (error) throw error;

      // Extract PMI from metadata
      const metadata = part?.metadata as Record<string, unknown> | null;
      const pmi = metadata?.pmi as PMIData | undefined;

      return pmi || null;
    },
    enabled: !!partId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Extract PMI from a STEP file via the PMI service
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
      const response = await fetch(`${PMI_SERVICE_URL}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && {
            'Authorization': `Bearer ${session.access_token}`,
          }),
        },
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
  }, [partId, session?.access_token, queryClient]);

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
      .update({ metadata: updatedMetadata })
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
      .update({ metadata: restMetadata })
      .eq('id', partId);

    queryClient.invalidateQueries({ queryKey: ['pmi', partId] });
  }, [partId, queryClient]);

  /**
   * Check if PMI data exists for this part
   */
  const hasPMI = Boolean(pmiData && (
    pmiData.dimensions.length > 0 ||
    pmiData.geometric_tolerances.length > 0 ||
    pmiData.datums.length > 0
  ));

  /**
   * Get PMI summary counts
   */
  const pmiSummary = pmiData ? {
    dimensionCount: pmiData.dimensions.length,
    toleranceCount: pmiData.geometric_tolerances.length,
    datumCount: pmiData.datums.length,
    total: pmiData.dimensions.length + pmiData.geometric_tolerances.length + pmiData.datums.length,
  } : null;

  return {
    // Data
    pmiData,
    hasPMI,
    pmiSummary,

    // Loading states
    isLoadingPMI,
    isExtracting,

    // Errors
    fetchError,
    extractionError,

    // Actions
    extractPMI,
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
  const { session } = useAuth();
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
      const response = await fetch(`${PMI_SERVICE_URL}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && {
            'Authorization': `Bearer ${session.access_token}`,
          }),
        },
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
  }, [session?.access_token]);

  return {
    extract,
    isExtracting,
    extractionError,
    isEnabled: isPMIServiceEnabled(),
  };
}
