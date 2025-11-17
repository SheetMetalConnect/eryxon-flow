# Eryxon Flow MCP Server

Model Context Protocol (MCP) server for Eryxon Flow Manufacturing Execution System.

## Features

This MCP server provides tools to interact with the Eryxon Flow MES database:

- **fetch_jobs** - Retrieve jobs with optional status filtering
- **fetch_parts** - Retrieve parts with optional job_id and status filtering
- **fetch_tasks** - Retrieve tasks with optional filtering by part, status, or assignee
- **fetch_issues** - Retrieve issues/defects with status and severity filtering
- **update_job** - Update job status, priority, or due date
- **update_part** - Update part status or current stage
- **update_task** - Update task status or assignee
- **create_job** - Create a new job
- **get_dashboard_stats** - Get aggregated dashboard statistics

## Setup

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Set environment variables:
```bash
export SUPABASE_URL="https://vatgianzotsurljznsry.supabase.co"
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
        "SUPABASE_URL": "https://vatgianzotsurljznsry.supabase.co",
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

## Development

- `npm run dev` - Run in watch mode with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build

## Tech Stack

- TypeScript
- @modelcontextprotocol/sdk
- @supabase/supabase-js
