-- =====================================================
-- Migration: Add Demo Mode Tracking to Tenants
-- =====================================================
-- This migration adds fields to track demo data status
-- Prevents duplicate seeding and allows easy identification of demo tenants

-- Add demo mode tracking columns to tenants table
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS demo_mode_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_data_seeded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demo_data_seeded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS demo_mode_acknowledged BOOLEAN DEFAULT false;

-- Add index for quick demo mode queries
CREATE INDEX IF NOT EXISTS idx_tenants_demo_mode ON public.tenants(demo_mode_enabled) WHERE demo_mode_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.demo_mode_enabled IS 'Indicates if tenant is using demo data. Set to true when demo data is seeded, false when cleared.';
COMMENT ON COLUMN public.tenants.demo_data_seeded_at IS 'Timestamp when demo data was last seeded for this tenant.';
COMMENT ON COLUMN public.tenants.demo_data_seeded_by IS 'User ID who seeded the demo data (if available).';
COMMENT ON COLUMN public.tenants.demo_mode_acknowledged IS 'User acknowledged they are okay keeping demo data. When false, show persistent banner. When true, show subtle indicator only.';

-- =====================================================
-- Helper Functions for Demo Mode Management
-- =====================================================

-- Function to enable demo mode for a tenant
CREATE OR REPLACE FUNCTION public.enable_demo_mode(
  p_tenant_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenants
  SET
    demo_mode_enabled = true,
    demo_data_seeded_at = NOW(),
    demo_data_seeded_by = p_user_id
  WHERE id = p_tenant_id;
END;
$$;

-- Function to disable demo mode for a tenant
CREATE OR REPLACE FUNCTION public.disable_demo_mode(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenants
  SET
    demo_mode_enabled = false,
    demo_data_seeded_at = NULL,
    demo_data_seeded_by = NULL
  WHERE id = p_tenant_id;
END;
$$;

-- Function to check if tenant is in demo mode
CREATE OR REPLACE FUNCTION public.is_demo_mode(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(demo_mode_enabled, false)
  FROM tenants
  WHERE id = p_tenant_id;
$$;

-- Function to acknowledge demo mode (dismiss banner)
CREATE OR REPLACE FUNCTION public.acknowledge_demo_mode(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenants
  SET demo_mode_acknowledged = true
  WHERE id = p_tenant_id;
END;
$$;

-- Function to check if demo mode needs acknowledgment (for banner display)
CREATE OR REPLACE FUNCTION public.should_show_demo_banner(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(demo_mode_enabled, false) = true
    AND COALESCE(demo_mode_acknowledged, false) = false
  FROM tenants
  WHERE id = p_tenant_id;
$$;

-- =====================================================
-- Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.enable_demo_mode(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_demo_mode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_demo_mode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_demo_mode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_show_demo_banner(UUID) TO authenticated;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON FUNCTION public.enable_demo_mode IS 'Marks a tenant as being in demo mode with timestamp and user tracking';
COMMENT ON FUNCTION public.disable_demo_mode IS 'Removes demo mode flag from tenant, typically called after clearMockData()';
COMMENT ON FUNCTION public.is_demo_mode IS 'Quick check to see if tenant has demo data active';
COMMENT ON FUNCTION public.acknowledge_demo_mode IS 'User acknowledges they want to keep demo data - dismisses the banner';
COMMENT ON FUNCTION public.should_show_demo_banner IS 'Returns true if demo mode is active but not yet acknowledged - triggers banner display';
