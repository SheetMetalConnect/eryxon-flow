-- MQTT Publishers: Alternative to webhooks for real-time event streaming
-- Uses Unified Namespace (UNS) pattern for structured topic hierarchy

-- Create mqtt_publishers table
CREATE TABLE IF NOT EXISTS public.mqtt_publishers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Broker connection settings
  broker_url TEXT NOT NULL, -- mqtt:// or mqtts:// URL
  port INTEGER NOT NULL DEFAULT 1883,
  username TEXT,
  password TEXT, -- Encrypted in app layer

  -- Topic configuration (UNS pattern - configurable)
  -- Default pattern: {enterprise}/{site}/{area}/{cell}/{event_type}
  -- Variables: {enterprise}, {site}, {area}, {cell}, {line}, {operation}, {event}, {tenant_id}
  -- Example: "acme/factory1/fabrication/{cell}/{event}" -> "acme/factory1/fabrication/laser_cutting/operation/started"
  topic_pattern TEXT NOT NULL DEFAULT '{enterprise}/{site}/{area}/{cell}/{event}',

  -- Default values for topic variables (used when not provided in event context)
  default_enterprise TEXT DEFAULT 'eryxon',
  default_site TEXT DEFAULT 'main',
  default_area TEXT DEFAULT 'production',

  -- TLS settings
  use_tls BOOLEAN DEFAULT false,

  -- Event subscriptions (same as webhooks)
  events TEXT[] NOT NULL DEFAULT '{}',

  -- Status
  active BOOLEAN DEFAULT true,
  last_connected_at TIMESTAMPTZ,
  last_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Create mqtt_logs table for delivery tracking
CREATE TABLE IF NOT EXISTS public.mqtt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mqtt_publisher_id UUID NOT NULL REFERENCES public.mqtt_publishers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mqtt_publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mqtt_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for mqtt_publishers
DROP POLICY IF EXISTS "Users can view their tenant's mqtt publishers" ON public.mqtt_publishers;
CREATE POLICY "Users can view their tenant's mqtt publishers" ON public.mqtt_publishers
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can insert mqtt publishers" ON public.mqtt_publishers;
CREATE POLICY "Admins can insert mqtt publishers" ON public.mqtt_publishers
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update mqtt publishers" ON public.mqtt_publishers;
CREATE POLICY "Admins can update mqtt publishers" ON public.mqtt_publishers
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete mqtt publishers" ON public.mqtt_publishers;
CREATE POLICY "Admins can delete mqtt publishers" ON public.mqtt_publishers
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS policies for mqtt_logs
DROP POLICY IF EXISTS "Users can view their tenant's mqtt logs" ON public.mqtt_logs;
CREATE POLICY "Users can view their tenant's mqtt logs" ON public.mqtt_logs
  FOR SELECT USING (
    mqtt_publisher_id IN (
      SELECT id FROM mqtt_publishers WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Allow service role to insert logs
DROP POLICY IF EXISTS "Service role can insert mqtt logs" ON public.mqtt_logs;
CREATE POLICY "Service role can insert mqtt logs" ON public.mqtt_logs
  FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mqtt_publishers_tenant ON public.mqtt_publishers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mqtt_publishers_active ON public.mqtt_publishers(tenant_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_mqtt_logs_publisher ON public.mqtt_logs(mqtt_publisher_id);
CREATE INDEX IF NOT EXISTS idx_mqtt_logs_created ON public.mqtt_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mqtt_logs_event_type ON public.mqtt_logs(event_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mqtt_publisher_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS mqtt_publishers_updated_at ON public.mqtt_publishers;
CREATE TRIGGER mqtt_publishers_updated_at
  BEFORE UPDATE ON public.mqtt_publishers
  FOR EACH ROW
  EXECUTE FUNCTION update_mqtt_publisher_updated_at();

-- Clean up old logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_mqtt_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.mqtt_logs WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
