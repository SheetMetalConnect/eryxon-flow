# Eryxon Flow MCP Server

**Version 2.0** - Modular, Future-Proof Architecture

## Overview

The Eryxon Flow MCP (Model Context Protocol) server enables AI assistants like Claude to directly interact with manufacturing data. This refactored version features a modular architecture designed for scalability, maintainability, and ease of testing.

## Architecture

### Directory Structure

```
mcp-server/
├── src/
│   ├── index.ts                     # Entry point
│   ├── server.ts                    # MCP server setup
│   ├── config/                      # Configuration modules
│   │   ├── environment.ts          # Environment variables
│   │   ├── database.ts             # Supabase client
│   ├── lib/                        # Shared utilities
│   │   ├── logger.ts               # Logging system
│   │   ├── query-builder.ts        # Supabase query helpers
│   │   ├── response-formatter.ts   # Response formatting
│   │   ├── error-handler.ts        # Error handling
│   ├── types/                      # TypeScript definitions
│   │   └── tools.ts                # Tool types
│   ├── tools/                      # Tool implementations
│   │   ├── registry.ts             # Tool registry
│   │   ├── index.ts                # Tool aggregation
│   │   ├── jobs/                   # Job tools
│   │   │   ├── fetch.ts           # Fetch jobs
│   │   │   ├── update.ts          # Update jobs
│   │   │   ├── create.ts          # Create jobs
│   │   │   ├── lifecycle.ts       # Lifecycle operations
│   │   │   └── index.ts           # Export all job tools
│   │   ├── parts/                  # Part tools
│   │   ├── tasks/                  # Task tools
│   │   ├── issues/                 # Issue tools
│   │   ├── ncrs/                   # NCR tools
│   │   ├── operations/             # Operation tools
│   │   └── metrics/                # Metrics tools
│   └── index.ts.backup             # Original monolithic version
├── dist/                           # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

### Key Architectural Improvements

1. **Modular Tool Organization**: Tools organized by domain (jobs, parts, tasks, etc.)
2. **Tool Registry Pattern**: Centralized tool registration and handler management
3. **Shared Utilities**: Reusable query builders, formatters, and error handlers
4. **Type Safety**: Comprehensive TypeScript types throughout
5. **Error Handling**: Consistent error handling with custom error types
6. **Logging System**: Structured logging with configurable levels
7. **Configuration Management**: Environment-based configuration
8. **Testing Ready**: Modular design enables easy unit testing

## Available Tools

### Jobs (7 tools)
- `fetch_jobs` - Query jobs with status filtering
- `update_job` - Modify job status, priority, or due date
- `create_job` - Create new jobs
- `start_job` - Start a job (in_progress status)
- `stop_job` - Pause a job (on_hold status)
- `complete_job` - Complete a job
- `resume_job` - Resume a paused job

### Parts (2 tools)
- `fetch_parts` - Query parts with job_id and status filtering
- `update_part` - Update part status or current stage

### Tasks (2 tools)
- `fetch_tasks` - Query tasks with part, status, or assignee filtering
- `update_task` - Change task status or assignee

### Issues (1 tool)
- `fetch_issues` - Query production issues with status/severity filtering

### NCRs (2 tools)
- `fetch_ncrs` - Query Non-Conformance Reports
- `create_ncr` - Create new NCR with comprehensive tracking

### Operations (5 tools)
- `start_operation` - Start operation (in_progress, creates time entry)
- `pause_operation` - Pause operation (on_hold, ends time entry)
- `complete_operation` - Complete operation (100% completion)
- `add_substep` - Add substep to operation with auto-sequencing
- `complete_substep` - Mark substep as completed

### Metrics (1 tool)
- `get_dashboard_stats` - Aggregate stats across jobs, parts, tasks, issues

**Total: 20 tools** organized across 7 domains

## Installation

### Prerequisites

- Node.js 18+ and npm
- Supabase account with project credentials
- Environment variables configured

### Setup

1. **Install dependencies:**
   ```bash
   cd mcp-server
   npm install
   ```

2. **Configure environment:**
   Create `.env` file:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ENABLE_LOGGING=true
   ENABLE_HEALTH_CHECK=true
   ```

3. **Build the server:**
   ```bash
   npm run build
   ```

## Usage

### Development Mode

Run with hot reload:
```bash
npm run dev
```

### Production Mode

Build and run:
```bash
npm run build
npm start
```

### Claude Desktop Configuration

Add to Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key",
        "ENABLE_LOGGING": "true"
      }
    }
  }
}
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | - | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | - | Service role key (full access) |
| `ENABLE_LOGGING` | No | `false` | Enable structured logging |
| `ENABLE_HEALTH_CHECK` | No | `true` | Enable database health checks |

### Feature Flags

Configure in `src/config/environment.ts`:

```typescript
features: {
  logging: boolean;      // Structured logging
  healthCheck: boolean;  // Database health monitoring
}
```

## UI Integration

The server includes full UI integration for configuration and monitoring:

### Admin Pages

- **MCP Server Settings** (`/admin/config/mcp-server`)
  - Configure server settings
  - View health status
  - Monitor real-time logs
  - Enable/disable features

### Components

- **McpServerStatus** - Connection status indicator in admin sidebar
  - Real-time status updates (online/offline/degraded)
  - Response time monitoring
  - Tool availability count
  - Connection failure tracking

### Database Schema

The server includes comprehensive database schema for configuration:

- `mcp_server_config` - Server configuration per tenant
- `mcp_server_health` - Health monitoring and metrics
- `mcp_server_logs` - Activity logs for debugging

Apply migration:
```bash
# Migration file: supabase/migrations/20250122000000_mcp_server_configuration.sql
```

## Development

### Adding a New Tool

1. **Create tool module:**

```typescript
// src/tools/your-domain/new-tool.ts
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, ToolCategory } from "../../types/tools.js";
import { getDatabase } from "../../config/database.js";
import { formatDataResponse } from "../../lib/response-formatter.js";

export const newToolDefinition: Tool = {
  name: "new_tool",
  description: "Description for Claude",
  inputSchema: {
    type: "object",
    properties: {
      // Define parameters
    },
    required: ["param1"],
  },
};

export const newToolHandler: ToolHandler = async (args) => {
  const db = getDatabase();
  // Implementation
  return formatDataResponse(result);
};

export const newTool = {
  definition: newToolDefinition,
  handler: newToolHandler,
  category: ToolCategory.YOUR_DOMAIN,
};
```

2. **Register tool:**

```typescript
// src/tools/your-domain/index.ts
import { newTool } from "./new-tool.js";

export const yourDomainTools = [
  newTool,
  // ... other tools
];
```

3. **Add to main registry:**

```typescript
// src/tools/index.ts
import { yourDomainTools } from "./your-domain/index.js";

const allTools = [
  // ... existing tools
  ...yourDomainTools,
];
```

### Testing

```bash
# Run in development mode
npm run dev

# Test tool via Claude Desktop
# Or use MCP Inspector: https://github.com/modelcontextprotocol/inspector
```

### Logging

Logs are output to stderr (doesn't interfere with MCP stdio protocol):

```typescript
import { logger } from "./lib/logger.js";

logger.info("Server started");
logger.error("Error occurred", { context: data });
logger.toolCall("tool_name", args);
```

## Migration from V1

The original monolithic version is preserved as `src/index.ts.backup`. To revert:

```bash
mv src/index.ts src/index-v2.ts
mv src/index.ts.backup src/index.ts
npm run build
```

## Security

- **Service Role Key**: Uses Supabase service role for full database access
- **RLS Enforcement**: All queries respect Row Level Security policies
- **Tenant Isolation**: Multi-tenancy enforced at database level
- **Error Messages**: Sanitized to prevent information leakage

## Performance

- **Query Optimization**: Shared query builder with efficient patterns
- **Connection Pooling**: Supabase client manages connections
- **Response Caching**: (Optional) Add caching layer as needed
- **Logging Overhead**: Minimal when disabled

## Troubleshooting

### Server won't start

Check environment variables are set:
```bash
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY
```

### Database connection fails

Test health check:
```typescript
import { checkDatabaseHealth } from "./config/database.js";
const healthy = await checkDatabaseHealth();
```

### Tool not found

Verify tool is registered:
```typescript
import { toolRegistry } from "./tools/index.js";
console.log(toolRegistry.list());
```

### UI not showing status

1. Apply database migration
2. Check tenant has MCP config record
3. Verify health monitoring is running
4. Check real-time subscriptions

## Contributing

### Code Style

- TypeScript strict mode enabled
- ES modules with `.js` extensions in imports
- Functional components and async/await patterns
- Comprehensive error handling

### Pull Requests

1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit PR with clear description

## License

Copyright © 2025 Eryxon Flow. All rights reserved.

## Support

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues
- **Email**: support@eryxonflow.com

---

**Version History**
- v2.0.0 (2025-01-22) - Modular architecture refactor with UI integration
- v1.0.0 (2024-12-01) - Initial monolithic implementation
