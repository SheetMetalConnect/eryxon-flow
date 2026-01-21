# Eryxon Flow MCP Server

Model Context Protocol (MCP) server for Eryxon Flow Manufacturing Execution System.

## Version 3.0.0 - Multi-Transport Support

This version adds:
- **HTTP/SSE Transport** for Vercel serverless deployment
- **Token-based authentication** for secure remote access
- **Modular architecture** with shared core

## Quick Start

### Option 1: Local Development (stdio)

```bash
cd mcp-server
npm install
npm run build

# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"

# Run
npm start
```

### Option 2: HTTP Development Server

```bash
cd mcp-server
npm run dev:http

# Test endpoints
curl http://localhost:3001/mcp/health
curl http://localhost:3001/mcp/info
```

### Option 3: Vercel Deployment (Production)

The MCP server is automatically deployed with the main app at:
```
https://your-app.vercel.app/api/mcp
```

## Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/mcp/health` | GET | No | Health check |
| `/api/mcp/info` | GET | No | Server info and tool list |
| `/api/mcp` | POST | Yes | JSON-RPC requests |

## Authentication

HTTP requests require a Bearer token:

```bash
curl -X POST https://your-app.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mcp_xxxxxxxxxxxxxxxx" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### Creating an MCP Token

1. Go to **Settings > Integrations > MCP Endpoints** in the Eryxon Flow UI
2. Click "Create Endpoint"
3. Copy the generated token (shown only once)
4. Use as `Authorization: Bearer <token>`

## Architecture

```
mcp-server/
├── src/
│   ├── index.ts          # Stdio entry point
│   ├── http.ts           # HTTP handler (Vercel compatible)
│   ├── http-dev.ts       # Local HTTP development server
│   ├── core.ts           # Shared server logic
│   ├── auth.ts           # Token authentication
│   ├── tools/            # Tool modules (11 modules, 55 tools)
│   │   ├── index.ts      # Module registry
│   │   ├── registry.ts   # Tool registration system
│   │   ├── jobs.ts       # Jobs (7 tools)
│   │   ├── parts.ts      # Parts (2 tools)
│   │   ├── operations.ts # Operations (5 tools)
│   │   ├── tasks.ts      # Tasks (2 tools)
│   │   ├── issues.ts     # Issues/NCR (4 tools)
│   │   ├── substeps.ts   # Substeps (5 tools)
│   │   ├── dashboard.ts  # Dashboard (3 tools)
│   │   ├── chat.ts       # AI Chat (5 tools)
│   │   ├── erp-sync.ts   # ERP Integration (6 tools)
│   │   ├── agent-batch.ts # Batch Operations (16 tools)
│   │   └── scrap.ts      # Scrap Management
│   ├── types/
│   │   └── index.ts      # TypeScript types
│   └── utils/
│       ├── supabase.ts   # Supabase client
│       ├── response.ts   # Response helpers
│       ├── openai.ts     # OpenAI integration
│       └── cache.ts      # Cache layer
├── package.json
└── tsconfig.json
```

## Available Tools (55 total)

### Jobs Management (7 tools)
| Tool | Description |
|------|-------------|
| `fetch_jobs` | Fetch jobs with optional status filtering |
| `create_job` | Create a new job |
| `update_job` | Update job properties |
| `start_job` | Start a job |
| `stop_job` | Pause a job |
| `complete_job` | Mark job as completed |
| `resume_job` | Resume a paused job |

### Parts Tracking (2 tools)
| Tool | Description |
|------|-------------|
| `fetch_parts` | Fetch parts with filtering |
| `update_part` | Update part status |

### Operations (5 tools)
| Tool | Description |
|------|-------------|
| `fetch_operations` | Fetch operations with filtering |
| `start_operation` | Start an operation |
| `pause_operation` | Pause an operation |
| `complete_operation` | Complete an operation |
| `update_operation` | Update operation properties |

### Tasks (2 tools)
| Tool | Description |
|------|-------------|
| `fetch_tasks` | Fetch tasks |
| `update_task` | Update task status |

### Issues & NCRs (4 tools)
| Tool | Description |
|------|-------------|
| `fetch_issues` | Fetch issues/defects |
| `create_ncr` | Create Non-Conformance Report |
| `fetch_ncrs` | Fetch NCRs |
| `update_issue` | Update issue status |

### Substeps (5 tools)
| Tool | Description |
|------|-------------|
| `fetch_substeps` | Get substeps for operation |
| `add_substep` | Add a substep |
| `complete_substep` | Mark substep complete |
| `update_substep` | Update substep |
| `delete_substep` | Delete a substep |

### Dashboard & Analytics (3 tools)
| Tool | Description |
|------|-------------|
| `get_dashboard_stats` | Dashboard statistics |
| `get_qrm_data` | QRM capacity data |
| `get_production_metrics` | Production metrics |

### AI Chat (5 tools)
| Tool | Description |
|------|-------------|
| `chat_query` | Natural language questions |
| `chat_summarize_jobs` | AI job summary |
| `chat_analyze_quality` | Quality analysis |
| `chat_explain_data` | Explain entities |
| `chat_suggest_actions` | AI suggestions |

### ERP Synchronization (6 tools)
| Tool | Description |
|------|-------------|
| `erp_sync_diff` | Compare with ERP |
| `erp_sync_execute` | Execute sync |
| `erp_lookup_external_id` | Find by ERP ID |
| `erp_sync_status` | Sync history |
| `erp_batch_lookup` | Batch lookup |
| `erp_resolve_ids` | Resolve IDs |

### Agent Batch Operations (16 tools)
| Tool | Description |
|------|-------------|
| `batch_update_parts` | Update multiple parts |
| `batch_reschedule_operations` | Reschedule operations |
| `prioritize_job` | Set job priority |
| `fetch_parts_by_customer` | Find customer parts |
| `batch_complete_operations` | Complete multiple ops |
| `get_job_overview` | Job summary |
| `check_resource_availability` | Check resources |
| `assign_resource_to_operations` | Assign resources |
| `get_shipping_status` | Shipping status |
| `manage_shipment` | Manage shipments |
| `get_jobs_ready_for_shipping` | Ready for ship |
| `get_cell_capacity` | Cell capacity |
| `plan_shipping` | Plan shipping |
| `find_shipping_consolidation` | Consolidate |
| `get_parts_due_soon` | Due soon parts |
| `suggest_reschedule` | AI reschedule |

## Configuration

### Environment Variables

```bash
# Required
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="your-service-key"

# Optional - AI Chat features
OPENAI_API_KEY="your-openai-key"

# Optional - Redis caching
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Optional - HTTP mode
MCP_PORT=3001
MCP_ALLOW_UNAUTHENTICATED=false
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-key",
        "OPENAI_API_KEY": "your-openai-key"
      }
    }
  }
}
```

## Usage Examples

### JSON-RPC Requests

#### Initialize Connection
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {}
}
```

#### List Available Tools
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

#### Call a Tool
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "fetch_jobs",
    "arguments": {
      "status": "in_progress",
      "limit": 10
    }
  }
}
```

### cURL Examples

```bash
# Health check
curl https://your-app.vercel.app/api/mcp/health

# Server info
curl https://your-app.vercel.app/api/mcp/info

# List tools
curl -X POST https://your-app.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mcp_xxxxx" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Fetch jobs
curl -X POST https://your-app.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mcp_xxxxx" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"fetch_jobs",
      "arguments":{"status":"in_progress"}
    }
  }'
```

## Security

### Authentication Flow

1. **Token Generation**: Admin creates endpoint in UI
2. **Token Storage**: SHA256 hash stored in `mcp_endpoints` table
3. **Token Validation**: Each request validates against hash
4. **Tenant Scoping**: Token scoped to specific tenant via RLS

### Security Features

- Bearer token authentication (SHA256 hashed)
- Per-tenant isolation with RLS
- Usage tracking and auditing
- Token enable/disable capability
- Token regeneration support
- CORS headers for browser clients
- No credentials in responses

### Best Practices

1. **Rotate tokens periodically**
2. **Use separate tokens per integration**
3. **Monitor usage via admin dashboard**
4. **Disable unused endpoints**
5. **Never commit tokens to version control**

## Development

```bash
# Build
npm run build

# Development (stdio)
npm run dev

# Development (HTTP)
npm run dev:http

# Type check
npm run typecheck

# Clean build
npm run clean && npm run build
```

## Adding New Tools

1. Create or modify a tool module in `src/tools/`
2. Export a `ToolModule` with tools and handlers
3. Add to `allModules` in `src/tools/index.ts`

```typescript
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";

const tools: Tool[] = [
  {
    name: "my_tool",
    description: "Description",
    inputSchema: {
      type: "object",
      properties: {
        param: { type: "string", description: "Param description" }
      },
      required: ["param"]
    }
  }
];

const myToolHandler: ToolHandler = async (args, supabase) => {
  // Implementation
  return { content: [{ type: "text", text: "Result" }] };
};

const handlers = new Map<string, ToolHandler>([
  ["my_tool", myToolHandler]
]);

export const myModule: ToolModule = { tools, handlers };
```

## Troubleshooting

### Common Issues

**"Invalid token" error**
- Verify token is correct and not expired
- Check endpoint is enabled in admin

**"SUPABASE_SERVICE_KEY not configured"**
- Ensure environment variable is set
- Check Vercel environment settings

**Tools not appearing**
- Rebuild: `npm run build`
- Check module is registered in `tools/index.ts`

**CORS errors**
- Verify request includes proper headers
- Check Vercel function configuration

## Version History

- **3.0.0** - Multi-transport support (stdio + HTTP), token auth
- **2.3.0** - Agent batch operations (55 tools)
- **2.2.0** - ERP synchronization, caching
- **2.1.0** - OpenAI chat integration
- **2.0.0** - Modular architecture
- **1.0.0** - Initial release

## License

MIT
