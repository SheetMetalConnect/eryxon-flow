# Eryxon Flow - Manufacturing Execution System

A modern, production-ready MES (Manufacturing Execution System) built with React, TypeScript, and Supabase for managing sheet metal production workflows.

## Features

- **Job Management** - Create and track manufacturing jobs
- **Parts Tracking** - Monitor parts through production stages
- **Task Management** - Assign and track operator tasks
- **Issue Tracking** - Log and resolve production defects
- **Real-time Dashboard** - Live stats and metrics
- **MCP Server Integration** - AI-powered automation via Model Context Protocol
- **API & Webhooks** - External integrations support
- **Role-based Access** - Admin and operator views

## Project info

**URL**: https://lovable.dev/projects/aaa3208a-70fb-4eb6-a5eb-5823f025e734

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/aaa3208a-70fb-4eb6-a5eb-5823f025e734) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/aaa3208a-70fb-4eb6-a5eb-5823f025e734) and click on Share -> Publish.

## MCP Server Integration

Eryxon Flow includes a Model Context Protocol (MCP) server that enables AI assistants like Claude to directly interact with your manufacturing data.

### Available MCP Tools

- `fetch_jobs` - Retrieve jobs with filtering
- `fetch_parts` - Get parts data
- `fetch_tasks` - Query tasks and assignments
- `fetch_issues` - View production issues
- `update_job` - Modify job status/priority
- `update_part` - Update part progress
- `update_task` - Change task assignments
- `create_job` - Create new manufacturing jobs
- `get_dashboard_stats` - Retrieve metrics

### Setup MCP Server

1. Navigate to the MCP server directory:
```bash
cd mcp-server
npm install
npm run build
```

2. Configure your MCP client (e.g., Claude Desktop) by adding to config:
```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://vatgianzotsurljznsry.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key-here"
      }
    }
  }
}
```

3. Restart your MCP client and start using the tools!

See [mcp-server/README.md](mcp-server/README.md) for detailed documentation.

## Architecture

- **Frontend**: Vite + React 18 + TypeScript
- **UI Framework**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Routing**: React Router v6
- **State**: React Query for server state

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
