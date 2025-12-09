-- Add SSO support for Premium/Enterprise tenants
-- Migration: 20251209100000_add_sso_support.sql

-- Add SSO configuration columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_provider TEXT; -- 'microsoft', 'google', 'saml'
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_domain TEXT; -- e.g., 'company.com' for domain-based login
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_enforce_only BOOLEAN DEFAULT false; -- disable password login when true

-- Create enum type for SSO providers if it doesn't exist
DO $$ BEGIN
  CREATE TYPE sso_provider_type AS ENUM ('microsoft', 'google', 'saml');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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

-- Add comment for documentation
COMMENT ON COLUMN tenants.sso_enabled IS 'Whether SSO is enabled for this tenant (premium/enterprise only)';
COMMENT ON COLUMN tenants.sso_provider IS 'SSO provider: microsoft, google, or saml';
COMMENT ON COLUMN tenants.sso_domain IS 'Email domain for automatic SSO routing (e.g., company.com)';
COMMENT ON COLUMN tenants.sso_enforce_only IS 'When true, password login is disabled - SSO only';

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION can_use_sso(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_sso_config() TO authenticated;
GRANT EXECUTE ON FUNCTION check_sso_domain(TEXT) TO anon, authenticated;
