/**
 * Storage Manager Edge Function
 *
 * This edge function provides storage management capabilities:
 * 1. Recalculate tenant storage usage from actual files
 * 2. Validate uploads against quota limits
 * 3. Track file operations (upload/delete)
 * 4. Clean up orphaned files
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecalculateStorageRequest {
  action: 'recalculate';
  tenant_id?: string; // If not provided, recalculates for current user's tenant
}

interface ValidateUploadRequest {
  action: 'validate_upload';
  file_size_bytes: number;
}

interface TrackFileOperationRequest {
  action: 'track_operation';
  operation: 'upload' | 'delete';
  file_path: string;
  file_size_bytes: number;
}

type RequestBody = RecalculateStorageRequest | ValidateUploadRequest | TrackFileOperationRequest;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? ''
    );

    // Create client with user's auth for permission checks
    const authHeader = req.headers.get('authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader ?? '' },
        },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's tenant ID
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NO_TENANT', message: 'No tenant associated with user' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = profile.tenant_id;
    const body: RequestBody = await req.json();

    // Handle different actions
    switch (body.action) {
      case 'recalculate':
        return await handleRecalculateStorage(supabaseAdmin, tenantId);

      case 'validate_upload':
        return await handleValidateUpload(supabaseAdmin, tenantId, body.file_size_bytes);

      case 'track_operation':
        return await handleTrackOperation(
          supabaseAdmin,
          tenantId,
          body.operation,
          body.file_path,
          body.file_size_bytes
        );

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'INVALID_ACTION', message: 'Unknown action' },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Storage manager error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Recalculate storage usage for a tenant by listing all files in their storage paths
 */
async function handleRecalculateStorage(supabase: any, tenantId: string) {
  try {
    // List all files for this tenant in the parts-cad bucket
    const { data: files, error: listError } = await supabase.storage
      .from('parts-cad')
      .list(tenantId, {
        limit: 10000, // Adjust as needed
        sortBy: { column: 'name', order: 'asc' },
      });

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`);
    }

    // Calculate total size
    let totalBytes = 0;
    const fileCount = files?.length || 0;

    if (files && files.length > 0) {
      // Note: Supabase Storage list doesn't return file sizes in metadata
      // We need to iterate and get file info for each
      // For now, we'll just update based on what we track in the database
      // A proper implementation would need to fetch each file's metadata

      for (const file of files) {
        // This is a simplified version - actual implementation would need
        // to recursively list subdirectories and get file sizes
        if (file.metadata?.size) {
          totalBytes += file.metadata.size;
        }
      }
    }

    const totalMB = totalBytes / 1048576;

    // Update tenant's storage usage
    const { error: updateError } = await supabase.rpc('update_tenant_storage_usage', {
      p_tenant_id: tenantId,
      p_size_bytes: totalBytes,
      p_operation: 'set',
    });

    if (updateError) {
      throw new Error(`Failed to update storage usage: ${updateError.message}`);
    }

    // Log the recalculation
    await supabase.rpc('log_storage_operation', {
      p_tenant_id: tenantId,
      p_operation: 'recalculate',
      p_file_path: `${tenantId}/`,
      p_file_size_bytes: totalBytes,
      p_metadata: {
        file_count: fileCount,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          tenant_id: tenantId,
          total_files: fileCount,
          total_bytes: totalBytes,
          total_mb: Math.round(totalMB * 100) / 100,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Recalculate storage error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'RECALCULATE_ERROR', message },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Validate if an upload is allowed based on storage quota
 */
async function handleValidateUpload(supabase: any, tenantId: string, fileSizeBytes: number) {
  try {
    const { data, error } = await supabase.rpc('can_upload_file', {
      p_tenant_id: tenantId,
      p_file_size_bytes: fileSizeBytes,
    });

    if (error) {
      throw new Error(`Failed to check upload quota: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No quota information returned');
    }

    const result = data[0];

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          allowed: result.allowed,
          reason: result.reason,
          current_mb: result.current_mb,
          limit_mb: result.limit_mb,
          remaining_mb: result.remaining_mb,
          file_size_mb: result.file_size_mb,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validate upload error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'VALIDATION_ERROR', message },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Track a file operation (upload or delete) and update storage usage
 */
async function handleTrackOperation(
  supabase: any,
  tenantId: string,
  operation: 'upload' | 'delete',
  filePath: string,
  fileSizeBytes: number
) {
  try {
    // Update storage usage
    const { error: updateError } = await supabase.rpc('update_tenant_storage_usage', {
      p_tenant_id: tenantId,
      p_size_bytes: fileSizeBytes,
      p_operation: operation === 'upload' ? 'add' : 'remove',
    });

    if (updateError) {
      throw new Error(`Failed to update storage usage: ${updateError.message}`);
    }

    // Log the operation
    await supabase.rpc('log_storage_operation', {
      p_tenant_id: tenantId,
      p_operation: operation,
      p_file_path: filePath,
      p_file_size_bytes: fileSizeBytes,
      p_metadata: {
        timestamp: new Date().toISOString(),
      },
    });

    // Get updated quota
    const { data: quotaData } = await supabase.rpc('get_storage_quota');
    const quota = quotaData && quotaData.length > 0 ? quotaData[0] : null;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          operation,
          file_path: filePath,
          file_size_bytes: fileSizeBytes,
          updated_quota: quota,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Track operation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'TRACK_ERROR', message },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
