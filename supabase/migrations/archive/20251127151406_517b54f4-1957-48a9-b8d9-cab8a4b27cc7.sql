-- Fix critical security issues by enforcing tenant isolation

-- 1. Fix profiles SELECT policy - restrict to same tenant only  
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in their tenant"
ON public.profiles FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- 2. Fix activity_log SELECT policy - enforce tenant isolation
DROP POLICY IF EXISTS "Users can view activity logs in their tenant" ON public.activity_log;
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_log;
CREATE POLICY "Users can view activity logs in their tenant"
ON public.activity_log FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- 3. Fix invitations SELECT policy - restrict to same tenant
DROP POLICY IF EXISTS "Users can view invitations in their tenant" ON public.invitations;
DROP POLICY IF EXISTS "Authenticated users can view invitations" ON public.invitations;
CREATE POLICY "Users can view invitations in their tenant"
ON public.invitations FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- 4. Add SELECT policy for api_keys - admin only, same tenant
DROP POLICY IF EXISTS "Admins can view api_keys in their tenant" ON public.api_keys;
CREATE POLICY "Admins can view api_keys in their tenant"
ON public.api_keys FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'admin'::app_role)
);