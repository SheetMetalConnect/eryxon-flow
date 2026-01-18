-- Fix RLS policy to allow admins to update/delete time entries (for stopping forgotten clockings)

-- Drop the existing admin SELECT-only policy
DROP POLICY IF EXISTS "Admins can view all time entries in their tenant" ON public.time_entries;

-- Create a comprehensive admin policy for all operations
CREATE POLICY "Admins can manage all time entries in their tenant" 
ON public.time_entries 
FOR ALL
USING (
  (tenant_id = get_user_tenant_id()) 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (tenant_id = get_user_tenant_id()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);