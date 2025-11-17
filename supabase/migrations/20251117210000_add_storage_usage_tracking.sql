-- Migration: Storage Usage Tracking for File Uploads
-- Created: 2025-11-17
-- Description:
--   1. Add RPC function to calculate current storage usage from Supabase Storage
--   2. Add RPC function to update tenant storage usage
--   3. Add RPC function to check if file upload is allowed based on quota
--   4. Add helper functions for storage quota management

-- ============================================================================
-- STEP 1: Function to calculate storage usage for a tenant from Storage API
-- ============================================================================

-- This function will be called manually or via edge function after file operations
-- It calculates the total size of all files in the tenant's storage paths
CREATE OR REPLACE FUNCTION public.update_tenant_storage_usage(p_tenant_id UUID, p_size_bytes BIGINT, p_operation TEXT DEFAULT 'add')
RETURNS VOID AS $$
DECLARE
  v_size_mb NUMERIC;
BEGIN
  -- Convert bytes to MB
  v_size_mb := p_size_bytes::NUMERIC / 1048576.0; -- 1024 * 1024

  -- Update tenant storage based on operation
  IF p_operation = 'add' THEN
    UPDATE public.tenants
    SET current_storage_mb = current_storage_mb + v_size_mb
    WHERE id = p_tenant_id;
  ELSIF p_operation = 'remove' THEN
    UPDATE public.tenants
    SET current_storage_mb = GREATEST(current_storage_mb - v_size_mb, 0)
    WHERE id = p_tenant_id;
  ELSIF p_operation = 'set' THEN
    -- Set absolute value (for recalculation)
    UPDATE public.tenants
    SET current_storage_mb = v_size_mb
    WHERE id = p_tenant_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Function to check if tenant can upload a file
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_upload_file(
  p_tenant_id UUID,
  p_file_size_bytes BIGINT
)
RETURNS TABLE(
  allowed BOOLEAN,
  reason TEXT,
  current_mb NUMERIC,
  limit_mb NUMERIC,
  remaining_mb NUMERIC,
  file_size_mb NUMERIC
) AS $$
DECLARE
  v_plan subscription_plan;
  v_current_mb NUMERIC;
  v_max_gb NUMERIC;
  v_max_mb NUMERIC;
  v_file_mb NUMERIC;
  v_new_total_mb NUMERIC;
BEGIN
  -- Get tenant plan and current storage
  SELECT t.plan, t.current_storage_mb, t.max_storage_gb
  INTO v_plan, v_current_mb, v_max_gb
  FROM public.tenants t
  WHERE t.id = p_tenant_id;

  -- Convert file size to MB
  v_file_mb := p_file_size_bytes::NUMERIC / 1048576.0;

  -- Premium/Enterprise has unlimited storage
  IF v_max_gb IS NULL THEN
    RETURN QUERY SELECT
      TRUE,
      'Unlimited storage available'::TEXT,
      v_current_mb,
      NULL::NUMERIC,
      -1::NUMERIC, -- -1 means unlimited
      v_file_mb;
    RETURN;
  END IF;

  -- Calculate limits
  v_max_mb := v_max_gb * 1024;
  v_new_total_mb := v_current_mb + v_file_mb;

  -- Check if upload would exceed limit
  IF v_new_total_mb > v_max_mb THEN
    RETURN QUERY SELECT
      FALSE,
      format('Storage limit reached. Your %s plan allows %sGB. You have %sMB remaining. This file requires %sMB.',
        v_plan,
        v_max_gb,
        ROUND((v_max_mb - v_current_mb)::NUMERIC, 2),
        ROUND(v_file_mb::NUMERIC, 2)
      ),
      v_current_mb,
      v_max_mb,
      GREATEST(v_max_mb - v_current_mb, 0),
      v_file_mb;
    RETURN;
  END IF;

  -- Upload is allowed
  RETURN QUERY SELECT
    TRUE,
    format('Upload allowed. %sMB of %sMB will be used (%s%%)',
      ROUND(v_new_total_mb::NUMERIC, 2),
      v_max_mb,
      ROUND((v_new_total_mb / v_max_mb * 100)::NUMERIC, 1)
    ),
    v_current_mb,
    v_max_mb,
    v_max_mb - v_new_total_mb,
    v_file_mb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Function to get storage quota info for UI display
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_storage_quota()
RETURNS TABLE(
  plan subscription_plan,
  current_mb NUMERIC,
  max_mb NUMERIC,
  used_percentage NUMERIC,
  remaining_mb NUMERIC,
  is_unlimited BOOLEAN
) AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get current user's tenant
  v_tenant_id := public.get_user_tenant_id();

  RETURN QUERY
  SELECT
    t.plan,
    t.current_storage_mb,
    CASE
      WHEN t.max_storage_gb IS NULL THEN NULL
      ELSE t.max_storage_gb * 1024
    END as max_mb,
    CASE
      WHEN t.max_storage_gb IS NULL THEN 0
      ELSE ROUND((t.current_storage_mb / (t.max_storage_gb * 1024) * 100)::NUMERIC, 2)
    END as used_percentage,
    CASE
      WHEN t.max_storage_gb IS NULL THEN -1 -- unlimited
      ELSE GREATEST((t.max_storage_gb * 1024) - t.current_storage_mb, 0)
    END as remaining_mb,
    (t.max_storage_gb IS NULL) as is_unlimited
  FROM public.tenants t
  WHERE t.id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Function to recalculate storage usage from actual files
-- ============================================================================

-- This is a placeholder - actual calculation would need to query Supabase Storage
-- via edge function since we can't access storage directly from SQL
CREATE OR REPLACE FUNCTION public.recalculate_tenant_storage(p_tenant_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  old_storage_mb NUMERIC,
  new_storage_mb NUMERIC
) AS $$
BEGIN
  -- This function is meant to be called by an edge function
  -- that has access to Supabase Storage API
  -- For now, just return current values
  RETURN QUERY
  SELECT
    FALSE,
    'This function must be called via edge function with storage access'::TEXT,
    t.current_storage_mb,
    t.current_storage_mb
  FROM public.tenants t
  WHERE t.id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.update_tenant_storage_usage(UUID, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_upload_file(UUID, BIGINT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_storage_quota() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_tenant_storage(UUID) TO service_role;

-- ============================================================================
-- STEP 6: Create storage audit log table (optional but recommended)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.storage_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  operation TEXT NOT NULL, -- 'upload', 'delete', 'recalculate'
  file_path TEXT,
  file_size_bytes BIGINT,
  old_storage_mb NUMERIC,
  new_storage_mb NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_storage_audit_tenant_date
ON public.storage_audit_log(tenant_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.storage_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tenant's storage audit logs
CREATE POLICY "Users can view their tenant storage logs"
  ON public.storage_audit_log FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- Policy: Only service role can insert logs
-- (This will be handled by edge functions with service role key)

-- ============================================================================
-- STEP 7: Helper function to log storage operations
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_storage_operation(
  p_tenant_id UUID,
  p_operation TEXT,
  p_file_path TEXT,
  p_file_size_bytes BIGINT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
  v_old_storage NUMERIC;
  v_new_storage NUMERIC;
BEGIN
  -- Get current storage
  SELECT current_storage_mb INTO v_old_storage
  FROM public.tenants
  WHERE id = p_tenant_id;

  -- Calculate new storage (this is just for logging)
  IF p_operation = 'upload' THEN
    v_new_storage := v_old_storage + (p_file_size_bytes::NUMERIC / 1048576.0);
  ELSIF p_operation = 'delete' THEN
    v_new_storage := GREATEST(v_old_storage - (p_file_size_bytes::NUMERIC / 1048576.0), 0);
  ELSE
    v_new_storage := v_old_storage;
  END IF;

  -- Insert log entry
  INSERT INTO public.storage_audit_log (
    tenant_id,
    operation,
    file_path,
    file_size_bytes,
    old_storage_mb,
    new_storage_mb,
    metadata
  ) VALUES (
    p_tenant_id,
    p_operation,
    p_file_path,
    p_file_size_bytes,
    v_old_storage,
    v_new_storage,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.log_storage_operation(UUID, TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- ============================================================================
-- NOTES:
-- ============================================================================
--
-- This migration sets up:
-- 1. Functions to track storage usage (add/remove/set operations)
-- 2. Function to check if file upload is allowed based on quota
-- 3. Function to get storage quota info for UI display
-- 4. Audit log for tracking all storage operations
-- 5. Helper functions for storage management
--
-- Next steps:
-- 1. Create edge function to validate uploads and track storage
-- 2. Update client-side upload to check quotas first
-- 3. Add progress tracking to file uploads
-- 4. Create periodic job to recalculate storage usage from actual files
--
-- ============================================================================
