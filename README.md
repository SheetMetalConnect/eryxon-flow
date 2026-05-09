<p align="center">
  <img src="public/logo-banner-dark.svg" alt="Eryxon Flow" width="400" />
</p>

<p align="center">
  <strong>Self-hosted Planning & Shop Floor Execution for Job Shops</strong>
</p>

<p align="center">
  <a href="https://app.eryxon.eu"><strong>Hosted Version</strong></a> &middot;
  <a href="https://eryxon.eu">Docs</a> &middot;
  <a href="https://github.com/SheetMetalConnect/eryxon-flow/issues">Issues</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.5.1-blue" alt="Version" />
  <img src="https://img.shields.io/badge/license-BSL--1.1-green" alt="License" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/supabase-backend-3FCF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/typescript-strict-3178C6?logo=typescript" alt="TypeScript" />
</p>

---

> **Project Status (May 2026):** Stable v0.5.1 maintenance hotfix. v0.5.0 remains the final active-development release; active development is currently on hold, and the hosted version at [app.eryxon.eu](https://app.eryxon.eu) remains online as-is. This is a self-hosted planning integration and shop floor execution tool; you are free to use, fork, and adapt it as you wish under the BSL 1.1 license terms. The code builds, tests pass, and Docker deployment works out of the box. Start with the [Architecture docs](docs/ARCHITECTURE.md) and the [Changelog](CHANGELOG.md).

Track jobs through production, give operators tablet-friendly work queues, view 3D CAD models in the browser, and integrate with your ERP/planning system — all from one self-hosted platform.

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
- QRM dashboard with WIP limits and capacity overview
- Issue tracking and quality management (NCR)

**Integration**
- REST API with 30+ endpoints (jobs, parts, operations, time entries, webhooks)
- Planning adapters (FrePPLe, Odoo MRP) for scheduling integration
- ERP sync with incremental change detection
- MQTT connectivity with retry, circuit breaker, dead letter queue
- Webhook notifications for lifecycle events
- MCP server for AI assistant integration

**Platform**
- Multi-language (English, Dutch, German)
- Multi-tenant SaaS with row-level security
- Self-hostable via Docker Compose
- BSL 1.1 license (free for your business, converts to Apache 2.0 after the BSL change date)

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

## Install as a Desktop App (PWA)

Eryxon Flow ships as an installable Progressive Web App, so it runs as a standalone desktop application with its own Dock/Launchpad/Start-menu tile — no Electron, no extra runtime.

**macOS — Safari 17+ (Sonoma):** open the app, then *File → Add to Dock…*. The app appears in Launchpad and Applications.

**macOS / Windows / Linux — Chrome, Edge, Brave:** click the install icon at the right of the address bar (or *⋮ → Install / Apps → Install this site*). On macOS the resulting `.app` bundle shows up in Launchpad with the Eryxon icon.

**iOS / iPadOS — Safari:** *Share → Add to Home Screen*.

**Android — Chrome:** *⋮ → Install app*.

The installed app launches in a standalone window with its own icon and works offline for assets it has already loaded. Runtime config (`/env.js`) and API calls always go to the network. When a new version ships, a toast prompts the operator to reload — no forced mid-shift reloads on shop-floor terminals.

### Regenerating PWA icons

If you change the brand mark, edit `public/pwa-icon.svg` and rerun:

```bash
npm run pwa:assets
```

This regenerates `pwa-{64,192,512}.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, and `favicon.ico` from the SVG source.

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

### Knowledge Graph (OpenTrace)

The codebase is indexed into a queryable knowledge graph via [OpenTrace](https://github.com/opentrace/opentrace). The current local index reports 1,019 functions, 45 classes, 822 files, 144 directories, 143 packages, and 3,341 graph edges for AI-assisted development.

```bash
pip install opentraceai          # One-time install
opentraceai index .              # Index the codebase (~3s)
opentraceai stats                # View what's indexed
```

Claude Code commands: `/explore <name>`, `/graph-status`, `/interrogate <question>`. Agents: `@opentrace`, `@code-explorer`, `@dependency-analyzer`, `@find-usages`, `@explain-service`.

**Developer docs** (in `docs/`): [Architecture](docs/ARCHITECTURE.md) | [API Catalog](docs/API_CATALOG.md) | [Routes](docs/ROUTE_MAP.md) | [Hooks](docs/HOOK_MAP.md) | [Conventions](docs/CONVENTIONS.md) | [Glossary](docs/GLOSSARY.md) | [Troubleshooting](docs/TROUBLESHOOTING.md) | [ADRs](docs/decisions/) | [MCP Setup](docs/AI_AGENT_SETUP.md)

## License

**Business Source License 1.1**

- Free to use for your own manufacturing business
- Source available for modification and self-hosting
- Cannot offer as a competing hosted service
- Converts to **Apache 2.0** after the BSL change date

See [LICENSE](LICENSE) for full terms.

## Support

- Issues: [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- Docs: [eryxon.eu](https://eryxon.eu)
- Professional services: [vanenkhuizen.com](https://www.vanenkhuizen.com/)

---

<p align="center">
  Made in Europe by <a href="https://vanenkhuizen.com">Van Enkhuizen</a> &middot; <a href="https://sheetmetalconnect.com">Sheet Metal Connect</a>
</p>
