-- The MCP server authenticates with its own bearer and service role (see mcp-server/README.md);
-- the per-key tables, endpoints and health rows were never read by it.
DROP TABLE IF EXISTS
  public.mcp_key_usage_logs, public.mcp_authentication_keys, public.mcp_endpoints,
  public.mcp_server_logs, public.mcp_server_health, public.mcp_server_config CASCADE;

DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'check_mcp_tool_permission','create_mcp_endpoint','generate_mcp_key','get_mcp_key_stats',
      'get_mcp_server_config','log_mcp_key_usage','log_mcp_server_activity','regenerate_mcp_token',
      'update_mcp_server_health','validate_mcp_key','validate_mcp_token')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', f.sig);
  END LOOP;
END $$;
