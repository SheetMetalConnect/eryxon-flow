-- Add reset tracking to tenants table (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenants' AND column_name = 'last_parts_reset_date') THEN
    ALTER TABLE public.tenants ADD COLUMN last_parts_reset_date timestamp with time zone DEFAULT now();
  END IF;
END $$;

-- Create monthly_reset_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.monthly_reset_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reset_date timestamp with time zone NOT NULL DEFAULT now(),
  previous_count integer NOT NULL,
  reset_successful boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on monthly_reset_logs
ALTER TABLE public.monthly_reset_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access only
CREATE POLICY "Service role can manage reset logs" ON public.monthly_reset_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to reset monthly parts counters
CREATE OR REPLACE FUNCTION public.reset_monthly_parts_counters()
RETURNS TABLE(tenant_id uuid, previous_count integer, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH reset_data AS (
    UPDATE public.tenants
    SET 
      current_parts_this_month = 0,
      last_parts_reset_date = now()
    WHERE status = 'active'
    RETURNING id, current_parts_this_month as prev_count
  )
  INSERT INTO public.monthly_reset_logs (tenant_id, reset_date, previous_count, reset_successful)
  SELECT id, now(), prev_count, true
  FROM reset_data
  RETURNING monthly_reset_logs.tenant_id, monthly_reset_logs.previous_count, 
            monthly_reset_logs.reset_successful, 'Reset successful'::text;
END;
$$;

-- Create helper functions for checking limits
CREATE OR REPLACE FUNCTION public.can_create_job(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_jobs integer;
  v_max_jobs integer;
BEGIN
  SELECT current_jobs, max_jobs
  INTO v_current_jobs, v_max_jobs
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  -- NULL max_jobs means unlimited
  IF v_max_jobs IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN v_current_jobs < v_max_jobs;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_create_parts(p_tenant_id uuid, p_quantity integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_parts integer;
  v_max_parts integer;
BEGIN
  SELECT current_parts_this_month, max_parts_per_month
  INTO v_current_parts, v_max_parts
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  -- NULL max_parts means unlimited
  IF v_max_parts IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN (v_current_parts + p_quantity) <= v_max_parts;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_quota(p_tenant_id uuid)
RETURNS TABLE(
  current_jobs integer,
  max_jobs integer,
  current_parts integer,
  max_parts integer,
  current_storage numeric,
  max_storage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.current_jobs,
    t.max_jobs,
    t.current_parts_this_month,
    t.max_parts_per_month,
    t.current_storage_gb,
    t.max_storage_gb
  FROM public.tenants t
  WHERE t.id = p_tenant_id;
END;
$$;

-- Create trigger function to increment job count
CREATE OR REPLACE FUNCTION public.trigger_increment_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = COALESCE(current_jobs, 0) + 1
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

-- Create trigger function to decrement job count
CREATE OR REPLACE FUNCTION public.trigger_decrement_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = GREATEST(COALESCE(current_jobs, 0) - 1, 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$;

-- Create trigger function to increment parts count
CREATE OR REPLACE FUNCTION public.trigger_increment_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tenants
  SET current_parts_this_month = COALESCE(current_parts_this_month, 0) + COALESCE(NEW.quantity, 1)
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

-- Create trigger function to decrement parts count
CREATE OR REPLACE FUNCTION public.trigger_decrement_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tenants
  SET current_parts_this_month = GREATEST(COALESCE(current_parts_this_month, 0) - COALESCE(OLD.quantity, 1), 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$;

-- Create triggers on jobs table
DROP TRIGGER IF EXISTS jobs_increment_count ON public.jobs;
CREATE TRIGGER jobs_increment_count
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_increment_jobs();

DROP TRIGGER IF EXISTS jobs_decrement_count ON public.jobs;
CREATE TRIGGER jobs_decrement_count
  AFTER DELETE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_decrement_jobs();

-- Create triggers on parts table
DROP TRIGGER IF EXISTS parts_increment_count ON public.parts;
CREATE TRIGGER parts_increment_count
  AFTER INSERT ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_increment_parts();

DROP TRIGGER IF EXISTS parts_decrement_count ON public.parts;
CREATE TRIGGER parts_decrement_count
  AFTER DELETE ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_decrement_parts();