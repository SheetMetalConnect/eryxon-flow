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
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { uploadFileWithProgress } from '@/lib/upload-with-progress';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';

const BYTES_PER_MB = 1048576;

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
  const profile = useProfile();
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);

  const fetchStorageQuota = useCallback(async (): Promise<StorageQuota | null> => {
    try {
      const { data, error } = await supabase.rpc('get_storage_quota');

      if (error) {
        logger.error('useFileUpload', 'Error fetching storage quota', error);
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
      logger.error('useFileUpload', 'Storage quota fetch error', error);
      return null;
    }
  }, []);

  const checkUploadQuota = useCallback(async (fileSizeBytes: number): Promise<{
    allowed: boolean;
    reason: string;
    quotaInfo?: { allowed: boolean; reason: string; current_mb?: number; max_mb?: number };
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
        logger.error('useFileUpload', 'Error checking upload quota', error);
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
    } catch (error: unknown) {
      logger.error('useFileUpload', 'Quota check error', error);
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'Quota check failed',
      };
    }
  }, [profile?.tenant_id]);

  const updateStorageUsage = useCallback(async (fileSizeBytes: number, operation: 'add' | 'remove' = 'add') => {
    if (!profile?.tenant_id) return;

    try {
      await supabase.rpc('update_tenant_storage_usage', {
        p_tenant_id: profile.tenant_id,
        p_size_bytes: fileSizeBytes,
        p_operation: operation,
      });

      await fetchStorageQuota();
    } catch (error) {
      logger.error('useFileUpload', 'Error updating storage usage', error);
    }
  }, [profile?.tenant_id, fetchStorageQuota]);

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

        setProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'uploading' } : p
        ));

        if (!allowedExtensions.includes(fileExt || '')) {
          const error = `Invalid file type. Allowed: ${allowedExtensions.join(', ')}`;
          failedFiles.push({ fileName: file.name, error });
          setProgress(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'error', error } : p
          ));
          continue;
        }

        const fileSizeMB = file.size / BYTES_PER_MB;
        if (fileSizeMB > maxFileSizeMB) {
          const error = `File too large. Max size: ${maxFileSizeMB}MB`;
          failedFiles.push({ fileName: file.name, error });
          setProgress(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'error', error } : p
          ));
          continue;
        }

        if (validateQuota) {
          const quotaCheck = await checkUploadQuota(file.size);
          if (!quotaCheck.allowed) {
            failedFiles.push({ fileName: file.name, error: quotaCheck.reason });
            setProgress(prev => prev.map((p, idx) =>
              idx === i ? { ...p, status: 'error', error: quotaCheck.reason } : p
            ));

            toast.error(t('notifications.storageQuotaExceeded'), { description: quotaCheck.reason });
            continue;
          }
        }

        const path = getPathForFile(file, i);

        try {
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

          await updateStorageUsage(file.size, 'add');

        } catch (uploadError: unknown) {
          logger.error('useFileUpload', 'Upload error', uploadError);
          const errorMessage = uploadError instanceof Error ? uploadError.message : 'Upload failed';
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

  const deleteFile = useCallback(async (
    bucketName: string,
    filePath: string,
    fileSizeBytes?: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (deleteError) {
        throw deleteError;
      }

      if (fileSizeBytes !== undefined) {
        await updateStorageUsage(fileSizeBytes, 'remove');
      }

      return { success: true };
    } catch (error: unknown) {
      logger.error('useFileUpload', 'Delete error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }, [updateStorageUsage]);

  const resetProgress = useCallback(() => {
    setProgress([]);
  }, []);

  return {
    progress,
    isUploading,
    storageQuota,
    uploadFiles,
    deleteFile,
    fetchStorageQuota,
    checkUploadQuota,
    updateStorageUsage,
    resetProgress,
  };
}
