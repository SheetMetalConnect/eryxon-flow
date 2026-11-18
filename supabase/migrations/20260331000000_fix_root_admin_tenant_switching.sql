-- Fix root admin tenant switching
-- Problem: set_active_tenant moves profile to target tenant (UPDATE tenant_id),
-- which violates UNIQUE(tenant_id, username) when username exists in both tenants.
-- Fix: store preference in a separate active_tenant_id column instead.

-- 1. Add active_tenant_id column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS active_tenant_id uuid REFERENCES public.tenants(id);

COMMENT ON COLUMN public.profiles.active_tenant_id IS 'Root admin tenant switching preference. Does not move the profile — just overrides which tenant data is shown.';

-- 2. Replace set_active_tenant to use active_tenant_id instead of tenant_id
CREATE OR REPLACE FUNCTION public.set_active_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_root_admin boolean;
BEGIN
  v_user_id := auth.uid();

  SELECT is_root_admin INTO v_is_root_admin
  FROM profiles
  WHERE id = v_user_id;

  IF NOT COALESCE(v_is_root_admin, false) THEN
    RAISE EXCEPTION 'Only root administrators can switch tenants';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  -- Store active tenant preference (don't move the profile!)
  UPDATE profiles
  SET active_tenant_id = p_tenant_id
  WHERE id = v_user_id;
END;
$$;

-- 3. Replace get_user_tenant_id to check active_tenant_id first (for root admins)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT CASE
      WHEN public.is_root_admin() THEN
        COALESCE(
          (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid()),
          (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        )
      ELSE
        (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    END
  );
END;
$$;
