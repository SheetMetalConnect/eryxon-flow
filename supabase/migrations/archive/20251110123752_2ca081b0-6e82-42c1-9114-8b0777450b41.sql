-- Create API keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

-- Create webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret_key TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create webhook_logs table for tracking deliveries
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Admins can manage API keys in their tenant"
  ON public.api_keys
  FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin'::app_role);

-- RLS Policies for webhooks
CREATE POLICY "Admins can manage webhooks in their tenant"
  ON public.webhooks
  FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin'::app_role);

-- RLS Policies for webhook_logs
CREATE POLICY "Admins can view webhook logs in their tenant"
  ON public.webhook_logs
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM public.webhooks WHERE tenant_id = get_user_tenant_id()
    ) AND get_user_role() = 'admin'::app_role
  );

-- Indexes for performance
CREATE INDEX idx_api_keys_tenant ON public.api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash) WHERE active = true;
CREATE INDEX idx_webhooks_tenant ON public.webhooks(tenant_id);
CREATE INDEX idx_webhook_logs_webhook ON public.webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created ON public.webhook_logs(created_at DESC);