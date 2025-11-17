-- Create user_roles table with proper security architecture
-- This fixes the privilege escalation vulnerability

-- Drop existing role column from profiles (after migration)
-- We'll migrate data first, then drop the column

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles in their tenant"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Update existing RLS policies to use has_role function instead of checking profiles.role

-- Update profiles table policies
DROP POLICY IF EXISTS "Admins can manage profiles in their tenant" ON public.profiles;
CREATE POLICY "Admins can manage profiles in their tenant"
ON public.profiles
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Add authentication requirement to profiles SELECT
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;
CREATE POLICY "Users can view profiles in their tenant"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND tenant_id = get_user_tenant_id());

-- Update activity_log policies - add authentication requirement
DROP POLICY IF EXISTS "Users can view their tenant activity logs" ON public.activity_log;
CREATE POLICY "Users can view their tenant activity logs"
ON public.activity_log
FOR SELECT
USING (auth.uid() IS NOT NULL AND tenant_id = get_user_tenant_id());

-- Update api_keys policies
DROP POLICY IF EXISTS "Admins can manage API keys in their tenant" ON public.api_keys;
CREATE POLICY "Admins can manage API keys in their tenant"
ON public.api_keys
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update assignments policies
DROP POLICY IF EXISTS "Admins can manage assignments in their tenant" ON public.assignments;
CREATE POLICY "Admins can manage assignments in their tenant"
ON public.assignments
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update cells policies
DROP POLICY IF EXISTS "Admins can manage stages in their tenant" ON public.cells;
CREATE POLICY "Admins can manage stages in their tenant"
ON public.cells
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update installed_integrations policies
DROP POLICY IF EXISTS "Admins can manage installed integrations" ON public.installed_integrations;
CREATE POLICY "Admins can manage installed integrations"
ON public.installed_integrations
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update issues policies
DROP POLICY IF EXISTS "Admins can manage issues in their tenant" ON public.issues;
CREATE POLICY "Admins can manage issues in their tenant"
ON public.issues
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update jobs policies
DROP POLICY IF EXISTS "Admins can manage jobs in their tenant" ON public.jobs;
CREATE POLICY "Admins can manage jobs in their tenant"
ON public.jobs
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update materials policies
DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
CREATE POLICY "Admins can manage materials"
ON public.materials
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update operation_resources policies
DROP POLICY IF EXISTS "Admins can manage operation_resources" ON public.operation_resources;
CREATE POLICY "Admins can manage operation_resources"
ON public.operation_resources
FOR ALL
USING ((operation_id IN (SELECT id FROM operations WHERE tenant_id = get_user_tenant_id())) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update operations policies
DROP POLICY IF EXISTS "Admins can manage tasks in their tenant" ON public.operations;
CREATE POLICY "Admins can manage tasks in their tenant"
ON public.operations
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update parts policies
DROP POLICY IF EXISTS "Admins can manage parts in their tenant" ON public.parts;
CREATE POLICY "Admins can manage parts in their tenant"
ON public.parts
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update resources policies
DROP POLICY IF EXISTS "Admins can manage resources" ON public.resources;
CREATE POLICY "Admins can manage resources"
ON public.resources
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update substep_template_items policies
DROP POLICY IF EXISTS "Admins can manage template items" ON public.substep_template_items;
CREATE POLICY "Admins can manage template items"
ON public.substep_template_items
FOR ALL
USING (template_id IN (SELECT id FROM substep_templates WHERE ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role)) OR (is_global = true)))
WITH CHECK (template_id IN (SELECT id FROM substep_templates WHERE (tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role)));

-- Update substep_templates policies
DROP POLICY IF EXISTS "Admins can manage tenant templates" ON public.substep_templates;
CREATE POLICY "Admins can manage tenant templates"
ON public.substep_templates
FOR ALL
USING (((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role)) OR (is_global = true))
WITH CHECK ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update substeps policies
DROP POLICY IF EXISTS "Admins can manage substeps in their tenant" ON public.substeps;
CREATE POLICY "Admins can manage substeps in their tenant"
ON public.substeps
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update time_entries policies
DROP POLICY IF EXISTS "Admins can view all time entries in their tenant" ON public.time_entries;
CREATE POLICY "Admins can view all time entries in their tenant"
ON public.time_entries
FOR SELECT
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update webhook_logs policies
DROP POLICY IF EXISTS "Admins can view webhook logs in their tenant" ON public.webhook_logs;
CREATE POLICY "Admins can view webhook logs in their tenant"
ON public.webhook_logs
FOR SELECT
USING ((webhook_id IN (SELECT id FROM webhooks WHERE tenant_id = get_user_tenant_id())) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update webhooks policies
DROP POLICY IF EXISTS "Admins can manage webhooks in their tenant" ON public.webhooks;
CREATE POLICY "Admins can manage webhooks in their tenant"
ON public.webhooks
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update get_user_role function to use user_roles table
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Note: Keep the role column in profiles for now for backwards compatibility
-- It can be removed in a future migration after confirming everything works