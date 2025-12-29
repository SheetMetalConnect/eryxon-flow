-- Simple MCP Setup Migration
-- Creates a minimal, out-of-the-box MCP configuration system

-- Enable pgcrypto for secure token generation
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================================
-- MCP Endpoints Table (simplified)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mcp_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  token_prefix TEXT NOT NULL, -- First 8 chars for display (mcp_xxxx...)
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,

  CONSTRAINT mcp_endpoints_name_tenant_unique UNIQUE(tenant_id, name)
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_mcp_endpoints_token_prefix ON public.mcp_endpoints(token_prefix);
CREATE INDEX IF NOT EXISTS idx_mcp_endpoints_tenant ON public.mcp_endpoints(tenant_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.mcp_endpoints ENABLE ROW LEVEL SECURITY;

-- Admins can manage MCP endpoints for their tenant
CREATE POLICY mcp_endpoints_admin_all ON public.mcp_endpoints
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() = 'admin'
  );

-- ============================================================================
-- Simple Token Generation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_mcp_endpoint(
  p_name TEXT,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE(
  endpoint_id UUID,
  endpoint_name TEXT,
  token TEXT,
  token_prefix TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_token TEXT;
  v_token_prefix TEXT;
  v_token_hash TEXT;
  v_endpoint_id UUID;
BEGIN
  -- Get current user and tenant
  v_user_id := auth.uid();
  v_tenant_id := COALESCE(p_tenant_id, public.get_user_tenant_id());

  -- Only admins can create endpoints
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create MCP endpoints';
  END IF;

  -- Validate name
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Endpoint name is required';
  END IF;

  -- Check for duplicate name
  IF EXISTS (
    SELECT 1 FROM public.mcp_endpoints
    WHERE tenant_id = v_tenant_id AND LOWER(name) = LOWER(trim(p_name))
  ) THEN
    RAISE EXCEPTION 'An endpoint with this name already exists';
  END IF;

  -- Generate secure token: mcp_ + 32 random bytes as URL-safe base64
  v_token := 'mcp_' || replace(replace(replace(
    encode(extensions.gen_random_bytes(32), 'base64'),
    '/', '_'), '+', '-'), '=', '');

  v_token_prefix := substring(v_token from 1 for 12);
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  -- Create endpoint
  INSERT INTO public.mcp_endpoints (
    tenant_id,
    name,
    token_hash,
    token_prefix,
    created_by
  ) VALUES (
    v_tenant_id,
    trim(p_name),
    v_token_hash,
    v_token_prefix,
    v_user_id
  )
  RETURNING id INTO v_endpoint_id;

  -- Return the created endpoint with token (token only shown once!)
  RETURN QUERY SELECT
    v_endpoint_id,
    trim(p_name),
    v_token,
    v_token_prefix;
END;
$$;

-- ============================================================================
-- Regenerate Token Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.regenerate_mcp_token(
  p_endpoint_id UUID
)
RETURNS TABLE(
  endpoint_id UUID,
  endpoint_name TEXT,
  token TEXT,
  token_prefix TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_tenant_id UUID;
  v_endpoint RECORD;
  v_token TEXT;
  v_token_prefix TEXT;
  v_token_hash TEXT;
BEGIN
  v_tenant_id := public.get_user_tenant_id();

  -- Only admins can regenerate tokens
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can regenerate MCP tokens';
  END IF;

  -- Get endpoint
  SELECT * INTO v_endpoint
  FROM public.mcp_endpoints
  WHERE id = p_endpoint_id AND tenant_id = v_tenant_id;

  IF v_endpoint IS NULL THEN
    RAISE EXCEPTION 'Endpoint not found';
  END IF;

  -- Generate new token
  v_token := 'mcp_' || replace(replace(replace(
    encode(extensions.gen_random_bytes(32), 'base64'),
    '/', '_'), '+', '-'), '=', '');

  v_token_prefix := substring(v_token from 1 for 12);
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  -- Update endpoint
  UPDATE public.mcp_endpoints
  SET
    token_hash = v_token_hash,
    token_prefix = v_token_prefix
  WHERE id = p_endpoint_id;

  -- Return with new token
  RETURN QUERY SELECT
    p_endpoint_id,
    v_endpoint.name,
    v_token,
    v_token_prefix;
END;
$$;

-- ============================================================================
-- Validate Token Function (for MCP server to use)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_mcp_token(
  p_token TEXT
)
RETURNS TABLE(
  valid BOOLEAN,
  tenant_id UUID,
  endpoint_id UUID,
  endpoint_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token_hash TEXT;
  v_endpoint RECORD;
BEGIN
  -- Hash the provided token
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  -- Find matching endpoint
  SELECT e.*, t.name as tenant_name
  INTO v_endpoint
  FROM public.mcp_endpoints e
  JOIN public.tenants t ON t.id = e.tenant_id
  WHERE e.token_hash = v_token_hash AND e.enabled = true;

  IF v_endpoint IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Update usage stats
  UPDATE public.mcp_endpoints
  SET
    last_used_at = now(),
    usage_count = usage_count + 1
  WHERE id = v_endpoint.id;

  RETURN QUERY SELECT
    true,
    v_endpoint.tenant_id,
    v_endpoint.id,
    v_endpoint.name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_mcp_endpoint TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_mcp_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_mcp_token TO authenticated, anon;