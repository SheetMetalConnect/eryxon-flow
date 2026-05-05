---
title: "MCP Server Reference"
description: "Operational reference for the Eryxon Flow MCP server."
---

# Eryxon Flow MCP Server

**MCP server for self-hosted Eryxon Flow MES deployments.** The v0.5.0 final release uses direct Supabase access with a service role key, so run it only on trusted infrastructure.

## Features

- Direct Supabase connection for self-hosted deployments
- **50 tools across 9 modules** for jobs, parts, operations, quality, scheduling, and analytics
- **Production-grade validation** with Zod runtime type checking
- **Tool factory pattern** reducing code duplication by 60%
- Tenant scoping can be enforced with `TENANT_ID` in direct mode
- Supports stdio for local MCP clients and Streamable HTTP for Docker deployments

## Quick Start

### Self-Hosted Direct Supabase

```bash
cd mcp-server
npm install
npm run build

export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGc..."  # Service role key
export TENANT_ID="optional-tenant-id"      # recommended when sharing one DB

npm start
```

### HTTP Transport

```bash
MCP_TRANSPORT=http MCP_PORT=3001 MCP_ALLOWED_HOSTS=localhost,your-domain.com npm start
```

The HTTP transport exposes `/mcp` and `/health`. It binds to `127.0.0.1` by default. Public Docker or reverse-proxy deployments must set `MCP_HOST=0.0.0.0`, `MCP_BIND_PUBLIC=true`, a strong `MCP_BEARER`, and `MCP_ALLOWED_HOSTS` for the allowed hostnames. `MCP_ALLOWED_HOSTS` defaults to `localhost,127.0.0.1,[::1]`.

## Architecture

```
Claude Desktop (User)
  ↓ MCP Protocol
MCP Server (trusted local or Docker host)
  ↓ Direct Supabase service-role client
Supabase Database
  ↓ Optional TENANT_ID enforcement
Your Data
```

## Tool Modules

1. **Jobs** (7 tools) - Job lifecycle and management
2. **Parts** (2 tools) - Part tracking
3. **Operations** (5 tools) - Operation workflow with state transitions
4. **Tasks** (2 tools) - Task management
5. **Issues** (8 tools) - Quality issues and NCRs
6. **Substeps** (5 tools) - Operation substeps
7. **Dashboard** (3 tools) - Production metrics
8. **Scrap** (7 tools) - Scrap tracking and analytics
9. **Agent Batch** (11 tools) - Batch operations optimized for AI agents

## Documentation

- [MCP Demo Guide](/api/mcp-demo-guide/) - Complete tool reference and usage
- [Self-Hosting Guide](/guides/self-hosting/) - Self-hosted setup
- [Documentation Home](/) - Full documentation

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Start in development mode
npm run dev
```
