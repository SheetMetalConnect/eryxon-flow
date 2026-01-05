---
title: "MCP Integration Guide"
description: "Documentation for MCP Integration Guide"
---

## Overview

The Model Context Protocol (MCP) Server enables AI assistants like Claude to directly interact with your manufacturing data in Eryxon Flow. This integration provides secure, per-tenant authentication and comprehensive audit trails for all MCP operations.

## Features

### Per-Tenant Authentication
- Each tenant generates unique MCP authentication keys
- Keys prefixed with `mcp_live_` (production) or `mcp_test_` (development)
- Bcrypt hashing (cost factor 10) for secure key storage
- Same security model as REST API keys

### Granular Permissions
- Configure which MCP tools each key can access
- Wildcard support (`["*"]`) for full access
- Per-tool restrictions for enhanced security
- Rate limiting per key (default: 100 requests/minute)

### Comprehensive Audit Trail
- Every MCP request logged to activity log
- Visible alongside user actions and API calls
- Real-time toast notifications for MCP events
- Detailed metadata: tool name, arguments, response time, success/failure

### Real-time Monitoring
- MCP server connection status indicator in admin sidebar
- Health monitoring with response time tracking
- Activity logs with filtering and search
- Usage statistics per key

## Quick Start

### 1. Generate an MCP Key

**Via UI:**
1. Navigate to **Config → MCP Keys** in the admin panel
2. Click **"Generate New Key"**
3. Configure the key:
   - **Name**: Descriptive name (e.g., "Production Claude Integration")
   - **Environment**: Live (production) or Test (development)
   - **Tools**: Allow all tools or select specific tools
   - **Description**: Optional notes about the key's purpose
4. Click **"Generate Key"**
5. **Important**: Copy the generated key immediately - it will only be shown once!

**Via SQL:**
```sql
SELECT * FROM generate_mcp_key(
  p_tenant_id := 'your-tenant-id',
  p_name := 'Production Key',
  p_description := 'Claude integration for production',
  p_environment := 'live',
  p_allowed_tools := '["*"]'::jsonb,
  p_created_by := 'your-user-id'
);
```

### 2. Configure MCP Server

**Navigate to** **Config → MCP Server**:

- **Server Name**: Name for your MCP server (default: `eryxon-flow-mcp`)
- **Server Version**: Current version (2.1.0)
- **Supabase URL**: Your Supabase project URL
- **Features**:
  - **Activity Logging**: Log all MCP activities (recommended: enabled)
  - **Health Checks**: Periodic health monitoring (recommended: enabled)
  - **Auto Reconnect**: Reconnect on connection loss (recommended: enabled)

### 3. Set Up MCP Client

**For Claude Desktop:**

1. Build the MCP server:
   ```bash
   cd mcp-server
   npm install
   npm run build
   ```

2. Configure Claude Desktop (`claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "eryxon-flow": {
         "command": "node",
         "args": ["/path/to/eryxon-flow/mcp-server/dist/index.js"],
         "env": {
           "SUPABASE_URL": "https://your-project.supabase.co",
           "SUPABASE_SERVICE_KEY": "your-service-role-key"
         }
       }
     }
   }
   ```

3. Use your MCP key in requests:
   ```json
   {
     "params": {
       "name": "fetch_jobs",
       "arguments": {
         "status": "in_progress"
       },
       "_meta": {
         "apiKey": "mcp_live_your_key_here"
       }
     }
   }
   ```

## Available MCP Tools

The MCP server provides 20 tools across 7 domains:

### Jobs Management
- `fetch_jobs` - Retrieve jobs with filtering
- `create_job` - Create new jobs
- `update_job` - Update job details
- `start_job` - Start job execution
- `stop_job` - Stop running jobs
- `complete_job` - Mark jobs as complete
- `resume_job` - Resume paused jobs

### Parts Tracking
- `fetch_parts` - Get parts data
- `update_part` - Update part progress

### Tasks & Operations
- `fetch_tasks` - Query tasks
- `update_task` - Modify task assignments
- `fetch_operations` - Get operation data

### Issues & NCRs
- `fetch_issues` - View production issues
- `fetch_ncrs` - Get non-conformance reports

### Analytics
- `get_dashboard_stats` - Retrieve dashboard metrics
- `get_qrm_data` - Get Quick Response Manufacturing data

## Security Model

### Authentication Flow

1. **API Key Extraction**: MCP server extracts key from `_meta.apiKey` parameter
2. **Validation**: Key validated against bcrypt hash in database
3. **Tenant Context**: Tenant ID extracted and set for RLS enforcement
4. **Permission Check**: Verify key has access to requested tool
5. **Execution**: Tool executed with tenant-scoped database access
6. **Audit Logging**: Request logged to activity log and MCP usage logs

### Key Management Best Practices

**Do:**
- ✅ Generate separate keys for production and development
- ✅ Use descriptive names for easy identification
- ✅ Restrict tool access for specific use cases
- ✅ Rotate keys periodically
- ✅ Disable compromised keys immediately
- ✅ Monitor usage statistics regularly

**Don't:**
- ❌ Share keys across environments
- ❌ Commit keys to version control
- ❌ Use overly permissive keys in production
- ❌ Reuse keys across different applications
- ❌ Forget to copy the key when first generated

### RLS (Row Level Security)

All MCP database operations enforce PostgreSQL Row Level Security:
- Every query automatically filtered by tenant_id
- Impossible to access other tenant's data
- Service role key required for MCP server operation
- Per-tenant isolation guaranteed at database level

## Monitoring & Analytics

### Connection Status

The **MCP Server Status** indicator in the admin sidebar shows:
- **Online** (green): Server connected and responding
- **Offline** (red): Server not responding
- **Degraded** (yellow): Server responding slowly or with errors
- **Unknown** (gray): No recent health data

**Tooltip shows:**
- Last check timestamp
- Response time (milliseconds)
- Error message (if applicable)

### Activity Log

**Location**: Admin → Activity

**MCP Events Display:**
- **Action**: `mcp_execute` (success) or `mcp_error` (failure)
- **Entity**: `mcp_tool` with tool name
- **User**: "MCP Server"
- **Icon**: Lightning bolt (⚡) for execute, warning triangle for errors
- **Color**: Purple for execute, red for errors

**Metadata Includes:**
- Key ID and name
- Tool name and arguments
- Success/failure status
- Error message (if failed)
- Response time in milliseconds

### Real-time Toast Notifications

Toast notifications appear in the admin panel when:
- **MCP tool executed successfully**: Purple toast with tool name and response time
- **MCP tool failed**: Red toast with error message

**Example Success Toast:**
```
⚡ MCP Tool Executed
Tool "fetch_jobs" executed successfully
Response time: 45ms
```

**Example Error Toast:**
```
⚠ MCP Tool Failed
Tool "update_job" execution failed
Error: Job not found
```

### Usage Statistics

**Location**: Config → MCP Keys (view key details)

**Statistics Per Key:**
- Total requests
- Successful requests
- Failed requests
- Average response time
- Last 24h request count
- Most used tools
- Last used timestamp

## Troubleshooting

### MCP Server Not Connecting

**Check:**
1. Is the MCP server built? (`cd mcp-server && npm run build`)
2. Is the Supabase URL correct in config?
3. Is the service role key valid?
4. Is the MCP server enabled in settings?

**Solution:**
- Verify environment variables
- Test connection via Config → MCP Server → "Test Connection"
- Check Supabase logs for errors

### Authentication Failures

**Error**: "Invalid or disabled MCP key"

**Causes:**
- Key is disabled in admin panel
- Key was typed incorrectly
- Key expired or deleted

**Solution:**
- Verify key is enabled in Config → MCP Keys
- Generate a new key if needed
- Ensure `_meta.apiKey` is set in request

### Permission Denied Errors

**Error**: "Tool not allowed for this key"

**Cause:**
- Key doesn't have permission for the requested tool
- Tool restrictions configured on the key

**Solution:**
- Check allowed tools in Config → MCP Keys
- Use a key with broader permissions, or
- Update key permissions to include the tool

### Rate Limiting

**Error**: "Rate limit exceeded"

**Cause:**
- Key exceeded configured rate limit (default: 100 req/min)

**Solution:**
- Increase rate limit for the key in Config → MCP Keys
- Implement request throttling in your application
- Distribute requests across multiple keys

## Advanced Configuration

### Custom Tool Permissions

**Example**: Key that can only fetch data (no mutations):
```sql
SELECT * FROM generate_mcp_key(
  p_tenant_id := 'your-tenant-id',
  p_name := 'Read-Only Analytics Key',
  p_allowed_tools := '["fetch_jobs", "fetch_parts", "fetch_tasks", "get_dashboard_stats"]'::jsonb
);
```

### Higher Rate Limits for Production

**Via SQL**:
```sql
UPDATE mcp_authentication_keys
SET rate_limit = 500
WHERE id = 'your-key-id'
  AND tenant_id = (get_tenant_info()).id;
```

### Key Rotation

**Best Practice**: Rotate keys every 90 days

1. Generate new key with same permissions
2. Update MCP client configuration
3. Test with new key
4. Disable old key
5. Monitor for any failed requests
6. Delete old key after 30 days

## Database Schema

### Tables

**`mcp_authentication_keys`**
- Per-tenant MCP keys with bcrypt hashing
- Granular tool permissions
- Environment separation (live/test)
- Usage tracking

**`mcp_key_usage_logs`**
- Audit trail for all MCP requests
- Request details: tool, arguments, success/failure
- Performance metrics: response time
- IP address and user agent tracking

**`mcp_server_config`**
- Server configuration per tenant
- Feature flags (logging, health checks, auto-reconnect)
- Connection tracking

**`mcp_server_health`**
- Health monitoring data
- Status: online, offline, degraded
- Response time tracking
- Error messages

**`mcp_server_logs`**
- Server activity logs
- Event types and messages
- Metadata in JSONB format

**`activity_log`** (enhanced)
- Unified audit trail including MCP actions
- MCP events: `mcp_execute`, `mcp_error`
- Entity type: `mcp_tool`
- Rich metadata for MCP requests

### Functions

**`generate_mcp_key()`**
- Securely generates new MCP authentication keys
- Returns key only once for security

**`validate_mcp_key()`**
- Validates MCP key and returns tenant/permissions
- Updates last_used_at and usage_count

**`check_mcp_tool_permission()`**
- Checks if key has access to specific tool
- Supports wildcard permissions

**`log_mcp_key_usage()`**
- Logs MCP request to usage logs
- Also logs to activity_log for unified audit trail

**`get_mcp_key_stats()`**
- Returns usage statistics for a key
- Aggregated metrics and top tools

## Migration Guide

### From Shared Service Key

**Before** (v2.0): Single shared service role key for all tenants

**After** (v2.1): Per-tenant MCP authentication keys

**Steps:**
1. Apply migrations:
   - `20251122195800_mcp_server_configuration.sql`
   - `20251122203000_mcp_authentication_keys.sql`
2. Generate MCP key for each tenant
3. Update MCP client configurations with tenant-specific keys
4. Remove shared service role key from client configs
5. Monitor activity logs for authentication errors

## API Reference

### MCP Request Format

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "fetch_jobs",
    "arguments": {
      "status": "in_progress",
      "limit": 50
    },
    "_meta": {
      "apiKey": "mcp_live_abc123..."
    }
  },
  "id": 1
}
```

### Response Format

**Success:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 5 jobs in progress: ..."
      }
    ]
  },
  "id": 1
}
```

**Error:**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Invalid or disabled MCP key",
    "data": {
      "type": "authentication_error"
    }
  },
  "id": 1
}
```

## Support

For issues or questions about MCP integration:
1. Check the Activity Log for error messages
2. Review MCP server logs in Config → MCP Server → Logs
3. Consult the MCP Server README: `/mcp-server/README.md`
4. Contact support with:
   - Tenant ID
   - Key prefix (not full key!)
   - Error message
   - Timestamp of issue

**Related Documentation**:
- [API Documentation](./API_DOCUMENTATION.md)
- [Edge Functions Setup](./EDGE_FUNCTIONS_SETUP.md)
- [How the App Works](./HOW-THE-APP-WORKS.md)
