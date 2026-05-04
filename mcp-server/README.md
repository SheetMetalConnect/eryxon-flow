# Eryxon Flow MCP Server

MCP (Model Context Protocol) server for Eryxon Flow MES. Provides 55 tools for AI assistants to interact with production data, OEE metrics, work orders, and more.

## Transport Modes

The server supports two transport modes, selected via `MCP_TRANSPORT` env var:

### stdio (default)

For local usage with Claude Desktop, Cursor, or any MCP-compatible client:

```bash
npm run build
npm start
```

Claude Desktop config (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-key"
      }
    }
  }
}
```

### HTTP (Streamable HTTP)

For Docker deployment, cloud hosting, or multi-client scenarios:

```bash
MCP_TRANSPORT=http MCP_PORT=3001 npm start
```

This starts an HTTP server implementing the MCP Streamable HTTP specification with:
- Session management (each client gets an isolated session)
- SSE streaming for real-time tool responses
- Graceful shutdown on SIGINT/SIGTERM
- Health check at `GET /health`

Connect any MCP client that supports HTTP transport to `http://host:3001/mcp`.

## Docker

Build and run with Docker:

```bash
docker build -t eryxon-mcp .
docker run -p 3001:3001 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_SERVICE_KEY=your-service-key \
  eryxon-mcp
```

Or use docker compose:

```bash
# Create .env with SUPABASE_URL and SUPABASE_SERVICE_KEY
docker compose up
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MCP_TRANSPORT` | No | `stdio` | Transport mode: `stdio` or `http` |
| `MCP_PORT` | No | `3001` | HTTP server port (http mode only) |
| `MCP_HOST` | No | `0.0.0.0` | HTTP server bind address |
| `SUPABASE_URL` | Yes* | - | Supabase project URL (direct mode) |
| `SUPABASE_SERVICE_KEY` | Yes* | - | Supabase service role key (direct mode) |
| `ERYXON_API_KEY` | Yes* | - | Eryxon API key (API/cloud mode) |
| `ERYXON_API_URL` | Yes* | - | Eryxon API base URL (API/cloud mode) |
| `REDIS_URL` | No | - | Redis URL for caching |
| `QUERY_TIMEOUT_MS` | No | `30000` | Query timeout in milliseconds |

*Either Supabase credentials (direct mode) or Eryxon API credentials (API mode) are required.

## Connection Modes

- **Direct** (self-hosted): Set `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` for direct database access
- **API** (cloud SaaS): Set `ERYXON_API_KEY` + `ERYXON_API_URL` for tenant-scoped REST API access

## Development

```bash
npm install
npm run dev          # stdio mode with hot reload
npm run dev:http     # HTTP mode with hot reload
npm test             # run tests
npm run test:watch   # watch mode
```

## Health Check

When running in HTTP mode, `GET /health` returns:

```json
{
  "status": "ok",
  "version": "2.4.0",
  "mode": "direct",
  "tools": 55,
  "transport": "streamable-http"
}
```
