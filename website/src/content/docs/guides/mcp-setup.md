---
title: MCP Server Setup Guide
description: Run the Eryxon Flow MCP server for Claude Desktop, Cursor or any MCP client, locally or over Streamable HTTP.
---

The MCP (Model Context Protocol, revision 2026-07-28) server lets an AI agent work in your Eryxon Flow workshop with the same capabilities as the app: create jobs, parts and routings, start and complete operations, report output and scrap, raise and resolve issues, manage cells, resources and operators, and change workshop settings. The full tool list and the error contract are in the [MCP Server Reference](/api/mcp-server-reference/).

It is an optional component for self-hosted installations. It uses the Supabase service-role key, so run it only on infrastructure you trust.

## In the app

Admin → Integrations → **MCP server** generates the server environment block and the client configuration (Claude Code command, `mcpServers` JSON for Claude Desktop, Cursor and others) from your workshop: it fills in the Supabase URL and the workshop id, lets you pick the profile the agent acts as (`MCP_ACTOR_ID`) and generates a bearer token in the browser. The service-role key is never shown or stored in the app; paste it on the server. The page also lists the last actions logged under the agent's profile.

## Requirements

- Node.js 22
- The Supabase URL and service-role key of your installation
- The workshop id (`tenants.id`) for `TENANT_ID`
- Optionally a profile id for `MCP_ACTOR_ID`, used as the author of issues, assignments and production reports when the agent does not pass one
- An MCP client that speaks protocol revision 2026-07-28 (the server does not serve the 2025 `initialize` handshake)

## Local (stdio)

```bash
cd mcp-server
npm ci
npm run build
```

Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/absolute/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key",
        "TENANT_ID": "your-workshop-uuid",
        "MCP_ACTOR_ID": "profile-uuid-for-agent-writes"
      }
    }
  }
}
```

Restart the client. It lists the server's tools, resources (`eryxon://jobs`, `eryxon://cells`, `eryxon://timers`, …) and prompts.

## Streamable HTTP (Docker)

```bash
cd mcp-server
docker compose up
```

`.env` needs `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TENANT_ID` and `MCP_BEARER`; add `MCP_ACTOR_ID` when writes need a default author. The endpoint is `POST http://host:3001/mcp`; clients send `Authorization: Bearer <MCP_BEARER>` on every request. The endpoint is stateless (no session id), so several instances can run behind a plain load balancer; give them one shared `MCP_STATE_KEY` so a multi-round-trip confirmation can be answered by any instance. `GET /health` returns the version, protocol, tool count and whether the database answers.

| Variable | Default | Purpose |
|----------|---------|---------|
| `MCP_TRANSPORT` | `stdio` | `stdio` or `http` |
| `MCP_PORT` / `MCP_HOST` | `3001` / `127.0.0.1` | HTTP bind |
| `MCP_BIND_PUBLIC` | `false` | Must be `true` to bind `0.0.0.0`; `MCP_BEARER` is then mandatory |
| `MCP_BEARER` | | Bearer token required on `/mcp` |
| `MCP_ALLOWED_HOSTS` | `localhost,127.0.0.1,[::1]` | Hostnames accepted by the HTTP transport |
| `MCP_STATE_KEY` | random per process | HMAC key sealing multi-round-trip state; set when running more than one instance |

## Check the setup

```bash
node dist/index.js --version
# eryxon-flow-mcp 3.0.1 (MCP 2026-07-28)
curl http://localhost:3001/health
# {"status":"ok","version":"3.0.1","protocol":"2026-07-28","tools":113}
```

Then ask the agent: "Show the jobs in progress" (uses `fetch_jobs` with `status: in_progress`) or "What is running on the floor right now?" (reads `eryxon://timers`).

## Troubleshooting

- **Server not found in the client**: use absolute paths, run `npm run build`, restart the client.
- **`SUPABASE_URL, SUPABASE_SERVICE_KEY and TENANT_ID are required`**: the environment block is incomplete or the client did not pass it.
- **`MCP_BEARER is required when MCP_BIND_PUBLIC=true`**: set a long random token before exposing the HTTP port.
- **Tool result with `INVALID_STATE_TRANSITION`**: the database refused the transition; the message is the production rule (operator already clocked on another operation, standstill open, previous operation not completed). This is expected behaviour, not a fault.
- **`created_by is required`**: pass the profile id in the call or set `MCP_ACTOR_ID`.
- **`-32022 Unsupported protocol version`**: the client opened with the 2025 `initialize` handshake; use a client that negotiates 2026-07-28.
- **A delete returns `input_required`**: expected; the client shows the confirmation and retries with the answer.

## Security

- Never commit the service key; pass it through the environment.
- Set `TENANT_ID`. The server refuses to start without it.
- Expose HTTP only behind TLS with `MCP_BEARER` set.
