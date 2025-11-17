-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'premium');

-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'suspended', 'trial');

-- Tenants table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  -- Plan limits
  max_jobs INTEGER,
  max_parts_per_month INTEGER,
  max_storage_gb INTEGER,
  -- Usage tracking
  current_month_parts INTEGER DEFAULT 0,
  current_storage_mb INTEGER DEFAULT 0,
  -- Subscription metadata
  plan_started_at TIMESTAMPTZ DEFAULT NOW(),
  plan_expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  -- Enterprise features
  sso_enabled BOOLEAN DEFAULT false,
  self_hosted BOOLEAN DEFAULT false,
  -- Contact information
  contact_email TEXT,
  billing_email TEXT,
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Add index for tenant lookups
CREATE INDEX idx_tenants_plan ON tenants(plan);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Update profiles to reference tenants table
-- Note: This doesn't add a foreign key constraint to avoid breaking existing data
-- In production, you would migrate existing tenant_ids to the tenants table first

-- Function to get tenant subscription info
CREATE OR REPLACE FUNCTION public.get_tenant_subscription(tenant_uuid UUID)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  plan subscription_plan,
  status subscription_status,
  max_jobs INTEGER,
  max_parts_per_month INTEGER,
  max_storage_gb INTEGER,
  current_month_parts INTEGER,
  current_storage_mb INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    name,
    plan,
    status,
    max_jobs,
    max_parts_per_month,
    max_storage_gb,
    current_month_parts,
    current_storage_mb
  FROM public.tenants
  WHERE id = tenant_uuid;
$$;

-- Function to get current user's tenant subscription
CREATE OR REPLACE FUNCTION public.get_my_tenant_subscription()
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  plan subscription_plan,
  status subscription_status,
  max_jobs INTEGER,
  max_parts_per_month INTEGER,
  max_storage_gb INTEGER,
  current_month_parts INTEGER,
  current_storage_mb INTEGER,
  plan_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.plan,
    t.status,
    t.max_jobs,
    t.max_parts_per_month,
    t.max_storage_gb,
    t.current_month_parts,
    t.current_storage_mb,
    t.plan_started_at,
    t.trial_ends_at
  FROM public.tenants t
  INNER JOIN public.profiles p ON p.tenant_id = t.id
  WHERE p.id = auth.uid();
$$;

-- Function to get tenant usage statistics
-- Security: Only returns stats for the calling user's tenant (no parameter to prevent cross-tenant access)
CREATE OR REPLACE FUNCTION public.get_tenant_usage_stats()
RETURNS TABLE (
  total_jobs BIGINT,
  total_parts BIGINT,
  active_jobs BIGINT,
  completed_jobs BIGINT,
  current_month_parts BIGINT,
  total_operators BIGINT,
  total_admins BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(DISTINCT j.id) as total_jobs,
    COUNT(DISTINCT p.id) as total_parts,
    COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'in_progress') as active_jobs,
    COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,
    COUNT(DISTINCT p.id) FILTER (WHERE p.created_at >= date_trunc('month', CURRENT_DATE)) as current_month_parts,
    COUNT(DISTINCT pr.id) FILTER (WHERE pr.role = 'operator') as total_operators,
    COUNT(DISTINCT pr.id) FILTER (WHERE pr.role = 'admin') as total_admins
  FROM public.jobs j
  LEFT JOIN public.parts p ON p.job_id = j.id
  LEFT JOIN public.profiles pr ON pr.tenant_id = public.get_user_tenant_id()
  WHERE j.tenant_id = public.get_user_tenant_id() OR p.tenant_id = public.get_user_tenant_id();
$$;

-- RLS Policies for tenants
CREATE POLICY "Users can view their own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_user_tenant_id());

CREATE POLICY "Admins can update their tenant"
  ON public.tenants FOR UPDATE
  USING (id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

-- Insert default tenant data for existing tenant_ids in profiles
-- This creates a tenant record for each unique tenant_id
INSERT INTO public.tenants (id, name, plan, status, max_jobs, max_parts_per_month, max_storage_gb)
SELECT DISTINCT
  p.tenant_id,
  'Tenant ' || substring(p.tenant_id::text, 1, 8),
  'free',
  'active',
  100,
  1000,
  5
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenants t WHERE t.id = p.tenant_id
)
ON CONFLICT (id) DO NOTHING;

-- Function to initialize new tenant on user creation
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Check if tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
    -- Create new tenant with free plan defaults
    INSERT INTO public.tenants (
      id,
      name,
      plan,
      status,
      max_jobs,
      max_parts_per_month,
      max_storage_gb,
      contact_email
    ) VALUES (
      NEW.tenant_id,
      COALESCE(NEW.full_name || '''s Organization', 'New Organization'),
      'free',
      'active',
      100,
      1000,
      5,
      NEW.email
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to create tenant when new profile is created
CREATE TRIGGER on_profile_created_create_tenant
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant();
