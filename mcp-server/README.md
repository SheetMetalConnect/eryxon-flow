# Eryxon Flow MCP Server

Model Context Protocol (MCP) server for Eryxon Flow Manufacturing Execution System.

## Version 2.0.0 - Modular Architecture

This version introduces a fully modular architecture with domain-specific tool modules for better maintainability and extensibility.

## Architecture

```
src/
├── index.ts              # Main entry point (~90 lines)
├── tools/
│   ├── index.ts          # Tool module exports & registry setup
│   ├── registry.ts       # Tool registration system
│   ├── jobs.ts           # Jobs domain (7 tools)
│   ├── parts.ts          # Parts domain (2 tools)
│   ├── operations.ts     # Operations domain (5 tools)
│   ├── tasks.ts          # Tasks domain (2 tools)
│   ├── issues.ts         # Issues/NCR domain (4 tools)
│   ├── substeps.ts       # Substeps domain (5 tools)
│   └── dashboard.ts      # Dashboard/Analytics (3 tools)
├── types/
│   └── index.ts          # Shared TypeScript types
└── utils/
    ├── index.ts          # Utility exports
    ├── supabase.ts       # Supabase client configuration
    └── response.ts       # Response helper functions
```

## Available Tools (28 total)

### Jobs Management (7 tools)
- **fetch_jobs** - Retrieve jobs with optional status filtering
- **create_job** - Create a new job
- **update_job** - Update job status, priority, or due date
- **start_job** - Start a job (tracks start time)
- **stop_job** - Pause a job
- **complete_job** - Mark job as completed
- **resume_job** - Resume a paused job

### Parts Tracking (2 tools)
- **fetch_parts** - Retrieve parts with job_id and status filtering
- **update_part** - Update part status or current stage

### Operations Management (5 tools)
- **fetch_operations** - Retrieve operations with filtering
- **start_operation** - Start an operation
- **pause_operation** - Pause an operation
- **complete_operation** - Complete an operation
- **update_operation** - Update operation properties

### Tasks (2 tools)
- **fetch_tasks** - Retrieve tasks with filtering by part, status, or assignee
- **update_task** - Update task status or assignee

### Issues & NCRs (4 tools)
- **fetch_issues** - Retrieve issues/defects with status and severity filtering
- **create_ncr** - Create a Non-Conformance Report
- **fetch_ncrs** - Retrieve NCRs with filtering
- **update_issue** - Update issue status or properties

### Substeps (5 tools)
- **fetch_substeps** - Get substeps for an operation
- **add_substep** - Add a substep to an operation
- **complete_substep** - Mark a substep as completed
- **update_substep** - Update substep properties
- **delete_substep** - Delete a substep

### Dashboard & Analytics (3 tools)
- **get_dashboard_stats** - Get aggregated dashboard statistics
- **get_qrm_data** - Get Quick Response Manufacturing capacity data
- **get_production_metrics** - Get production metrics for a time period

## Setup

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Set environment variables:
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key-here"
```

3. Build the server:
```bash
npm run build
```

4. Run in development mode:
```bash
npm run dev
```

## Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-key-here"
      }
    }
  }
}
```

## Usage Examples

### Fetch all in-progress jobs
```
Use the fetch_jobs tool with status: "in_progress"
```

### Update a job status
```
Use the update_job tool with id and status
```

### Get dashboard metrics
```
Use the get_dashboard_stats tool
```

### Start a job
```
Use the start_job tool with id: "job-uuid-here"
```

### Create an NCR
```
Use the create_ncr tool with operation_id, title, and severity
```

### Get QRM capacity data
```
Use the get_qrm_data tool to see cell capacity utilization
```

## Adding New Tools

The modular architecture makes it easy to add new tools:

1. **Add to existing module**: Add tool definition and handler to the appropriate domain file in `tools/`

2. **Create new module**:
   - Create a new file in `tools/` (e.g., `materials.ts`)
   - Export a `ToolModule` with `tools` and `handlers`
   - Add to `allModules` array in `tools/index.ts`

Example module structure:
```typescript
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";

const tools: Tool[] = [
  {
    name: "my_tool",
    description: "Description of my tool",
    inputSchema: { /* ... */ }
  }
];

const myToolHandler: ToolHandler = async (args, supabase) => {
  // Implementation
};

const handlers = new Map<string, ToolHandler>([
  ["my_tool", myToolHandler]
]);

export const myModule: ToolModule = { tools, handlers };
```

## Development

- `npm run dev` - Run in watch mode with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build

## Tech Stack

- TypeScript 5.x
- @modelcontextprotocol/sdk 1.0.4
- @supabase/supabase-js 2.80.0

## Version History

- **2.0.0** - Modular architecture refactor (28 tools in 7 modules)
- **1.0.0** - Initial monolithic implementation
