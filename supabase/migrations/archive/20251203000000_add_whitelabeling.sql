-- Add whitelabeling fields to tenants table for premium plan
-- Premium feature: White-label (optional) - custom logo and branding

-- Add whitelabeling columns to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS whitelabel_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whitelabel_logo_url TEXT,
ADD COLUMN IF NOT EXISTS whitelabel_app_name TEXT,
ADD COLUMN IF NOT EXISTS whitelabel_primary_color TEXT,
ADD COLUMN IF NOT EXISTS whitelabel_favicon_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.tenants.whitelabel_enabled IS 'Whether whitelabeling is enabled for this tenant (premium feature)';
COMMENT ON COLUMN public.tenants.whitelabel_logo_url IS 'Custom logo URL for the tenant (displayed in navigation)';
COMMENT ON COLUMN public.tenants.whitelabel_app_name IS 'Custom application name to display instead of default';
COMMENT ON COLUMN public.tenants.whitelabel_primary_color IS 'Custom primary brand color (hex format, e.g., #1e90ff)';
COMMENT ON COLUMN public.tenants.whitelabel_favicon_url IS 'Custom favicon URL for the tenant';

-- Update the get_tenant_info function to include whitelabeling fields
CREATE OR REPLACE FUNCTION public.get_tenant_info()
RETURNS TABLE (
  id UUID,
  name TEXT,
  company_name TEXT,
  plan subscription_plan,
  status subscription_status,
  whitelabel_enabled BOOLEAN,
  whitelabel_logo_url TEXT,
  whitelabel_app_name TEXT,
  whitelabel_primary_color TEXT,
  whitelabel_favicon_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get the tenant ID for the current user
  SELECT p.tenant_id INTO v_tenant_id
  FROM profiles p
  WHERE p.id = auth.uid();

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

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.company_name,
    t.plan,
    t.status,
    COALESCE(t.whitelabel_enabled, false),
    t.whitelabel_logo_url,
    t.whitelabel_app_name,
    t.whitelabel_primary_color,
    t.whitelabel_favicon_url
  FROM tenants t
  WHERE t.id = v_tenant_id;
END;
$$;

-- Add comment for the function
COMMENT ON FUNCTION public.get_tenant_info IS 'Returns tenant info including whitelabeling settings for the current user';

-- Create a function to check if tenant has premium whitelabeling access
CREATE OR REPLACE FUNCTION public.can_use_whitelabeling(p_tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_plan subscription_plan;
  v_status subscription_status;
BEGIN
  -- Use provided tenant_id or get from current user
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = auth.uid();
  END IF;

  -- Get tenant plan and status
  SELECT plan, status INTO v_plan, v_status
  FROM tenants
  WHERE id = v_tenant_id;

  -- Only premium and enterprise plans with active/trial status can use whitelabeling
  RETURN v_plan IN ('premium', 'enterprise')
    AND v_status IN ('active', 'trial');
END;
$$;

COMMENT ON FUNCTION public.can_use_whitelabeling IS 'Check if tenant can use premium whitelabeling features';
