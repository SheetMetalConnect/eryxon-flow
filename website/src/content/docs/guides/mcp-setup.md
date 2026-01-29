---
title: MCP Server Setup Guide
description: Complete guide to setting up and deploying the Eryxon Flow MCP Server for Claude Desktop integration.
---

The MCP (Model Context Protocol) server enables Claude Desktop to interact with your Eryxon Flow deployment using natural language. This guide covers both local development and production deployment.

## Overview

**What is the MCP Server?**
- Provides 55 AI tools across 9 modules for manufacturing operations
- Enables natural language interaction with jobs, parts, operations, quality, and analytics
- Optional component - your application works perfectly without it
- Designed for developers and power users who want AI assistant integration

**Architecture:**
```
Claude Desktop (User)
  ↓ MCP Protocol (stdio/SSE)
MCP Server (Local or Hosted)
  ↓ REST API or Direct Supabase
Eryxon Flow Database
  ↓ RLS (Row-Level Security)
Your Data
```

## Deployment Modes

### Mode 1: Local Development (Self-Hosted)

Best for: Single-tenant self-hosted deployments, development

**Requirements:**
- Node.js 18+
- Direct access to Supabase database
- Service role key

**Setup:**

1. **Build the server:**
```bash
cd mcp-server
npm install
npm run build
```

2. **Configure environment:**
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGc..."  # Service role key
```

3. **Start the server:**
```bash
npm start
```

4. **Configure Claude Desktop:**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/absolute/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key"
      }
    }
  }
}
```

5. **Restart Claude Desktop**

You should see "Eryxon Flow MCP Server v2.5.0" with 55 tools available.

---

### Mode 2: Cloud Deployment (Multi-Tenant)

Best for: SaaS deployments, multiple users, hosted environments

**Requirements:**
- Railway, Fly.io, or similar platform
- Upstash Redis (for caching)
- Eryxon Flow API endpoint

#### Option A: Railway (Recommended)

**Why Railway?**
- Zero-config deployments
- Automatic HTTPS
- Built-in monitoring
- $5/month starter plan

**Steps:**

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
railway login
```

2. **Deploy:**
```bash
cd mcp-server
railway init
railway up
```

3. **Set environment variables in Railway dashboard:**
```
ERYXON_API_URL=https://your-project.supabase.co
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

4. **Get your deployment URL:**
```
https://your-mcp-server.railway.app
```

5. **User Configuration:**

Each user runs the MCP server locally in API mode:

```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "ERYXON_API_URL": "https://your-project.supabase.co",
        "ERYXON_API_KEY": "ery_live_xxxxx"
      }
    }
  }
}
```

**Note:** In cloud/multi-tenant mode, each user runs the MCP server locally but it connects to your hosted Eryxon API using their personal API key. Users get their API key from: Settings → API Keys in Eryxon Flow web interface.

#### Option B: Fly.io

**Why Fly.io?**
- Global edge deployment
- Free tier available
- Excellent performance

**Steps:**

1. **Install Fly CLI:**
```bash
brew install flyctl  # macOS
# or: curl -L https://fly.io/install.sh | sh
flyctl auth login
```

2. **Create `fly.toml` in `mcp-server/`:**
```toml
app = "your-mcp-server"
primary_region = "ams"  # Amsterdam or your preferred region

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

3. **Deploy:**
```bash
flyctl launch
flyctl secrets set ERYXON_API_URL="https://your-project.supabase.co"
flyctl secrets set UPSTASH_REDIS_REST_URL="your-redis-url"
flyctl secrets set UPSTASH_REDIS_REST_TOKEN="your-token"
flyctl deploy
```

4. **Your URL:**
```
https://your-mcp-server.fly.dev
```

#### Option C: Docker

**Dockerfile** (already included in `mcp-server/`):

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

**Deploy:**
```bash
cd mcp-server
docker build -t eryxon-mcp-server .
docker run -e ERYXON_API_URL="..." -e ERYXON_API_KEY="..." -p 3000:3000 eryxon-mcp-server
```

---

## Mode Detection

The server automatically detects which mode to use:

| Environment Variables | Mode | Use Case |
|----------------------|------|----------|
| `ERYXON_API_KEY` set | **API Mode** | Cloud, multi-tenant, SaaS |
| `SUPABASE_SERVICE_KEY` set | **Direct Mode** | Self-hosted, local, single-tenant |

---

## Available Tools

The MCP server provides **55 tools across 9 modules**:

### 1. Jobs (7 tools)
- `fetch_jobs` - Query jobs with filters and pagination
- `create_job` - Create new manufacturing jobs
- `update_job` - Update job properties
- `start_job` - Start job execution
- `stop_job` - Pause/stop job
- `complete_job` - Mark job as completed
- `resume_job` - Resume paused job

### 2. Parts (2 tools)
- `fetch_parts` - Query parts with relationships
- `update_part` - Update part properties

### 3. Operations (5 tools)
- `fetch_operations` - Query operations with filters
- `start_operation` - Begin operation execution
- `pause_operation` - Pause operation
- `complete_operation` - Complete operation
- `update_operation` - Update operation details

### 4. Tasks (2 tools)
- `fetch_tasks` - Query tasks
- `update_task` - Update task status

### 5. Issues (8 tools)
- `fetch_issues` - Query quality issues
- `create_ncr` - Create Non-Conformance Reports
- `fetch_ncrs` - Query NCRs
- `update_issue` - Update issue status
- `get_issue_analytics` - Issue trend analysis
- `get_issue_trends` - Historical issue patterns
- `get_root_cause_analysis` - Root cause insights
- `suggest_quality_improvements` - AI-powered recommendations

### 6. Substeps (5 tools)
- `fetch_substeps` - Query operation substeps
- `add_substep` - Add substep to operation
- `complete_substep` - Mark substep complete
- `update_substep` - Update substep
- `delete_substep` - Remove substep

### 7. Dashboard (3 tools)
- `get_dashboard_stats` - Real-time production metrics
- `get_qrm_data` - Quick Response Manufacturing capacity
- `get_production_metrics` - Historical production data

### 8. Scrap (7 tools)
- `fetch_scrap_reasons` - Query scrap categories
- `report_scrap` - Record scrap events
- `get_scrap_analytics` - Scrap analysis
- `get_scrap_trends` - Scrap patterns over time
- `get_yield_metrics` - Production yield rates
- `get_scrap_pareto` - Pareto analysis of scrap causes
- `get_quality_score` - Overall quality metrics

### 9. Agent Batch (11 tools)
Optimized batch operations for AI agents:
- `batch_update_parts` - Bulk part updates
- `batch_reschedule_operations` - Bulk rescheduling
- `prioritize_job` - Set job priority
- `fetch_parts_by_customer` - Customer-scoped queries
- `batch_complete_operations` - Bulk completion
- `get_job_overview` - Comprehensive job summary
- `check_resource_availability` - Resource planning
- `assign_resource_to_operations` - Resource allocation
- `get_cell_capacity` - Cell utilization
- `get_parts_due_soon` - Due date alerts
- `suggest_reschedule` - AI-powered rescheduling

---

## Testing Your Setup

### 1. Verify Server is Running

Local mode:
```bash
npm start
# Should output:
# Eryxon Flow MCP Server v2.5.0
# Loaded 55 tools from 9 modules
# Eryxon Flow MCP Server running on stdio
```

Cloud mode:
```bash
curl https://your-mcp-server.railway.app/health
# Should return: {"status": "ok"}
```

### 2. Test in Claude Desktop

Ask Claude:
```
"Show me all jobs currently in progress"
```

Claude should use the `fetch_jobs` tool with `status: "in_progress"`.

### 3. Verify Tool Access

Ask Claude:
```
"What tools do you have available from Eryxon Flow?"
```

Claude should list all 55 tools.

---

## Troubleshooting

### "MCP server not found"

**Issue:** Claude Desktop can't find the server

**Solutions:**
1. Verify absolute paths in config (no `~` or relative paths)
2. Ensure `npm run build` completed successfully
3. Check `dist/index.js` exists
4. Restart Claude Desktop after config changes

### "Permission denied" or "EACCES"

**Issue:** Node can't execute the script

**Solution:**
```bash
chmod +x mcp-server/dist/index.js
```

### "Supabase connection failed"

**Issue:** Can't connect to database

**Solutions:**
1. Verify `SUPABASE_URL` is correct
2. Check `SUPABASE_SERVICE_KEY` or `ERYXON_API_KEY` is valid
3. Test connection manually:
```bash
curl https://your-project.supabase.co/rest/v1/jobs \
  -H "apikey: YOUR_ANON_KEY_HERE" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY_HERE"
```

### "No tools available"

**Issue:** Tools not loading

**Solutions:**
1. Check server logs for errors
2. Verify build output: `ls -la mcp-server/dist/tools/`
3. Ensure all dependencies installed: `npm ci`

### "Rate limited"

**Issue:** Too many requests

**Solution:**
- For cloud mode: Add Redis caching (Upstash)
- For local mode: Reduce request frequency

---

## Security Best Practices

### For Self-Hosted (Direct Mode)

1. **Never commit service keys** to version control
2. **Use environment variables** for all secrets
3. **Restrict service key** to specific IP ranges if possible
4. **Enable RLS policies** on all tables
5. **Monitor usage** via Supabase dashboard

### For Cloud (API Mode)

1. **Generate unique API keys** per user
2. **Rotate keys** regularly (every 90 days)
3. **Set key expiration** dates
4. **Monitor API usage** and set rate limits
5. **Use HTTPS only** for MCP server endpoints
6. **Enable Redis caching** to reduce database load

---

## Updating the MCP Server

### Local Mode

```bash
cd mcp-server
git pull origin main
npm ci
npm run build
# Restart Claude Desktop
```

### Cloud Mode

Railway:
```bash
git push  # Railway auto-deploys
```

Fly.io:
```bash
flyctl deploy
```

---

## Performance Optimization

### Caching (Cloud Mode)

Add Redis caching for frequently accessed data:

```bash
# Set in Railway/Fly.io
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

Default TTL: 5 minutes for fetch operations

### Query Optimization

The server includes:
- **Pagination** - All fetch operations support `limit` and `offset`
- **Soft-delete filtering** - Automatically excludes deleted records
- **Timeout protection** - 30-second query timeout (configurable)

---

## Migration from v2.3 to v2.5

**Breaking changes:** None (100% backward compatible)

**New features:**
- ✅ Zod runtime validation (catches invalid inputs early)
- ✅ Tool factory pattern (60% less code duplication)
- ✅ Enhanced error messages with context
- ✅ Pagination metadata (`has_more`, `total` count)
- ✅ Race condition prevention in state transitions

**To upgrade:**
```bash
cd mcp-server
npm ci
npm run build
# Restart Claude Desktop or redeploy
```

---

## Support

- **Documentation:** [Website Docs](https://eryxon.com/docs)
- **Demo Guide:** [MCP Demo Guide](/api/mcp-demo-guide)
- **API Reference:** [REST API Docs](/architecture/connectivity-rest-api)
- **Self-Hosting:** [Self-Hosting Guide](/guides/self-hosting)

---

**Need help?** The MCP server is fully open source. Check the source code in `mcp-server/src/` for implementation details.
