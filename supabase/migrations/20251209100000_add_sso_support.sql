-- Add SSO support for Premium/Enterprise tenants
-- Migration: 20251209100000_add_sso_support.sql

-- Add SSO configuration columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_provider TEXT; -- 'microsoft', 'google', 'saml'
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_domain TEXT; -- e.g., 'company.com' for domain-based login
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_enforce_only BOOLEAN DEFAULT false; -- disable password login when true

-- Add comment for documentation
COMMENT ON COLUMN tenants.sso_enabled IS 'Whether SSO is enabled for this tenant (premium/enterprise only)';
COMMENT ON COLUMN tenants.sso_provider IS 'SSO provider: microsoft, google, or saml';
COMMENT ON COLUMN tenants.sso_domain IS 'Email domain for automatic SSO routing (e.g., company.com)';
COMMENT ON COLUMN tenants.sso_enforce_only IS 'When true, password login is disabled - SSO only';

-- Update get_tenant_info to include SSO fields
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
  whitelabel_favicon_url TEXT,
  sso_enabled BOOLEAN,
  sso_provider TEXT,
  sso_domain TEXT,
  sso_enforce_only BOOLEAN
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
    t.whitelabel_favicon_url,
    COALESCE(t.sso_enabled, false),
    t.sso_provider,
    t.sso_domain,
    COALESCE(t.sso_enforce_only, false)
  FROM tenants t
  WHERE t.id = v_tenant_id;
END;
$$;

-- Function to check if tenant can use SSO (premium/enterprise only)
CREATE OR REPLACE FUNCTION can_use_sso(p_tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get tenant ID from parameter or current user's tenant
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    v_tenant_id := (SELECT tenant_id FROM profiles WHERE id = auth.uid());
  END IF;

  -- Check if tenant is on premium or enterprise plan with active status
  RETURN EXISTS (
    SELECT 1 FROM tenants
    WHERE id = v_tenant_id
    AND plan IN ('premium', 'enterprise')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tenant SSO configuration
CREATE OR REPLACE FUNCTION get_tenant_sso_config()
RETURNS TABLE (
  sso_enabled BOOLEAN,
  sso_provider TEXT,
  sso_domain TEXT,
  sso_enforce_only BOOLEAN,
  can_use_sso BOOLEAN
) AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := (SELECT tenant_id FROM profiles WHERE id = auth.uid());

  RETURN QUERY
  SELECT
    t.sso_enabled,
    t.sso_provider,
    t.sso_domain,
    t.sso_enforce_only,
    can_use_sso(v_tenant_id) as can_use_sso
  FROM tenants t
  WHERE t.id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email domain matches tenant SSO domain (for auto-routing to SSO)
CREATE OR REPLACE FUNCTION check_sso_domain(p_email TEXT)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  sso_provider TEXT,
  sso_enforce_only BOOLEAN
) AS $$
DECLARE
  v_email_domain TEXT;
BEGIN
  -- Extract domain from email
  v_email_domain := split_part(p_email, '@', 2);

  RETURN QUERY
  SELECT
    t.id as tenant_id,
    t.name as tenant_name,
    t.sso_provider,
    t.sso_enforce_only
  FROM tenants t
  WHERE t.sso_enabled = true
    AND t.sso_domain = v_email_domain
    AND t.plan IN ('premium', 'enterprise')
    AND t.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION can_use_sso(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_sso_config() TO authenticated;
GRANT EXECUTE ON FUNCTION check_sso_domain(TEXT) TO anon, authenticated;
