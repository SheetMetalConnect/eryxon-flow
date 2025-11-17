-- Migration: Usage Tracking, Plan Limits Enforcement, and Monthly Reset
-- Created: 2025-11-17
-- Description:
--   1. Add tracking fields for monthly resets and current jobs
--   2. Create monthly_reset_logs table for audit trail
--   3. Update plan limits to match new pricing (Pro: 1000 jobs, 10000 parts)
--   4. Create triggers for automatic usage tracking
--   5. Create function for monthly parts counter reset

-- ============================================================================
-- STEP 1: Add new fields to tenants table
-- ============================================================================

-- Add last_parts_reset_date to track when parts counter was last reset
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS last_parts_reset_date TIMESTAMPTZ DEFAULT NOW();

-- Add current_jobs to track total jobs (not monthly, cumulative)
-- Note: current_month_parts already exists, we're keeping it
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS current_jobs INTEGER DEFAULT 0;

-- Update existing tenants to have a reset date (if null)
UPDATE public.tenants
SET last_parts_reset_date = COALESCE(last_parts_reset_date, NOW())
WHERE last_parts_reset_date IS NULL;

-- ============================================================================
-- STEP 2: Create monthly_reset_logs table for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.monthly_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reset_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_parts_count INTEGER NOT NULL DEFAULT 0,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  reset_type TEXT NOT NULL DEFAULT 'automatic', -- 'automatic' or 'manual'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries on tenant_id and reset_date
CREATE INDEX IF NOT EXISTS idx_reset_logs_tenant_date
ON public.monthly_reset_logs(tenant_id, reset_date DESC);

-- Enable RLS on monthly_reset_logs
ALTER TABLE public.monthly_reset_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tenant's reset logs
CREATE POLICY "Users can view their tenant reset logs"
  ON public.monthly_reset_logs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- Policy: Only service role can insert reset logs (via cron job)
-- Note: This will be handled by the edge function with service role key

-- ============================================================================
-- STEP 3: Update plan limits to match new pricing
-- ============================================================================

-- Update Pro plan limits to 1000 jobs/month and 10000 parts/month
UPDATE public.tenants
SET
  max_jobs = 1000,
  max_parts_per_month = 10000
WHERE plan = 'pro';

-- Update Premium/Enterprise plan to unlimited (NULL means unlimited)
UPDATE public.tenants
SET
  max_jobs = NULL,
  max_parts_per_month = NULL,
  max_storage_gb = NULL
WHERE plan = 'premium';

-- Ensure Free plan has correct limits (100 jobs, 1000 parts, 5GB)
UPDATE public.tenants
SET
  max_jobs = 100,
  max_parts_per_month = 1000,
  max_storage_gb = 5
WHERE plan = 'free';

-- ============================================================================
-- STEP 4: Create triggers for automatic usage tracking
-- ============================================================================

-- Function: Update current_jobs count when jobs are created
CREATE OR REPLACE FUNCTION public.increment_tenant_jobs()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = current_jobs + 1
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Decrement current_jobs count when jobs are deleted
CREATE OR REPLACE FUNCTION public.decrement_tenant_jobs()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = GREATEST(current_jobs - 1, 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update current_month_parts when parts are created
CREATE OR REPLACE FUNCTION public.increment_tenant_parts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tenants
  SET current_month_parts = current_month_parts + COALESCE(NEW.quantity, 1)
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Decrement current_month_parts when parts are deleted
CREATE OR REPLACE FUNCTION public.decrement_tenant_parts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tenants
  SET current_month_parts = GREATEST(current_month_parts - COALESCE(OLD.quantity, 1), 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop triggers if they exist (to avoid conflicts on re-run)
DROP TRIGGER IF EXISTS trigger_increment_jobs ON public.jobs;
DROP TRIGGER IF EXISTS trigger_decrement_jobs ON public.jobs;
DROP TRIGGER IF EXISTS trigger_increment_parts ON public.parts;
DROP TRIGGER IF EXISTS trigger_decrement_parts ON public.parts;

-- Create triggers on jobs table
CREATE TRIGGER trigger_increment_jobs
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_tenant_jobs();

CREATE TRIGGER trigger_decrement_jobs
  AFTER DELETE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_tenant_jobs();

-- Create triggers on parts table
CREATE TRIGGER trigger_increment_parts
  AFTER INSERT ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_tenant_parts();

CREATE TRIGGER trigger_decrement_parts
  AFTER DELETE ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_tenant_parts();

-- ============================================================================
-- STEP 5: Create function for monthly parts counter reset
-- ============================================================================

-- Function: Reset monthly parts counter for all tenants
-- This will be called by the monthly cron job
CREATE OR REPLACE FUNCTION public.reset_monthly_parts_counters()
RETURNS TABLE(
  tenant_id UUID,
  previous_count INTEGER,
  reset_successful BOOLEAN
) AS $$
DECLARE
  tenant_record RECORD;
  billing_start DATE;
  billing_end DATE;
BEGIN
  -- Calculate billing period (previous month)
  billing_start := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE;
  billing_end := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;

  -- Loop through all active tenants
  FOR tenant_record IN
    SELECT id, current_month_parts, plan, status
    FROM public.tenants
    WHERE status = 'active'
  LOOP
    -- Log the reset
    INSERT INTO public.monthly_reset_logs (
      tenant_id,
      previous_parts_count,
      billing_period_start,
      billing_period_end,
      reset_type,
      metadata
    ) VALUES (
      tenant_record.id,
      tenant_record.current_month_parts,
      billing_start,
      billing_end,
      'automatic',
      jsonb_build_object(
        'plan', tenant_record.plan,
        'reset_timestamp', NOW()
      )
    );

    -- Reset the counter
    UPDATE public.tenants
    SET
      current_month_parts = 0,
      last_parts_reset_date = NOW()
    WHERE id = tenant_record.id;

    -- Return result
    RETURN QUERY SELECT
      tenant_record.id,
      tenant_record.current_month_parts,
      TRUE;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.reset_monthly_parts_counters() TO service_role;

-- ============================================================================
-- STEP 6: Create helper function to check plan limits
-- ============================================================================

-- Function: Check if tenant can create more jobs
CREATE OR REPLACE FUNCTION public.can_create_job(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_jobs INTEGER;
  v_max_jobs INTEGER;
BEGIN
  SELECT current_jobs, max_jobs
  INTO v_current_jobs, v_max_jobs
  FROM public.tenants
  WHERE id = p_tenant_id;

  -- If max_jobs is NULL, it's unlimited
  IF v_max_jobs IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if under limit
  RETURN v_current_jobs < v_max_jobs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if tenant can create more parts
CREATE OR REPLACE FUNCTION public.can_create_parts(p_tenant_id UUID, p_quantity INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_parts INTEGER;
  v_max_parts INTEGER;
BEGIN
  SELECT current_month_parts, max_parts_per_month
  INTO v_current_parts, v_max_parts
  FROM public.tenants
  WHERE id = p_tenant_id;

  -- If max_parts_per_month is NULL, it's unlimited
  IF v_max_parts IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if under limit (including the new parts quantity)
  RETURN (v_current_parts + p_quantity) <= v_max_parts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get remaining quota for tenant
CREATE OR REPLACE FUNCTION public.get_tenant_quota(p_tenant_id UUID)
RETURNS TABLE(
  plan subscription_plan,
  current_jobs INTEGER,
  max_jobs INTEGER,
  remaining_jobs INTEGER,
  current_parts INTEGER,
  max_parts INTEGER,
  remaining_parts INTEGER,
  can_create_job BOOLEAN,
  can_create_part BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.plan,
    t.current_jobs,
    t.max_jobs,
    CASE
      WHEN t.max_jobs IS NULL THEN -1 -- -1 means unlimited
      ELSE GREATEST(t.max_jobs - t.current_jobs, 0)
    END as remaining_jobs,
    t.current_month_parts,
    t.max_parts_per_month,
    CASE
      WHEN t.max_parts_per_month IS NULL THEN -1 -- -1 means unlimited
      ELSE GREATEST(t.max_parts_per_month - t.current_month_parts, 0)
    END as remaining_parts,
    public.can_create_job(p_tenant_id) as can_create_job,
    public.can_create_parts(p_tenant_id, 1) as can_create_part
  FROM public.tenants t
  WHERE t.id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_create_job(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_create_parts(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_tenant_quota(UUID) TO authenticated, service_role;

-- ============================================================================
-- STEP 7: Initialize current_jobs count for existing tenants
-- ============================================================================

-- Update current_jobs to match actual count in jobs table
UPDATE public.tenants t
SET current_jobs = (
  SELECT COUNT(*)
  FROM public.jobs j
  WHERE j.tenant_id = t.id
);

-- Update current_month_parts to match actual count in parts table
-- (Only count parts created this month)
UPDATE public.tenants t
SET current_month_parts = (
  SELECT COALESCE(SUM(p.quantity), 0)
  FROM public.parts p
  WHERE p.tenant_id = t.id
    AND p.created_at >= DATE_TRUNC('month', CURRENT_DATE)
);

-- ============================================================================
-- STEP 8: Update get_tenant_usage_stats function to use new counters
-- ============================================================================

-- Update the existing RPC function to use the new counters
CREATE OR REPLACE FUNCTION public.get_tenant_usage_stats()
RETURNS TABLE(
  total_jobs BIGINT,
  total_parts BIGINT,
  active_jobs BIGINT,
  completed_jobs BIGINT,
  current_month_parts BIGINT,
  total_operators BIGINT,
  total_admins BIGINT
) AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get current user's tenant ID
  v_tenant_id := public.get_user_tenant_id();

  RETURN QUERY
  SELECT
    -- Use current_jobs from tenants table
    (SELECT t.current_jobs::BIGINT FROM public.tenants t WHERE t.id = v_tenant_id) as total_jobs,

    -- Total parts across all time
    COUNT(DISTINCT p.id) as total_parts,

    -- Active jobs (not completed)
    COUNT(DISTINCT j.id) FILTER (WHERE j.status != 'completed') as active_jobs,

    -- Completed jobs
    COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,

    -- Use current_month_parts from tenants table (which is now auto-updated by triggers)
    (SELECT t.current_month_parts::BIGINT FROM public.tenants t WHERE t.id = v_tenant_id) as current_month_parts,

    -- Total operators
    COUNT(DISTINCT pr.id) FILTER (WHERE pr.role = 'operator') as total_operators,

    -- Total admins
    COUNT(DISTINCT pr.id) FILTER (WHERE pr.role = 'admin') as total_admins
  FROM public.jobs j
  LEFT JOIN public.parts p ON p.job_id = j.id
  LEFT JOIN public.profiles pr ON pr.tenant_id = j.tenant_id
  WHERE j.tenant_id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- NOTES:
-- ============================================================================
--
-- This migration sets up:
-- 1. Automatic usage tracking via database triggers
-- 2. Monthly reset capability via reset_monthly_parts_counters() function
-- 3. Plan limit checking via can_create_job() and can_create_parts() functions
-- 4. Audit trail via monthly_reset_logs table
-- 5. Updated plan limits (Free: 100/1000, Pro: 1000/10000, Enterprise: unlimited)
--
-- Next steps:
-- 1. Create Supabase edge function for monthly cron job
-- 2. Update API endpoints to check limits before creating jobs/parts
-- 3. Deploy and test the system
--
-- ============================================================================
