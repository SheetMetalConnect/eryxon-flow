-- MCP Authentication Keys Migration
-- Enables per-tenant MCP authentication with same security model as REST API

-- Table: mcp_authentication_keys
-- Stores MCP authentication keys per tenant (similar to api_authentication_keys)
CREATE TABLE IF NOT EXISTS mcp_authentication_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Key information
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Environment (like API keys)
  environment TEXT NOT NULL CHECK (environment IN ('live', 'test')) DEFAULT 'live',

  -- Permissions - granular tool access control
  allowed_tools JSONB DEFAULT '["*"]'::jsonb,
  rate_limit INTEGER DEFAULT 100, -- requests per minute

  -- Usage tracking
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  -- Constraints
  UNIQUE(tenant_id, name)
);

-- Table: mcp_key_usage_logs
-- Audit trail for MCP key usage
CREATE TABLE IF NOT EXISTS mcp_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_id UUID REFERENCES mcp_authentication_keys(id) ON DELETE SET NULL,

  -- Request details
  tool_name TEXT NOT NULL,
  tool_arguments JSONB,

  -- Response details
  success BOOLEAN NOT NULL,
  error_message TEXT,
  response_time_ms INTEGER,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes for performance
CREATE INDEX idx_mcp_auth_keys_tenant ON mcp_authentication_keys(tenant_id);
CREATE INDEX idx_mcp_auth_keys_hash ON mcp_authentication_keys(key_hash);
CREATE INDEX idx_mcp_auth_keys_enabled ON mcp_authentication_keys(enabled) WHERE enabled = true;
CREATE INDEX idx_mcp_usage_logs_tenant ON mcp_key_usage_logs(tenant_id, created_at DESC);
CREATE INDEX idx_mcp_usage_logs_key ON mcp_key_usage_logs(key_id, created_at DESC);
CREATE INDEX idx_mcp_usage_logs_tool ON mcp_key_usage_logs(tool_name, created_at DESC);

-- Enable RLS
ALTER TABLE mcp_authentication_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_key_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mcp_authentication_keys
CREATE POLICY "Users can view their tenant's MCP keys"
  ON mcp_authentication_keys FOR SELECT
  USING (tenant_id = (get_tenant_info()).id);

CREATE POLICY "Admins can create MCP keys"
  ON mcp_authentication_keys FOR INSERT
  WITH CHECK (
    tenant_id = (get_tenant_info()).id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.tenant_id = (get_tenant_info()).id
    )
  );

CREATE POLICY "Admins can update MCP keys"
  ON mcp_authentication_keys FOR UPDATE
  USING (
    tenant_id = (get_tenant_info()).id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.tenant_id = (get_tenant_info()).id
    )
  );

CREATE POLICY "Admins can delete MCP keys"
  ON mcp_authentication_keys FOR DELETE
  USING (
    tenant_id = (get_tenant_info()).id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.tenant_id = (get_tenant_info()).id
    )
  );

-- RLS Policies for mcp_key_usage_logs
CREATE POLICY "Admins can view their tenant's MCP usage logs"
  ON mcp_key_usage_logs FOR SELECT
  USING (
    tenant_id = (get_tenant_info()).id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.tenant_id = (get_tenant_info()).id
    )
  );

CREATE POLICY "Service role can insert MCP usage logs"
  ON mcp_key_usage_logs FOR INSERT
  WITH CHECK (true);

-- Function: Generate MCP key
CREATE OR REPLACE FUNCTION generate_mcp_key(
  p_tenant_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_environment TEXT DEFAULT 'live',
  p_allowed_tools JSONB DEFAULT '["*"]'::jsonb,
  p_created_by UUID DEFAULT NULL
) RETURNS TABLE (
  key_id UUID,
  api_key TEXT,
  key_prefix TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_key_id UUID;
  v_raw_key TEXT;
  v_key_hash TEXT;
  v_prefix TEXT;
  v_environment_prefix TEXT;
BEGIN
  -- Validate environment
  IF p_environment NOT IN ('live', 'test') THEN
    RAISE EXCEPTION 'Environment must be live or test';
  END IF;

  -- Set environment prefix
  v_environment_prefix := CASE p_environment
    WHEN 'live' THEN 'mcp_live_'
    WHEN 'test' THEN 'mcp_test_'
  END;

  -- Generate random key (32 characters after prefix)
  v_raw_key := v_environment_prefix || encode(gen_random_bytes(24), 'base64');
  v_raw_key := replace(v_raw_key, '/', '_');
  v_raw_key := replace(v_raw_key, '+', '-');
  v_raw_key := substring(v_raw_key, 1, length(v_environment_prefix) + 32);

  -- Create prefix for identification (first 12 chars of key)
  v_prefix := substring(v_raw_key, 1, 12);

  -- Hash the key using bcrypt (cost factor 10)
  v_key_hash := crypt(v_raw_key, gen_salt('bf', 10));

  -- Insert the key
  INSERT INTO mcp_authentication_keys (
    tenant_id,
    key_hash,
    key_prefix,
    name,
    description,
    environment,
    allowed_tools,
    created_by
  ) VALUES (
    p_tenant_id,
    v_key_hash,
    v_prefix,
    p_name,
    p_description,
    p_environment,
    p_allowed_tools,
    p_created_by
  )
  RETURNING id INTO v_key_id;

  -- Return the key details (key is only shown once!)
  RETURN QUERY SELECT v_key_id, v_raw_key, v_prefix;
END;
$$;

-- Function: Validate MCP key
CREATE OR REPLACE FUNCTION validate_mcp_key(
  p_api_key TEXT
) RETURNS TABLE (
  tenant_id UUID,
  key_id UUID,
  allowed_tools JSONB,
  rate_limit INTEGER,
  environment TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_key_record RECORD;
BEGIN
  -- Find matching key by comparing hash
  SELECT
    ak.id,
    ak.tenant_id,
    ak.allowed_tools,
    ak.rate_limit,
    ak.environment,
    ak.enabled
  INTO v_key_record
  FROM mcp_authentication_keys ak
  WHERE ak.key_hash = crypt(p_api_key, ak.key_hash)
    AND ak.enabled = true;

  -- Check if key was found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or disabled MCP key';
  END IF;

  -- Update last_used_at and usage_count
  UPDATE mcp_authentication_keys
  SET
    last_used_at = NOW(),
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE id = v_key_record.id;

  -- Return key details
  RETURN QUERY SELECT
    v_key_record.tenant_id,
    v_key_record.id,
    v_key_record.allowed_tools,
    v_key_record.rate_limit,
    v_key_record.environment;
END;
$$;

-- Function: Check tool permission
CREATE OR REPLACE FUNCTION check_mcp_tool_permission(
  p_key_id UUID,
  p_tool_name TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_allowed_tools JSONB;
BEGIN
  -- Get allowed tools for this key
  SELECT allowed_tools INTO v_allowed_tools
  FROM mcp_authentication_keys
  WHERE id = p_key_id;

  -- Check if all tools are allowed (wildcard)
  IF v_allowed_tools @> '["*"]'::jsonb THEN
    RETURN true;
  END IF;

  -- Check if specific tool is allowed
  RETURN v_allowed_tools @> to_jsonb(ARRAY[p_tool_name]);
END;
$$;

-- Function: Log MCP key usage
CREATE OR REPLACE FUNCTION log_mcp_key_usage(
  p_tenant_id UUID,
  p_key_id UUID,
  p_tool_name TEXT,
  p_tool_arguments JSONB DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_log_id UUID;
  v_key_name TEXT;
  v_description TEXT;
BEGIN
  -- Insert into MCP-specific usage logs
  INSERT INTO mcp_key_usage_logs (
    tenant_id,
    key_id,
    tool_name,
    tool_arguments,
    success,
    error_message,
    response_time_ms,
    ip_address,
    user_agent
  ) VALUES (
    p_tenant_id,
    p_key_id,
    p_tool_name,
    p_tool_arguments,
    p_success,
    p_error_message,
    p_response_time_ms,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  -- Get key name for activity log
  SELECT name INTO v_key_name
  FROM mcp_authentication_keys
  WHERE id = p_key_id;

  -- Create description for activity log
  v_description := 'MCP tool "' || p_tool_name || '" ' ||
    CASE WHEN p_success THEN 'executed successfully' ELSE 'failed' END ||
    ' via key "' || COALESCE(v_key_name, 'Unknown') || '"' ||
    CASE WHEN p_response_time_ms IS NOT NULL THEN ' (' || p_response_time_ms || 'ms)' ELSE '' END;

  -- Also log to main activity_log table for unified audit trail
  INSERT INTO activity_log (
    tenant_id,
    user_id, -- NULL for MCP calls (not a user session)
    user_email,
    user_name,
    action,
    entity_type,
    entity_id,
    entity_name,
    description,
    changes,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_tenant_id,
    NULL, -- MCP calls are not tied to a specific user
    'MCP Server',
    'MCP Server',
    CASE WHEN p_success THEN 'mcp_execute' ELSE 'mcp_error' END,
    'mcp_tool',
    v_log_id::TEXT,
    p_tool_name,
    v_description,
    NULL,
    jsonb_build_object(
      'key_id', p_key_id,
      'key_name', v_key_name,
      'tool_name', p_tool_name,
      'tool_arguments', p_tool_arguments,
      'success', p_success,
      'error_message', p_error_message,
      'response_time_ms', p_response_time_ms
    ),
    p_ip_address,
    p_user_agent
  );

  RETURN v_log_id;
END;
$$;

-- Function: Get MCP key statistics
CREATE OR REPLACE FUNCTION get_mcp_key_stats(
  p_key_id UUID
) RETURNS TABLE (
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  avg_response_time_ms NUMERIC,
  last_24h_requests BIGINT,
  most_used_tools JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE success = true)::BIGINT as successful_requests,
    COUNT(*) FILTER (WHERE success = false)::BIGINT as failed_requests,
    AVG(response_time_ms)::NUMERIC as avg_response_time_ms,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::BIGINT as last_24h_requests,
    (
      SELECT jsonb_agg(jsonb_build_object('tool', tool_name, 'count', count))
      FROM (
        SELECT tool_name, COUNT(*) as count
        FROM mcp_key_usage_logs
        WHERE key_id = p_key_id
        GROUP BY tool_name
        ORDER BY count DESC
        LIMIT 5
      ) top_tools
    ) as most_used_tools
  FROM mcp_key_usage_logs
  WHERE key_id = p_key_id;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON mcp_authentication_keys TO authenticated;
GRANT SELECT ON mcp_key_usage_logs TO authenticated;
GRANT ALL ON mcp_authentication_keys TO service_role;
GRANT ALL ON mcp_key_usage_logs TO service_role;

-- Comments
COMMENT ON TABLE mcp_authentication_keys IS 'Per-tenant MCP authentication keys with granular permissions';
COMMENT ON TABLE mcp_key_usage_logs IS 'Audit trail for MCP key usage and tool calls';
COMMENT ON FUNCTION generate_mcp_key(UUID, TEXT, TEXT, TEXT, JSONB, UUID) IS 'Generates a new MCP authentication key for a tenant';
COMMENT ON FUNCTION validate_mcp_key(TEXT) IS 'Validates an MCP key and returns tenant and permission details';
COMMENT ON FUNCTION check_mcp_tool_permission(UUID, TEXT) IS 'Checks if a key has permission to use a specific tool';
COMMENT ON FUNCTION log_mcp_key_usage(UUID, UUID, TEXT, JSONB, BOOLEAN, TEXT, INTEGER, INET, TEXT) IS 'Logs MCP key usage for audit trail';
COMMENT ON FUNCTION get_mcp_key_stats(UUID) IS 'Returns usage statistics for an MCP key';
