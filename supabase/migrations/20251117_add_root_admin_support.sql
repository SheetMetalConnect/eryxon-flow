-- Add root admin support and improve tenant visibility
-- This migration adds the ability for root admin to access all tenants
-- and improves tenant name visibility throughout the application

-- Step 1: Add is_root_admin flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_root_admin BOOLEAN DEFAULT false;

-- Set luke@sheetmetalconnect.com as root admin
UPDATE public.profiles
SET is_root_admin = true
WHERE email = 'luke@sheetmetalconnect.com';

-- Step 2: Create function to check if current user is root admin
CREATE OR REPLACE FUNCTION public.is_root_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_root_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Step 3: Create function to get or set active tenant for root admin
CREATE OR REPLACE FUNCTION public.get_active_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_root_admin BOOLEAN;
  v_active_tenant UUID;
  v_user_tenant UUID;
BEGIN
  -- Check if user is root admin
  SELECT is_root_admin INTO v_is_root_admin
  FROM public.profiles
  WHERE id = auth.uid();

  -- Get user's default tenant
  SELECT tenant_id INTO v_user_tenant
  FROM public.profiles
  WHERE id = auth.uid();

  -- If root admin, check for session override
  IF v_is_root_admin THEN
    -- Try to get active tenant from session/local setting
    -- For now, return the user's tenant (switching will be handled in app)
    v_active_tenant := COALESCE(
      current_setting('app.active_tenant_id', true)::UUID,
      v_user_tenant
    );
    RETURN v_active_tenant;
  END IF;

  -- Regular users just get their tenant
  RETURN v_user_tenant;
END;
$$;

-- Step 4: Update get_user_tenant_id to support root admin override
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE
    WHEN public.is_root_admin() THEN
      COALESCE(
        nullif(current_setting('app.active_tenant_id', true), '')::UUID,
        (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
      )
    ELSE
      (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  END;
$$;

-- Step 5: Create function to set active tenant (root admin only)
CREATE OR REPLACE FUNCTION public.set_active_tenant(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only root admins can switch tenants
  IF NOT public.is_root_admin() THEN
    RAISE EXCEPTION 'Only root administrators can switch tenants';
  END IF;

  -- Verify tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant does not exist';
  END IF;

  -- Set the active tenant in session
  PERFORM set_config('app.active_tenant_id', p_tenant_id::text, false);
END;
$$;

-- Step 6: Create function to get tenant info with company name
CREATE OR REPLACE FUNCTION public.get_tenant_info()
RETURNS TABLE (
  id UUID,
  name TEXT,
  company_name TEXT,
  plan subscription_plan,
  status subscription_status
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    t.id,
    t.name,
    t.company_name,
    t.plan,
    t.status
  FROM public.tenants t
  WHERE t.id = public.get_user_tenant_id();
$$;

-- Step 7: Create function to list all tenants (root admin only)
CREATE OR REPLACE FUNCTION public.list_all_tenants()
RETURNS TABLE (
  id UUID,
  name TEXT,
  company_name TEXT,
  plan subscription_plan,
  status subscription_status,
  user_count BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only root admins can list all tenants
  IF NOT public.is_root_admin() THEN
    RAISE EXCEPTION 'Only root administrators can list all tenants';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.company_name,
    t.plan,
    t.status,
    COUNT(p.id) as user_count,
    t.created_at
  FROM public.tenants t
  LEFT JOIN public.profiles p ON p.tenant_id = t.id
  GROUP BY t.id, t.name, t.company_name, t.plan, t.status, t.created_at
  ORDER BY t.created_at DESC;
END;
$$;

-- Step 8: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_root_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_all_tenants() TO authenticated;

-- Step 9: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_root_admin ON public.profiles(is_root_admin) WHERE is_root_admin = true;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Step 10: Add comment for documentation
COMMENT ON COLUMN public.profiles.is_root_admin IS 'Root administrators can access all tenants and switch between them. Currently only luke@sheetmetalconnect.com';
COMMENT ON FUNCTION public.set_active_tenant(UUID) IS 'Allows root admin to switch their active tenant context. Regular users cannot use this.';
COMMENT ON FUNCTION public.list_all_tenants() IS 'Returns all tenants with basic stats. Only accessible by root admin.';
