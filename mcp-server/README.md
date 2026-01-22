# Eryxon Flow MCP Server

Model Context Protocol (MCP) server for Eryxon Flow Manufacturing Execution System.

## Version 2.3.0 - Agent Batch & ERP Integration

This version adds:
- **Agent-optimized batch operations** for AI assistants to efficiently manage jobs, parts, and shipments
- **ERP synchronization tools** for bidirectional data sync with external systems
- **Caching layer** for improved performance

## Architecture

```
src/
├── index.ts              # Main entry point (~95 lines)
├── tools/
│   ├── index.ts          # Tool module exports & registry setup
│   ├── registry.ts       # Tool registration system
│   ├── jobs.ts           # Jobs domain (7 tools)
│   ├── parts.ts          # Parts domain (2 tools)
│   ├── operations.ts     # Operations domain (5 tools)
│   ├── tasks.ts          # Tasks domain (2 tools)
│   ├── issues.ts         # Issues/NCR domain (4 tools)
│   ├── substeps.ts       # Substeps domain (5 tools)
│   ├── dashboard.ts      # Dashboard/Analytics (3 tools)
│   ├── chat.ts           # AI Chat/OpenAI (5 tools)
│   ├── erp-sync.ts       # ERP Integration (6 tools) - NEW in v2.2.0
│   └── agent-batch.ts    # Agent Batch Operations (16 tools) - NEW in v2.3.0
├── types/
│   └── index.ts          # Shared TypeScript types
└── utils/
    ├── index.ts          # Utility exports
    ├── supabase.ts       # Supabase client configuration
    ├── response.ts       # Response helper functions
    ├── openai.ts         # OpenAI client configuration
    └── cache.ts          # Cache abstraction layer (Redis/in-memory)
```

## Available Tools (55 total)

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

### AI Chat (5 tools)
- **chat_query** - Ask natural language questions about manufacturing data
- **chat_summarize_jobs** - Get AI-generated summary of job status and metrics
- **chat_analyze_quality** - Get AI analysis of quality issues and NCR patterns
- **chat_explain_data** - Get AI explanation of specific entities (job, part, operation, issue)
- **chat_suggest_actions** - Get AI-suggested actions based on production state

### ERP Synchronization (6 tools) - NEW in v2.2.0
- **erp_sync_diff** - Compare external ERP data with local database and report differences
- **erp_sync_execute** - Execute bidirectional sync for jobs, parts, and operations
- **erp_lookup_external_id** - Find local entity by external ERP ID
- **erp_sync_status** - Get synchronization status and history for an entity
- **erp_batch_lookup** - Batch lookup multiple external IDs at once
- **erp_resolve_ids** - Resolve external IDs to local IDs for efficient processing

### Agent Batch Operations (16 tools) - NEW in v2.3.0

Optimized tools for AI assistants to perform complex multi-step operations efficiently:

- **batch_update_parts** - Update multiple parts in a single call
- **batch_reschedule_operations** - Reschedule multiple operations efficiently
- **prioritize_job** - Set job priority and bullet card status for rush orders
- **fetch_parts_by_customer** - Find all parts for a customer across jobs
- **batch_complete_operations** - Complete multiple operations in one call
- **get_job_overview** - Get comprehensive job summary with parts and operations
- **check_resource_availability** - Check availability of machines, personnel, and tooling
- **assign_resource_to_operations** - Assign resources to multiple operations
- **get_shipping_status** - Get shipping status with job details
- **manage_shipment** - Create, update, or add jobs to shipments
- **get_jobs_ready_for_shipping** - Find jobs ready for shipping
- **get_cell_capacity** - Get manufacturing cell capacity and utilization
- **plan_shipping** - Plan optimal shipping dates based on job completion estimates
- **find_shipping_consolidation** - Find opportunities to consolidate shipments
- **get_parts_due_soon** - Get parts due within a specified timeframe
- **suggest_reschedule** - Get AI-suggested reschedule based on delays and constraints

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

# Optional: For AI chat features
export OPENAI_API_KEY="your-openai-api-key"

# Optional: For Redis caching (defaults to in-memory)
export REDIS_URL="redis://localhost:6379"
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
        "SUPABASE_SERVICE_KEY": "your-service-key-here",
        "OPENAI_API_KEY": "your-openai-api-key"
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

### AI Chat Examples

#### Ask a natural language question
```
Use chat_query with:
- query: "What are the most common quality issues this week?"
- context: "quality"
```

#### Get a job summary
```
Use chat_summarize_jobs with:
- time_period: "this_week"
- focus: "delays"
```

### ERP Sync Examples (NEW)

#### Check differences before syncing
```
Use erp_sync_diff with:
- entity_type: "jobs"
- external_data: [...array of ERP job records...]
```

#### Execute bidirectional sync
```
Use erp_sync_execute with:
- jobs: [...ERP job records...]
- parts: [...ERP part records...]
- options: { skip_unchanged: true, continue_on_error: true }
```

#### Find entity by external ID
```
Use erp_lookup_external_id with:
- entity_type: "jobs"
- external_id: "ERP-JOB-123"
- external_source: "SAP"
```

### Agent Batch Examples (NEW)

#### Prioritize a rush job
```
Use prioritize_job with:
- job_number: "JOB-2024-0001"
- priority: "urgent"
- set_bullet_card: true
- notes: "Customer requested expedited delivery"
```

#### Get parts due soon
```
Use get_parts_due_soon with:
- days_ahead: 3
- include_in_progress: true
```

#### Check resource availability
```
Use check_resource_availability with:
- resource_type: "machine"
- include_usage: true
```

#### Plan shipping
```
Use plan_shipping with:
- job_ids: ["uuid1", "uuid2"]
- consolidate: true
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

## OpenAI Integration Details

The chat module uses OpenAI's GPT-4o-mini model by default with the following configuration:

- **Model**: gpt-4o-mini (fast, cost-effective)
- **Max Tokens**: 1000-1500 depending on tool
- **Temperature**: 0.5-0.7 for balanced responses

### System Prompts

The module includes specialized system prompts for different contexts:
- **manufacturing** - General manufacturing operations
- **quality** - Quality assurance and NCR analysis
- **production** - Production planning and scheduling
- **general** - General assistance

## Caching

Version 2.2.0+ includes a caching layer that supports:

- **In-memory cache** - Default, no configuration needed
- **Redis** - Set `REDIS_URL` environment variable

Cache is used for:
- Frequent lookups (external IDs, entity mappings)
- Prefetched data during batch operations
- Temporary sync state

## Development

- `npm run dev` - Run in watch mode with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build

## Tech Stack

- TypeScript 5.x
- @modelcontextprotocol/sdk 1.24.3
- @supabase/supabase-js 2.86.2
- openai 6.10.0

## Version History

- **2.3.0** - Agent-optimized batch operations (55 tools in 10 modules)
- **2.2.0** - ERP synchronization and caching (39 tools in 9 modules)
- **2.1.0** - OpenAI chat integration (33 tools in 8 modules)
- **2.0.0** - Modular architecture refactor (28 tools in 7 modules)
- **1.0.0** - Initial monolithic implementation
