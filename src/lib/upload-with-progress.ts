/**
 * Upload Utility with Real Progress Tracking
 *
 * This module provides XMLHttpRequest-based file uploads to Supabase Storage
 * with accurate progress tracking that the standard Supabase client doesn't support.
 */

import { supabase } from '@/integrations/supabase/client';

export interface UploadProgressCallback {
  (loaded: number, total: number, percentage: number): void;
}

export interface UploadWithProgressOptions {
  onProgress?: UploadProgressCallback;
  signal?: AbortSignal;
}

/**
 * Upload a file to Supabase Storage with progress tracking
 *
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param file - File to upload
 * @param options - Upload options including progress callback
 * @returns Promise with upload result
 */
export async function uploadFileWithProgress(
  bucket: string,
  path: string,
  file: File,
  options: UploadWithProgressOptions = {}
): Promise<{ data: { path: string } | null; error: Error | null }> {
  const { onProgress, signal } = options;

  try {
    // Get the Supabase URL and anon key
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    // Get the current session for auth
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;

    if (!authToken) {
      throw new Error('No authentication token available');
    }

    // Construct the upload URL
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress(event.loaded, event.total, percentage);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            data: { path },
            error: null,
          });
        } else {
          const errorMessage = xhr.responseText || `Upload failed with status ${xhr.status}`;
          resolve({
            data: null,
            error: new Error(errorMessage),
          });
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        resolve({
          data: null,
          error: new Error('Network error during upload'),
        });
      });

      xhr.addEventListener('abort', () => {
        resolve({
          data: null,
          error: new Error('Upload aborted'),
        });
      });

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      // Open and configure request
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
      xhr.setRequestHeader('apikey', supabaseKey);

      // Don't set Content-Type - let browser set it with boundary for multipart
      // xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      // Send the file
      xhr.send(file);
    });

  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Get signed URL for file upload (alternative approach using Supabase's signed URLs)
 * This can be used when direct upload isn't possible
 */
export async function getSignedUploadUrl(
  bucket: string,
  path: string
): Promise<{ signedUrl: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error) {
      return { signedUrl: null, error };
    }

    return { signedUrl: data?.signedUrl || null, error: null };
  } catch (error) {
    return {
      signedUrl: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Upload file using signed URL with progress tracking
 */
export async function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  options: UploadWithProgressOptions = {}
): Promise<{ success: boolean; error: Error | null }> {
  const { onProgress, signal } = options;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        onProgress(event.loaded, event.total, percentage);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true, error: null });
      } else {
        resolve({
          success: false,
          error: new Error(`Upload failed with status ${xhr.status}`),
        });
      }
    });

    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        error: new Error('Network error during upload'),
      });
    });

    xhr.addEventListener('abort', () => {
      resolve({
        success: false,
        error: new Error('Upload aborted'),
      });
    });

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format MB to human-readable format
 */
export function formatMB(mb: number, decimals: number = 2): string {
  if (mb < 1) {
    return `${(mb * 1024).toFixed(decimals)} KB`;
  }
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(decimals)} GB`;
  }
  return `${mb.toFixed(decimals)} MB`;
}
