-- Fix search_path security warnings for all functions

-- Update reset_monthly_parts_counters function
CREATE OR REPLACE FUNCTION public.reset_monthly_parts_counters()
RETURNS TABLE(tenant_id uuid, previous_count integer, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update can_create_job function
CREATE OR REPLACE FUNCTION public.can_create_job(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_jobs integer;
  v_max_jobs integer;
BEGIN
  SELECT current_jobs, max_jobs
  INTO v_current_jobs, v_max_jobs
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  IF v_max_jobs IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN v_current_jobs < v_max_jobs;
END;
$$;

-- Update can_create_parts function
CREATE OR REPLACE FUNCTION public.can_create_parts(p_tenant_id uuid, p_quantity integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_parts integer;
  v_max_parts integer;
BEGIN
  SELECT current_parts_this_month, max_parts_per_month
  INTO v_current_parts, v_max_parts
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  IF v_max_parts IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN (v_current_parts + p_quantity) <= v_max_parts;
END;
$$;

-- Update get_tenant_quota function
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
SET search_path = public
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

-- Update trigger_increment_jobs function
CREATE OR REPLACE FUNCTION public.trigger_increment_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = COALESCE(current_jobs, 0) + 1
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

-- Update trigger_decrement_jobs function
CREATE OR REPLACE FUNCTION public.trigger_decrement_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = GREATEST(COALESCE(current_jobs, 0) - 1, 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$;

-- Update trigger_increment_parts function
CREATE OR REPLACE FUNCTION public.trigger_increment_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET current_parts_this_month = COALESCE(current_parts_this_month, 0) + COALESCE(NEW.quantity, 1)
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

-- Update trigger_decrement_parts function
CREATE OR REPLACE FUNCTION public.trigger_decrement_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET current_parts_this_month = GREATEST(COALESCE(current_parts_this_month, 0) - COALESCE(OLD.quantity, 1), 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$;