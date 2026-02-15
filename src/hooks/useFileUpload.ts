/**
 * File Upload Hook with Progress Tracking and Quota Validation
 *
 * This hook provides:
 * 1. Storage quota checking before upload
 * 2. Real-time upload progress tracking (bytes, MB, percentage)
 * 3. Automatic storage usage updates after successful upload
 * 4. Support for multiple file uploads
 * 5. Rate limiting based on subscription tier
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { uploadFileWithProgress } from '@/lib/upload-with-progress';
import { useTranslation } from 'react-i18next';

export interface UploadProgress {
  fileIndex: number;
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  percentage: number;
  totalMB: number;
  uploadedMB: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface StorageQuota {
  currentMB: number;
  maxMB: number | null;
  remainingMB: number;
  usedPercentage: number;
  isUnlimited: boolean;
}

export interface UploadResult {
  success: boolean;
  uploadedPaths: string[];
  failedFiles: { fileName: string; error: string }[];
  totalUploadedMB: number;
}

export function useFileUpload() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);

  /**
   * Fetch current storage quota from database
   */
  const fetchStorageQuota = useCallback(async (): Promise<StorageQuota | null> => {
    try {
      const { data, error } = await supabase.rpc('get_storage_quota');

      if (error) {
        console.error('Error fetching storage quota:', error);
        return null;
      }

      if (!data || data.length === 0) return null;

      const quota = data[0];
      const quotaInfo: StorageQuota = {
        currentMB: parseFloat(String(quota.current_mb)) || 0,
        maxMB: quota.max_mb ? parseFloat(String(quota.max_mb)) : null,
        remainingMB: parseFloat(String(quota.remaining_mb)) || 0,
        usedPercentage: parseFloat(String(quota.used_percentage)) || 0,
        isUnlimited: quota.is_unlimited || false,
      };

      setStorageQuota(quotaInfo);
      return quotaInfo;
    } catch (error) {
      console.error('Storage quota fetch error:', error);
      return null;
    }
  }, []);

  /**
   * Check if a file can be uploaded based on storage quota
   */
  const checkUploadQuota = useCallback(async (fileSizeBytes: number): Promise<{
    allowed: boolean;
    reason: string;
    quotaInfo?: any;
  }> => {
    if (!profile?.tenant_id) {
      return {
        allowed: false,
        reason: 'No tenant ID found',
      };
    }

    try {
      const { data, error } = await supabase.rpc('can_upload_file', {
        p_tenant_id: profile.tenant_id,
        p_file_size_bytes: fileSizeBytes,
      });

      if (error) {
        console.error('Error checking upload quota:', error);
        return {
          allowed: false,
          reason: 'Unable to verify storage quota',
        };
      }

      if (!data || data.length === 0) {
        return {
          allowed: false,
          reason: 'Unable to verify storage quota',
        };
      }

      const result = data[0];
      return {
        allowed: result.allowed,
        reason: result.reason || '',
        quotaInfo: result,
      };
    } catch (error: any) {
      console.error('Quota check error:', error);
      return {
        allowed: false,
        reason: error.message || 'Quota check failed',
      };
    }
  }, [profile?.tenant_id]);

  /**
   * Update tenant storage usage after successful upload
   */
  const updateStorageUsage = useCallback(async (fileSizeBytes: number, operation: 'add' | 'remove' = 'add') => {
    if (!profile?.tenant_id) return;

    try {
      await supabase.rpc('update_tenant_storage_usage', {
        p_tenant_id: profile.tenant_id,
        p_size_bytes: fileSizeBytes,
        p_operation: operation,
      });

      // Refresh quota after update
      await fetchStorageQuota();
    } catch (error) {
      console.error('Error updating storage usage:', error);
    }
  }, [profile?.tenant_id, fetchStorageQuota]);

  /**
   * Upload files to Supabase Storage with progress tracking
   */
  const uploadFiles = useCallback(async (
    files: FileList | File[],
    bucketName: string,
    getPathForFile: (file: File, index: number) => string,
    options?: {
      allowedExtensions?: string[];
      maxFileSizeMB?: number;
      validateQuota?: boolean;
    }
  ): Promise<UploadResult> => {
    const {
      allowedExtensions = ['step', 'stp', 'pdf'],
      maxFileSizeMB = 100, // 100MB default max per file
      validateQuota = true,
    } = options || {};

    setIsUploading(true);

    const fileArray = Array.from(files);
    const uploadedPaths: string[] = [];
    const failedFiles: { fileName: string; error: string }[] = [];
    let totalUploadedBytes = 0;

    // Initialize progress for all files
    const initialProgress: UploadProgress[] = fileArray.map((file, index) => ({
      fileIndex: index,
      fileName: file.name,
      totalBytes: file.size,
      uploadedBytes: 0,
      percentage: 0,
      totalMB: file.size / 1048576,
      uploadedMB: 0,
      status: 'pending' as const,
    }));

    setProgress(initialProgress);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const fileExt = file.name.split('.').pop()?.toLowerCase();

        // Update status to uploading
        setProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'uploading' } : p
        ));

        // Validate file extension
        if (!allowedExtensions.includes(fileExt || '')) {
          const error = `Invalid file type. Allowed: ${allowedExtensions.join(', ')}`;
          failedFiles.push({ fileName: file.name, error });
          setProgress(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'error', error } : p
          ));
          continue;
        }

        // Validate file size
        const fileSizeMB = file.size / 1048576;
        if (fileSizeMB > maxFileSizeMB) {
          const error = `File too large. Max size: ${maxFileSizeMB}MB`;
          failedFiles.push({ fileName: file.name, error });
          setProgress(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'error', error } : p
          ));
          continue;
        }

        // Check storage quota
        if (validateQuota) {
          const quotaCheck = await checkUploadQuota(file.size);
          if (!quotaCheck.allowed) {
            failedFiles.push({ fileName: file.name, error: quotaCheck.reason });
            setProgress(prev => prev.map((p, idx) =>
              idx === i ? { ...p, status: 'error', error: quotaCheck.reason } : p
            ));

            // Show toast for quota exceeded
            toast.error(t('notifications.storageQuotaExceeded'), { description: quotaCheck.reason });
            continue;
          }
        }

        const path = getPathForFile(file, i);

        try {
          // Upload with progress tracking using XMLHttpRequest
          const { error: uploadError } = await uploadFileWithProgress(
            bucketName,
            path,
            file,
            {
              onProgress: (loaded, total, percentage) => {
                setProgress(prev => prev.map((p, idx) =>
                  idx === i ? {
                    ...p,
                    uploadedBytes: loaded,
                    percentage,
                    uploadedMB: loaded / 1048576,
                  } : p
                ));
              },
            }
          );

          if (uploadError) {
            throw uploadError;
          }

          // Mark as completed
          setProgress(prev => prev.map((p, idx) =>
            idx === i ? {
              ...p,
              uploadedBytes: file.size,
              percentage: 100,
              uploadedMB: file.size / 1048576,
              status: 'completed',
            } : p
          ));

          uploadedPaths.push(path);
          totalUploadedBytes += file.size;

          // Update storage usage
          await updateStorageUsage(file.size, 'add');

        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          const errorMessage = uploadError.message || 'Upload failed';
          failedFiles.push({ fileName: file.name, error: errorMessage });
          setProgress(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'error', error: errorMessage } : p
          ));
        }
      }

      return {
        success: uploadedPaths.length > 0,
        uploadedPaths,
        failedFiles,
        totalUploadedMB: totalUploadedBytes / 1048576,
      };

    } finally {
      setIsUploading(false);
    }
  }, [profile, checkUploadQuota, updateStorageUsage]);

  /**
   * Delete a file and update storage usage
   */
  const deleteFile = useCallback(async (
    bucketName: string,
    filePath: string,
    fileSizeBytes?: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (deleteError) {
        throw deleteError;
      }

      // If file size is provided, update storage usage
      if (fileSizeBytes !== undefined) {
        await updateStorageUsage(fileSizeBytes, 'remove');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: error.message || 'Delete failed',
      };
    }
  }, [updateStorageUsage]);

  /**
   * Reset progress
   */
  const resetProgress = useCallback(() => {
    setProgress([]);
  }, []);

  return {
    // State
    progress,
    isUploading,
    storageQuota,

    // Actions
    uploadFiles,
    deleteFile,
    fetchStorageQuota,
    checkUploadQuota,
    updateStorageUsage,
    resetProgress,
  };
}
