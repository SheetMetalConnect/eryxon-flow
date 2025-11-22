-- MCP Server Configuration Tables
-- This migration creates the infrastructure for managing MCP (Model Context Protocol) server configuration

-- Table: mcp_server_config
-- Purpose: Store MCP server configuration per tenant
CREATE TABLE IF NOT EXISTS mcp_server_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  server_name TEXT NOT NULL DEFAULT 'eryxon-flow-mcp',
  server_version TEXT NOT NULL DEFAULT '2.1.0',
  enabled BOOLEAN NOT NULL DEFAULT true,
  supabase_url TEXT NOT NULL,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  features JSONB DEFAULT '{"logging": true, "healthCheck": true, "autoReconnect": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE mcp_server_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mcp_server_config
CREATE POLICY "Users can view their tenant's MCP config"
  ON mcp_server_config FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage their tenant's MCP config"
  ON mcp_server_config FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Table: mcp_server_health
-- Purpose: Track MCP server health status
CREATE TABLE IF NOT EXISTS mcp_server_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'degraded')),
  last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mcp_server_health ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mcp_server_health
CREATE POLICY "Users can view their tenant's MCP health"
  ON mcp_server_health FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Service role can insert MCP health"
  ON mcp_server_health FOR INSERT
  WITH CHECK (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_mcp_server_health_tenant_id ON mcp_server_health(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mcp_server_health_last_check ON mcp_server_health(last_check DESC);

-- Table: mcp_server_logs
-- Purpose: Log MCP server activities and events
CREATE TABLE IF NOT EXISTS mcp_server_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mcp_server_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mcp_server_logs
CREATE POLICY "Users can view their tenant's MCP logs"
  ON mcp_server_logs FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Service role can insert MCP logs"
  ON mcp_server_logs FOR INSERT
  WITH CHECK (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_mcp_server_logs_tenant_id ON mcp_server_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mcp_server_logs_created_at ON mcp_server_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_server_logs_event_type ON mcp_server_logs(event_type);

-- Function: get_mcp_server_config
-- Purpose: Get MCP server configuration for current tenant
CREATE OR REPLACE FUNCTION get_mcp_server_config()
RETURNS TABLE (
  id UUID,
  server_name TEXT,
  server_version TEXT,
  enabled BOOLEAN,
  supabase_url TEXT,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  features JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get current user's tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM profiles
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User not found or has no tenant';
  END IF;

  -- Return config for this tenant
  RETURN QUERY
  SELECT
    msc.id,
    msc.server_name,
    msc.server_version,
    msc.enabled,
    msc.supabase_url,
    msc.last_connected_at,
    msc.features
  FROM mcp_server_config msc
  WHERE msc.tenant_id = v_tenant_id;
END;
$$;

-- Function: update_mcp_server_health
-- Purpose: Update MCP server health status
CREATE OR REPLACE FUNCTION update_mcp_server_health(
  p_tenant_id UUID,
  p_status TEXT,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_health_id UUID;
BEGIN
  -- Validate status
  IF p_status NOT IN ('online', 'offline', 'degraded') THEN
    RAISE EXCEPTION 'Invalid status. Must be: online, offline, or degraded';
  END IF;

  -- Insert health record
  INSERT INTO mcp_server_health (
    tenant_id,
    status,
    last_check,
    response_time_ms,
    error_message,
    metadata
  )
  VALUES (
    p_tenant_id,
    p_status,
    NOW(),
    p_response_time_ms,
    p_error_message,
    p_metadata
  )
  RETURNING id INTO v_health_id;

  -- Update last_connected_at in config if status is online
  IF p_status = 'online' THEN
    UPDATE mcp_server_config
    SET last_connected_at = NOW()
    WHERE tenant_id = p_tenant_id;
  END IF;

  RETURN v_health_id;
END;
$$;

-- Function: log_mcp_server_activity
-- Purpose: Log MCP server activity
CREATE OR REPLACE FUNCTION log_mcp_server_activity(
  p_tenant_id UUID,
  p_event_type TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Insert log record
  INSERT INTO mcp_server_logs (
    tenant_id,
    event_type,
    message,
    metadata
  )
  VALUES (
    p_tenant_id,
    p_event_type,
    p_message,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_mcp_server_config() TO authenticated;
GRANT EXECUTE ON FUNCTION update_mcp_server_health(UUID, TEXT, INTEGER, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION log_mcp_server_activity(UUID, TEXT, TEXT, JSONB) TO service_role;

-- Comments
COMMENT ON TABLE mcp_server_config IS 'MCP server configuration per tenant';
COMMENT ON TABLE mcp_server_health IS 'MCP server health monitoring data';
COMMENT ON TABLE mcp_server_logs IS 'MCP server activity logs';
COMMENT ON FUNCTION get_mcp_server_config() IS 'Get MCP server configuration for current tenant';
COMMENT ON FUNCTION update_mcp_server_health(UUID, TEXT, INTEGER, TEXT, JSONB) IS 'Update MCP server health status';
COMMENT ON FUNCTION log_mcp_server_activity(UUID, TEXT, TEXT, JSONB) IS 'Log MCP server activity';
