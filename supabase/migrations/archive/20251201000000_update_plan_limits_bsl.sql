-- Update plan limits for BSL 1.1 pricing model (4 hosted tiers + self-hosted)
-- Free: 25 jobs/mo, 250 parts/mo, 500MB storage
-- Pro: 500 jobs/mo, 5000 parts/mo, 10GB storage
-- Premium: Fair use (2000 jobs/mo, 20000 parts/mo, 100GB storage)
-- Enterprise: Unlimited (NULL) - their infrastructure

-- Add 'enterprise' to the subscription_plan enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'enterprise'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subscription_plan')
  ) THEN
    ALTER TYPE subscription_plan ADD VALUE 'enterprise';
  END IF;
END $$;

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

-- Premium now has fair use limits (high but not unlimited)
UPDATE public.tenants
SET
  max_jobs = 2000,
  max_parts_per_month = 20000,
  max_storage_gb = 100
WHERE plan = 'premium';

-- Enterprise has unlimited (NULL)
-- Note: Existing 'premium' tenants that should be enterprise need manual migration
UPDATE public.tenants
SET
  max_jobs = NULL,
  max_parts_per_month = NULL,
  max_storage_gb = NULL
WHERE plan = 'enterprise';

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
      WHEN 'premium' THEN 2000      -- Fair use
      WHEN 'enterprise' THEN NULL   -- Unlimited
    END,
    CASE p_plan
      WHEN 'free' THEN 250
      WHEN 'pro' THEN 5000
      WHEN 'premium' THEN 20000     -- Fair use
      WHEN 'enterprise' THEN NULL   -- Unlimited
    END,
    CASE p_plan
      WHEN 'free' THEN 1
      WHEN 'pro' THEN 10
      WHEN 'premium' THEN 100
      WHEN 'enterprise' THEN NULL   -- Unlimited
    END,
    CASE p_plan
      WHEN 'free' THEN FALSE
      WHEN 'pro' THEN TRUE
      WHEN 'premium' THEN TRUE
      WHEN 'enterprise' THEN TRUE
    END,
    CASE p_plan
      WHEN 'free' THEN FALSE
      WHEN 'pro' THEN TRUE
      WHEN 'premium' THEN TRUE
      WHEN 'enterprise' THEN TRUE
    END,
    CASE p_plan
      WHEN 'free' THEN FALSE
      WHEN 'pro' THEN FALSE
      WHEN 'premium' THEN TRUE
      WHEN 'enterprise' THEN TRUE
    END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_plan_limits IS 'Returns plan limits for BSL 1.1 pricing model. Free: 25/250/1GB. Pro: 500/5K/10GB. Premium: 2K/20K/100GB (fair use). Enterprise: unlimited.';
