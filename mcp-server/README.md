# Eryxon Flow MCP Server

**OPTIONAL:** Local MCP server for Claude Desktop integration. Not required for the main application.

## What is this?

The MCP (Model Context Protocol) server allows Claude Desktop to interact with your Eryxon Flow database using natural language. It provides 55 tools for managing jobs, parts, operations, and more.

**This runs locally on your machine** - it is NOT part of the web application deployment.

## Quick Start

```bash
cd mcp-server
npm install
npm run build

# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"
export OPENAI_API_KEY="your-openai-key"  # Optional for AI features

# Run
npm start
```

## Claude Desktop Configuration

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/absolute/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-key",
        "OPENAI_API_KEY": "your-openai-key"
      }
    }
  }
}
```

## Documentation

See the [MCP Demo Guide](../website/src/content/docs/api/mcp-demo-guide.md) for:
- Complete tool reference (55 tools)
- Usage examples
- Demo scenarios
- Architecture details

## Do I need this?

**NO** - The MCP server is optional. The main Eryxon Flow application works perfectly without it.

Use the MCP server if you want:
- Claude Desktop to manage your manufacturing data
- AI-powered natural language queries
- Batch operations for efficiency

Otherwise, use the REST API or web interface.
