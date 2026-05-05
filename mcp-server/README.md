# Eryxon Flow MCP Server

MCP (Model Context Protocol) server for Eryxon Flow. Provides tools for AI assistants to interact with production data, work orders, scheduling, and more.

## Transport Modes

The server supports two transport modes, selected via `MCP_TRANSPORT` env var:

### stdio (default)

For local usage with Claude Desktop, Cursor, or any MCP-compatible client:

```bash
npm run build
npm start
```

Claude Desktop config:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

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

For Docker deployment or trusted self-hosted multi-client scenarios:

```bash
MCP_TRANSPORT=http MCP_PORT=3001 npm start
```

This starts an HTTP server implementing the MCP Streamable HTTP specification with:
- Session management (each client gets an isolated session)
- SSE streaming for real-time tool responses
- DNS rebinding protection via `MCP_ALLOWED_HOSTS`
- Optional bearer authentication with `MCP_BEARER`; required when `MCP_BIND_PUBLIC=true`
- Graceful shutdown on SIGINT/SIGTERM
- Health check at `GET /health`

By default HTTP mode binds to `127.0.0.1`. To expose it through Docker or a reverse proxy, set `MCP_HOST=0.0.0.0`, `MCP_BIND_PUBLIC=true`, and a strong `MCP_BEARER` value. Connect any MCP client that supports HTTP transport to `http://host:3001/mcp`.

## Docker

Build and run with Docker:

```bash
docker build -t eryxon-mcp .
docker run -p 3001:3001 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_SERVICE_KEY=your-service-key \
  -e MCP_BEARER=change-this-long-random-token \
  eryxon-mcp
```

Or use docker compose:

```bash
# Create .env with SUPABASE_URL, SUPABASE_SERVICE_KEY, and MCP_BEARER
docker compose up
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MCP_TRANSPORT` | No | `stdio` | Transport mode: `stdio` or `http` |
| `MCP_PORT` | No | `3001` | HTTP server port (http mode only) |
| `MCP_HOST` | No | `127.0.0.1` | HTTP server bind address |
| `MCP_BIND_PUBLIC` | No | `false` | Must be `true` before binding HTTP mode to `0.0.0.0` or `::` |
| `MCP_BEARER` | Required for public bind | - | Bearer token required for `/mcp` when `MCP_BIND_PUBLIC=true`; optional auth for loopback |
| `MCP_ALLOWED_HOSTS` | No | `localhost,127.0.0.1,[::1]` | Comma-separated allowed hostnames for HTTP mode |
| `SUPABASE_URL` | Yes | - | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | - | Supabase service role key |
| `REDIS_URL` | No | - | Redis URL for caching |
| `QUERY_TIMEOUT_MS` | No | `30000` | Query timeout in milliseconds |

The v0.5.0 final release supports direct Supabase access only. Keep the MCP server on trusted infrastructure because it uses a service role key.

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
  "tools": 50,
  "transport": "streamable-http"
}
```
