-- Update VMC tenant to premium plan
UPDATE public.tenants 
SET plan = 'premium', status = 'active' 
WHERE id = '8692a161-2810-4135-913e-741c30b6dcec';

-- Create the set_active_tenant function if it doesn't exist
-- This function allows root admins to temporarily switch their context to another tenant
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
  
  -- Check if user is root admin
  SELECT is_root_admin INTO v_is_root_admin
  FROM profiles
  WHERE id = v_user_id;
  
  IF NOT COALESCE(v_is_root_admin, false) THEN
    RAISE EXCEPTION 'Only root administrators can switch tenants';
  END IF;
  
  -- Verify target tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;
  
  -- Update the user's tenant_id to the target tenant
  UPDATE profiles
  SET tenant_id = p_tenant_id
  WHERE id = v_user_id;
END;
$$;