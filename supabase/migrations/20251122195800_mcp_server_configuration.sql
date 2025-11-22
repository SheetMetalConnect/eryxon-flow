-- MCP Server Configuration Schema
-- Enables UI-based configuration and monitoring of MCP server

-- Table: mcp_server_config
-- Stores MCP server configuration settings per tenant
CREATE TABLE IF NOT EXISTS mcp_server_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Server identification
  server_name TEXT NOT NULL DEFAULT 'eryxon-flow-mcp',
  server_version TEXT NOT NULL DEFAULT '2.0.0',

  -- Connection settings
  enabled BOOLEAN NOT NULL DEFAULT true,
  supabase_url TEXT NOT NULL,
  last_connected_at TIMESTAMP WITH TIME ZONE,

  -- Feature flags
  features JSONB DEFAULT '{
    "logging": true,
    "healthCheck": true,
    "autoReconnect": true
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  -- Constraints
  UNIQUE(tenant_id)
);

-- Table: mcp_server_health
-- Tracks MCP server health and connection status
CREATE TABLE IF NOT EXISTS mcp_server_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  config_id UUID REFERENCES mcp_server_config(id) ON DELETE CASCADE,

  -- Health status
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'degraded', 'unknown')),
  last_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Health metrics
  response_time_ms INTEGER,
  tools_count INTEGER,
  database_healthy BOOLEAN DEFAULT false,

  -- Error tracking
  last_error TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  consecutive_failures INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: mcp_server_logs
-- Stores MCP server activity logs for debugging and monitoring
CREATE TABLE IF NOT EXISTS mcp_server_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  config_id UUID REFERENCES mcp_server_config(id) ON DELETE CASCADE,

  -- Log details
  level TEXT NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
  message TEXT NOT NULL,
  context JSONB,

  -- Tool tracking
  tool_name TEXT,
  tool_duration_ms INTEGER,
  tool_success BOOLEAN,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index for querying
  tenant_log_time_idx BOOLEAN GENERATED ALWAYS AS (true) STORED
);

-- Indexes for performance
CREATE INDEX idx_mcp_config_tenant ON mcp_server_config(tenant_id);
CREATE INDEX idx_mcp_health_tenant ON mcp_server_health(tenant_id);
CREATE INDEX idx_mcp_health_status ON mcp_server_health(status, last_check_at);
CREATE INDEX idx_mcp_logs_tenant_time ON mcp_server_logs(tenant_id, created_at DESC);
CREATE INDEX idx_mcp_logs_level ON mcp_server_logs(level, created_at DESC);
CREATE INDEX idx_mcp_logs_tool ON mcp_server_logs(tool_name, created_at DESC) WHERE tool_name IS NOT NULL;

-- Enable RLS
ALTER TABLE mcp_server_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mcp_server_config
CREATE POLICY "Users can view their tenant's MCP config"
  ON mcp_server_config FOR SELECT
  USING (tenant_id = (get_tenant_info()).id);

CREATE POLICY "Admins can insert MCP config"
  ON mcp_server_config FOR INSERT
  WITH CHECK (
    tenant_id = (get_tenant_info()).id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.tenant_id = (get_tenant_info()).id
    )
  );

CREATE POLICY "Admins can update MCP config"
  ON mcp_server_config FOR UPDATE
  USING (
    tenant_id = (get_tenant_info()).id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.tenant_id = (get_tenant_info()).id
    )
  );

-- RLS Policies for mcp_server_health
CREATE POLICY "Users can view their tenant's MCP health"
  ON mcp_server_health FOR SELECT
  USING (tenant_id = (get_tenant_info()).id);

CREATE POLICY "Service role can manage MCP health"
  ON mcp_server_health FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for mcp_server_logs
CREATE POLICY "Admins can view their tenant's MCP logs"
  ON mcp_server_logs FOR SELECT
  USING (
    tenant_id = (get_tenant_info()).id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.tenant_id = (get_tenant_info()).id
    )
  );

CREATE POLICY "Service role can insert MCP logs"
  ON mcp_server_logs FOR INSERT
  WITH CHECK (true);

-- Function: Get MCP server configuration
CREATE OR REPLACE FUNCTION get_mcp_server_config()
RETURNS TABLE (
  id UUID,
  server_name TEXT,
  server_version TEXT,
  enabled BOOLEAN,
  features JSONB,
  health_status TEXT,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  last_check_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.server_name,
    c.server_version,
    c.enabled,
    c.features,
    h.status as health_status,
    c.last_connected_at,
    h.last_check_at
  FROM mcp_server_config c
  LEFT JOIN LATERAL (
    SELECT status, last_check_at
    FROM mcp_server_health
    WHERE config_id = c.id
    ORDER BY last_check_at DESC
    LIMIT 1
  ) h ON true
  WHERE c.tenant_id = (get_tenant_info()).id;
END;
$$;

-- Function: Update MCP server health
CREATE OR REPLACE FUNCTION update_mcp_server_health(
  p_tenant_id UUID,
  p_status TEXT,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_tools_count INTEGER DEFAULT NULL,
  p_database_healthy BOOLEAN DEFAULT NULL,
  p_error TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_config_id UUID;
  v_health_id UUID;
  v_consecutive_failures INTEGER := 0;
BEGIN
  -- Get config ID
  SELECT id INTO v_config_id
  FROM mcp_server_config
  WHERE tenant_id = p_tenant_id;

  -- If no config exists, create one
  IF v_config_id IS NULL THEN
    INSERT INTO mcp_server_config (tenant_id, supabase_url)
    VALUES (p_tenant_id, current_setting('app.supabase_url', true))
    RETURNING id INTO v_config_id;
  END IF;

  -- Calculate consecutive failures
  IF p_status != 'online' THEN
    SELECT COALESCE(consecutive_failures, 0) + 1 INTO v_consecutive_failures
    FROM mcp_server_health
    WHERE config_id = v_config_id
    ORDER BY last_check_at DESC
    LIMIT 1;
  END IF;

  -- Insert health record
  INSERT INTO mcp_server_health (
    tenant_id,
    config_id,
    status,
    response_time_ms,
    tools_count,
    database_healthy,
    last_error,
    last_error_at,
    consecutive_failures
  ) VALUES (
    p_tenant_id,
    v_config_id,
    p_status,
    p_response_time_ms,
    p_tools_count,
    p_database_healthy,
    p_error,
    CASE WHEN p_error IS NOT NULL THEN NOW() ELSE NULL END,
    v_consecutive_failures
  )
  RETURNING id INTO v_health_id;

  -- Update last_connected_at if online
  IF p_status = 'online' THEN
    UPDATE mcp_server_config
    SET last_connected_at = NOW()
    WHERE id = v_config_id;
  END IF;

  RETURN v_health_id;
END;
$$;

-- Function: Log MCP server activity
CREATE OR REPLACE FUNCTION log_mcp_server_activity(
  p_tenant_id UUID,
  p_level TEXT,
  p_message TEXT,
  p_context JSONB DEFAULT NULL,
  p_tool_name TEXT DEFAULT NULL,
  p_tool_duration_ms INTEGER DEFAULT NULL,
  p_tool_success BOOLEAN DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_config_id UUID;
  v_log_id UUID;
BEGIN
  -- Get config ID
  SELECT id INTO v_config_id
  FROM mcp_server_config
  WHERE tenant_id = p_tenant_id;

  -- Insert log
  INSERT INTO mcp_server_logs (
    tenant_id,
    config_id,
    level,
    message,
    context,
    tool_name,
    tool_duration_ms,
    tool_success
  ) VALUES (
    p_tenant_id,
    v_config_id,
    p_level,
    p_message,
    p_context,
    p_tool_name,
    p_tool_duration_ms,
    p_tool_success
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON mcp_server_config TO authenticated;
GRANT SELECT ON mcp_server_health TO authenticated;
GRANT SELECT ON mcp_server_logs TO authenticated;
GRANT ALL ON mcp_server_config TO service_role;
GRANT ALL ON mcp_server_health TO service_role;
GRANT ALL ON mcp_server_logs TO service_role;

-- Comments
COMMENT ON TABLE mcp_server_config IS 'MCP server configuration settings per tenant';
COMMENT ON TABLE mcp_server_health IS 'MCP server health monitoring and connection status';
COMMENT ON TABLE mcp_server_logs IS 'MCP server activity logs for debugging and monitoring';
COMMENT ON FUNCTION get_mcp_server_config() IS 'Retrieves MCP server configuration with latest health status';
COMMENT ON FUNCTION update_mcp_server_health(UUID, TEXT, INTEGER, INTEGER, BOOLEAN, TEXT) IS 'Updates MCP server health status and metrics';
COMMENT ON FUNCTION log_mcp_server_activity(UUID, TEXT, TEXT, JSONB, TEXT, INTEGER, BOOLEAN) IS 'Logs MCP server activity for monitoring';
