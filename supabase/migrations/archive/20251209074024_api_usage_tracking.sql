-- API Usage Tracking Migration
-- Adds daily API usage tracking for plan-based rate limiting

-- Add API usage columns to tenants table for current day tracking
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS api_requests_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS api_requests_reset_at TIMESTAMPTZ DEFAULT (CURRENT_DATE + INTERVAL '1 day');

-- Create API usage logs table for historical tracking
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  requests_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, date)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_tenant_date
ON public.api_usage_logs(tenant_id, date DESC);

-- RLS policies for api_usage_logs
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own tenant's usage
CREATE POLICY "Users can view own tenant API usage"
ON public.api_usage_logs
FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

-- Service role can insert/update
CREATE POLICY "Service role can manage API usage"
ON public.api_usage_logs
FOR ALL
USING (auth.role() = 'service_role');

-- Function to increment API usage (called from Edge Functions)
CREATE OR REPLACE FUNCTION public.increment_api_usage(
  p_tenant_id UUID,
  p_api_key_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_new_count INTEGER;
BEGIN
  -- Upsert into daily usage log
  INSERT INTO public.api_usage_logs (tenant_id, api_key_id, date, requests_count)
  VALUES (p_tenant_id, p_api_key_id, v_today, 1)
  ON CONFLICT (tenant_id, date)
  DO UPDATE SET
    requests_count = api_usage_logs.requests_count + 1,
    updated_at = NOW()
  RETURNING requests_count INTO v_new_count;

  -- Also update tenant's current day counter
  UPDATE public.tenants
  SET
    api_requests_today = CASE
      WHEN api_requests_reset_at < NOW() THEN 1
      ELSE api_requests_today + 1
    END,
    api_requests_reset_at = CASE
      WHEN api_requests_reset_at < NOW() THEN CURRENT_DATE + INTERVAL '1 day'
      ELSE api_requests_reset_at
    END
  WHERE id = p_tenant_id;

  RETURN v_new_count;
END;
$$;

-- Function to get current usage for a tenant
CREATE OR REPLACE FUNCTION public.get_api_usage_stats(
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE(
  today_requests INTEGER,
  this_month_requests BIGINT,
  reset_at TIMESTAMPTZ,
  daily_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := COALESCE(p_tenant_id, public.get_user_tenant_id());
  v_plan TEXT;
  v_daily_limit INTEGER;
BEGIN
  -- Get tenant plan
  SELECT t.plan INTO v_plan
  FROM public.tenants t
  WHERE t.id = v_tenant_id;

  -- Determine daily limit based on plan
  v_daily_limit := CASE v_plan
    WHEN 'free' THEN 100
    WHEN 'pro' THEN 1000
    WHEN 'premium' THEN 10000
    WHEN 'enterprise' THEN NULL -- unlimited
    ELSE 100
  END;

  RETURN QUERY
  SELECT
    COALESCE(t.api_requests_today, 0)::INTEGER as today_requests,
    COALESCE((
      SELECT SUM(requests_count)
      FROM api_usage_logs
      WHERE tenant_id = v_tenant_id
      AND date >= DATE_TRUNC('month', CURRENT_DATE)
    ), 0)::BIGINT as this_month_requests,
    t.api_requests_reset_at as reset_at,
    v_daily_limit as daily_limit
  FROM public.tenants t
  WHERE t.id = v_tenant_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.increment_api_usage TO service_role;
GRANT EXECUTE ON FUNCTION public.get_api_usage_stats TO authenticated;
