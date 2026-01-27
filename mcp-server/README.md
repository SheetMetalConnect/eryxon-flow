# Eryxon Flow MCP Server v2.4.0

**Universal MCP server for Eryxon Flow MES** - Works in both self-hosted and cloud SaaS deployments.

## Features

- 🔄 **Dual Mode**: Auto-detects direct Supabase or REST API connection
- 🛠️ **39 Tools**: Jobs, parts, operations, quality, shipping, and more
- 🔒 **Tenant-Safe**: Works with multi-tenant SaaS via API keys
- ⚡ **Production-Ready**: Deploy to Railway, Fly.io, or run locally
- 🎯 **Clean**: No AI wrapper bloat - Claude analyzes data natively

## Quick Start

### Cloud SaaS (Recommended for Hosted Deployment)

Users connect to YOUR hosted MCP server using their API key:

```bash
cd mcp-server
npm install
npm run build

# Set your API endpoint (your project)
export ERYXON_API_URL="https://your-project.supabase.co"

# Users provide their own API key
export ERYXON_API_KEY="ery_live_xxxxx"  # From Settings → API Keys

npm start
```

**User's Claude Desktop config:**
```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "ERYXON_API_URL": "https://gqptivvyklmxvdgivsmz.supabase.co",
        "ERYXON_API_KEY": "ery_live_xxxxx"
      }
    }
  }
}
```

### Self-Hosted (Direct Supabase)

For single-tenant self-hosted deployments:

```bash
cd mcp-server
npm install
npm run build

export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGc..."  # Service role key

npm start
```

## Mode Detection

The server automatically detects which mode to use:

- Has `ERYXON_API_KEY`? → **API Mode** (cloud, multi-tenant)
- Has `SUPABASE_SERVICE_KEY`? → **Direct Mode** (self-hosted, single-tenant)

## Available Tools (39 total)

### Jobs (7 tools)
- fetch_jobs, create_job, update_job, start_job, stop_job, complete_job, resume_job

### Parts (2 tools)
- fetch_parts, update_part

### Operations (5 tools)
- fetch_operations, start_operation, pause_operation, complete_operation, update_operation

### Quality & Issues (4 tools)
- fetch_issues, create_ncr, fetch_ncrs, update_issue

### Agent Batch Operations (16 tools)
- batch_update_parts, batch_reschedule_operations, prioritize_job, get_job_overview, check_resource_availability, manage_shipment, plan_shipping, and more

### And more...
- Substeps (5 tools)
- Tasks (2 tools)
- Dashboard/Analytics (3 tools)
- Scrap Tracking (1 tool)

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Railway deployment (recommended)
- Fly.io deployment
- Docker deployment
- Frontend integration (MCP status indicator)
- User setup instructions

## Architecture

```
Claude Desktop (User)
  ↓ MCP Protocol
MCP Server (Your deployment or local)
  ↓ REST API (if cloud) OR Direct Supabase (if self-hosted)
Supabase Edge Functions / Database
  ↓ RLS (tenant isolation)
Your Data
```

## Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Deploy to Railway/Fly.io/Docker
- [MCP Demo Guide](../website/src/content/docs/api/mcp-demo-guide.md) - Complete tool reference
- [Website Docs](../website/src/content/docs/) - User-facing documentation
