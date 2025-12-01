-- Update plan limits for BSL 1.1 pricing model
-- Free: 25 jobs/mo, 250 parts/mo, 500MB storage
-- Pro: 500 jobs/mo, 5000 parts/mo, 10GB storage
-- Premium/Enterprise: Unlimited (NULL)

-- Update existing tenants by plan
UPDATE public.tenants
SET
  max_jobs = 25,
  max_parts_per_month = 250,
  max_storage_gb = 1  -- 500MB rounded to 1GB for simplicity
WHERE plan = 'free';

UPDATE public.tenants
SET
  max_jobs = 500,
  max_parts_per_month = 5000,
  max_storage_gb = 10
WHERE plan = 'pro';

UPDATE public.tenants
SET
  max_jobs = NULL,
  max_parts_per_month = NULL,
  max_storage_gb = NULL
WHERE plan = 'premium';

-- Update the handle_new_tenant function with new free tier defaults
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
    -- Create new tenant with free plan defaults (BSL 1.1 model)
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
      25,    -- Free tier: 25 jobs/mo
      250,   -- Free tier: 250 parts/mo
      1,     -- Free tier: ~500MB (1GB for simplicity)
      NEW.email
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create or replace function to get plan limits by plan type
-- Used for documentation and plan upgrades
CREATE OR REPLACE FUNCTION public.get_plan_limits(p_plan subscription_plan)
RETURNS TABLE (
  plan_name TEXT,
  max_jobs INTEGER,
  max_parts_per_month INTEGER,
  max_storage_gb INTEGER,
  has_webhooks BOOLEAN,
  has_mcp_server BOOLEAN,
  has_sso BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    p_plan::TEXT,
    CASE p_plan
      WHEN 'free' THEN 25
      WHEN 'pro' THEN 500
      WHEN 'premium' THEN NULL  -- unlimited
    END,
    CASE p_plan
      WHEN 'free' THEN 250
      WHEN 'pro' THEN 5000
      WHEN 'premium' THEN NULL  -- unlimited
    END,
    CASE p_plan
      WHEN 'free' THEN 1
      WHEN 'pro' THEN 10
      WHEN 'premium' THEN NULL  -- unlimited
    END,
    CASE p_plan
      WHEN 'free' THEN FALSE
      WHEN 'pro' THEN TRUE
      WHEN 'premium' THEN TRUE
    END,
    CASE p_plan
      WHEN 'free' THEN FALSE
      WHEN 'pro' THEN TRUE
      WHEN 'premium' THEN TRUE
    END,
    CASE p_plan
      WHEN 'free' THEN FALSE
      WHEN 'pro' THEN FALSE
      WHEN 'premium' THEN TRUE
    END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_plan_limits IS 'Returns plan limits for BSL 1.1 pricing model. Free: 25 jobs, 250 parts, 1GB. Pro: 500 jobs, 5000 parts, 10GB. Premium: unlimited.';
