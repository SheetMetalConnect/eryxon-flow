<p align="center">
  <img src="public/logo-banner-dark.svg" alt="Eryxon Flow" width="400" />
</p>

<p align="center">
  <strong>Manufacturing Execution System for Job Shops</strong>
</p>

<p align="center">
  <a href="https://app.eryxon.eu"><strong>Live Demo</strong></a> &middot;
  <a href="https://eryxon.eu">Docs</a> &middot;
  <a href="https://github.com/SheetMetalConnect/eryxon-flow/issues">Issues</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.3.3-blue" alt="Version" />
  <img src="https://img.shields.io/badge/license-BSL--1.1-green" alt="License" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/supabase-backend-3FCF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/typescript-strict-3178C6?logo=typescript" alt="TypeScript" />
</p>

---

Track jobs through production, give operators tablet-friendly work queues, view 3D CAD models in the browser, and integrate with your ERP — all from one platform.

Built for **high-mix, low-volume** production: sheet metal, machine shops, custom fabrication. If you're tracking thousands of unique parts through cutting, bending, welding, and assembly, this is for you.

## Features

**Shop Floor**
- Touch-friendly operator terminals (tablets, kiosks)
- Kanban work queues organized by production cell
- Real-time tracking via WebSockets
- Time tracking with one-tap clock in/out

**Management**
- Job and part tracking with full production visibility
- 3D STEP viewer — browser-based CAD, no software install
- Dashboard stats and production analytics
- Issue tracking and quality management (NCR)

**Integration**
- REST API with 30+ endpoints (jobs, parts, operations, time entries, webhooks)
- ERP sync with incremental change detection
- Webhook notifications for lifecycle events
- MCP server for AI assistant integration

**Platform**
- Multi-language (English, Dutch, German)
- Multi-tenant SaaS with row-level security
- Self-hostable via Docker Compose
- BSL 1.1 license (free for your business, converts to Apache 2.0 in 2029)

## Quick Start

```bash
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow
cp .env.example .env    # Add your Supabase credentials
npm install
npm run dev             # http://localhost:8080
```

Requires: Node.js 20+, [Supabase](https://supabase.com) project

## Architecture

```
React 18 + Vite + Tailwind + shadcn/ui
         |
    Supabase Client
         |
PostgreSQL + Auth + RLS + Realtime + Storage
         |
    Edge Functions (Deno) ── 30+ REST API endpoints
         |
    Webhooks + MQTT + MCP Server
```

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL 17, Edge Functions, Realtime) |
| 3D Viewer | Three.js with browser-side STEP parsing |
| Deployment | Vercel (frontend), Supabase (backend), Docker (self-hosted) |
| API | REST with API key auth, rate limiting, webhook dispatch |

## Self-Hosting

Full self-hosting guide: [eryxon.eu/guides/self-hosting](https://eryxon.eu/guides/self-hosting/)

```bash
docker compose up -d
```

## API

30+ REST endpoints with filtering, pagination, search, and webhook notifications.

```bash
# List jobs
curl https://your-project.supabase.co/functions/v1/api-jobs \
  -H "Authorization: Bearer ery_live_your_api_key"

# Create a job with nested parts and operations
curl -X POST https://your-project.supabase.co/functions/v1/api-jobs \
  -H "Authorization: Bearer ery_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"job_number":"WO-001","customer":"Acme","parts":[...]}'
```

Full API reference: [eryxon.eu/api/rest-api-reference](https://eryxon.eu/api/rest-api-reference/)

## Documentation

Full docs at **[eryxon.eu](https://eryxon.eu)** — run locally with `cd website && npm run dev`.

| Section | Link |
|---------|------|
| Introduction | [eryxon.eu/introduction](https://eryxon.eu/introduction/) |
| Quick Start | [eryxon.eu/guides/quick-start](https://eryxon.eu/guides/quick-start/) |
| Architecture | [eryxon.eu/architecture/app-architecture](https://eryxon.eu/architecture/app-architecture/) |
| REST API Reference | [eryxon.eu/api/rest-api-reference](https://eryxon.eu/api/rest-api-reference/) |
| MCP Server | [eryxon.eu/api/mcp-server-reference](https://eryxon.eu/api/mcp-server-reference/) |
| Deployment | [eryxon.eu/guides/deployment](https://eryxon.eu/guides/deployment/) |
| Self Hosting | [eryxon.eu/guides/self-hosting](https://eryxon.eu/guides/self-hosting/) |
| Operator Manual | [eryxon.eu/guides/operator-manual](https://eryxon.eu/guides/operator-manual/) |
| Changelog | [eryxon.eu/guides/changelog](https://eryxon.eu/guides/changelog/) |

## AI Agent Support

This repo is optimized for AI coding assistants:

| Tool | Config File |
|------|-------------|
| Claude Code | [CLAUDE.md](CLAUDE.md) |
| GitHub Copilot | [.github/copilot-instructions.md](.github/copilot-instructions.md) |
| Cursor | [.cursorrules](.cursorrules) |
| Gemini | [GEMINI.md](GEMINI.md) |
| Codex / Windsurf / Cline | [AGENTS.md](AGENTS.md) |

Specialized sub-agents in [.agents/](.agents/) for database, tech stack, and repo operations.

**Developer docs** (in `docs/`): [Architecture](docs/ARCHITECTURE.md) | [API Catalog](docs/API_CATALOG.md) | [Routes](docs/ROUTE_MAP.md) | [Hooks](docs/HOOK_MAP.md) | [Conventions](docs/CONVENTIONS.md) | [Glossary](docs/GLOSSARY.md) | [Troubleshooting](docs/TROUBLESHOOTING.md) | [ADRs](docs/decisions/) | [MCP Setup](docs/AI_AGENT_SETUP.md)

## License

**Business Source License 1.1**

- Free to use for your own manufacturing business
- Source available for modification and self-hosting
- Cannot offer as a competing hosted service
- Converts to **Apache 2.0** on 2029-01-01

See [LICENSE](LICENSE) for full terms.

## Support

- Issues: [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- Docs: [eryxon.eu](https://eryxon.eu)
- Professional services: [vanenkhuizen.com](https://www.vanenkhuizen.com/)

---

<p align="center">
  Made in Europe by <a href="https://vanenkhuizen.com">Van Enkhuizen</a> &middot; <a href="https://sheetmetalconnect.com">Sheet Metal Connect</a>
</p>
