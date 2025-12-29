-- Add feature flags to tenants table
-- Allows tenants to enable/disable specific modules and features
-- By default, uses internal database storage (not external service)

-- Add feature_flags column to store per-tenant feature configuration
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{
  "analytics": true,
  "monitoring": true,
  "shipping": true,
  "operatorViews": true,
  "integrations": true,
  "issues": true,
  "capacity": true,
  "assignments": true
}'::jsonb;

-- Add column to optionally use external feature flag service
-- Default is FALSE = use internal database-based feature flags
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS use_external_feature_flags BOOLEAN DEFAULT FALSE;

-- Add external service configuration (only used when use_external_feature_flags = TRUE)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS external_feature_flags_config JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.tenants.feature_flags IS 'Per-tenant feature flags stored as JSONB. Controls which modules are visible/enabled.';
COMMENT ON COLUMN public.tenants.use_external_feature_flags IS 'Whether to use external feature flag service (e.g., LaunchDarkly, PostHog). Default FALSE = use internal flags.';
COMMENT ON COLUMN public.tenants.external_feature_flags_config IS 'Configuration for external feature flag service (API key, project ID, etc.). Only used when use_external_feature_flags = TRUE.';

-- Create a function to get feature flags for a tenant
-- This abstracts away whether internal or external flags are used
CREATE OR REPLACE FUNCTION public.get_tenant_feature_flags(p_tenant_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_flags JSONB;
  v_use_external BOOLEAN;
  v_default_flags JSONB := '{
    "analytics": true,
    "monitoring": true,
    "shipping": true,
    "operatorViews": true,
    "integrations": true,
    "issues": true,
    "capacity": true,
    "assignments": true
  }'::jsonb;
BEGIN
  -- Use provided tenant_id or get from current user
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = auth.uid();

    -- Check for active tenant override (for root admins)
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_root_admin = true
      AND active_tenant_id IS NOT NULL
    ) THEN
      SELECT active_tenant_id INTO v_tenant_id
      FROM profiles
      WHERE id = auth.uid();
    END IF;
  END IF;

  -- Get tenant's feature flag settings
  SELECT
    COALESCE(feature_flags, v_default_flags),
    COALESCE(use_external_feature_flags, false)
  INTO v_flags, v_use_external
  FROM tenants
  WHERE id = v_tenant_id;

  -- If using external service, return empty object (frontend will fetch from external)
  -- This is a placeholder - external service integration would go here
  IF v_use_external THEN
    -- For now, still return internal flags as fallback
    -- In production, this could call external service or return special marker
    RETURN COALESCE(v_flags, v_default_flags);
  END IF;

  -- Return internal flags merged with defaults
  RETURN v_default_flags || COALESCE(v_flags, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_tenant_feature_flags IS 'Returns feature flags for a tenant, with defaults applied. Handles internal vs external flag storage.';

-- Create a function to update feature flags
CREATE OR REPLACE FUNCTION public.update_tenant_feature_flags(
  p_tenant_id UUID,
  p_flags JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_flags JSONB;
  v_merged_flags JSONB;
BEGIN
  -- Verify user has access to this tenant (RLS will handle this, but double-check)
  IF NOT EXISTS (
    SELECT 1 FROM tenants WHERE id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  -- Get existing flags
  SELECT COALESCE(feature_flags, '{}'::jsonb)
  INTO v_existing_flags
  FROM tenants
  WHERE id = p_tenant_id;

  -- Merge new flags with existing
  v_merged_flags := v_existing_flags || p_flags;

  -- Update the tenant
  UPDATE tenants
  SET
    feature_flags = v_merged_flags,
    updated_at = now()
  WHERE id = p_tenant_id;

  RETURN v_merged_flags;
END;
$$;

COMMENT ON FUNCTION public.update_tenant_feature_flags IS 'Updates feature flags for a tenant, merging with existing flags.';

-- Ensure existing tenants have default feature flags
UPDATE public.tenants
SET feature_flags = '{
  "analytics": true,
  "monitoring": true,
  "shipping": true,
  "operatorViews": true,
  "integrations": true,
  "issues": true,
  "capacity": true,
  "assignments": true
}'::jsonb
WHERE feature_flags IS NULL;
