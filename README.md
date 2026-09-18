<p align="center">
  <img src="public/logo-banner-dark.svg" alt="Eryxon Flow" width="400" />
</p>

<p align="center">
  <strong>Planning and shop floor execution for metalworking job shops</strong>
</p>

<p align="center">
  <a href="https://app.eryxon.eu"><strong>Hosted Version</strong></a> &middot;
  <a href="https://eryxon.eu">Docs</a> &middot;
  <a href="https://github.com/SheetMetalConnect/eryxon-flow/issues">Issues</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-BSL--1.1-blue" alt="License" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/supabase-backend-3FCF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/typescript-strict-3178C6?logo=typescript" alt="TypeScript" />
</p>

---

Eryxon Flow is a manufacturing execution system for metalworking job shops: sheet metal, machine shops, custom fabrication. It is built for **high-mix, low-volume** production, where thousands of unique parts move through cutting, bending, welding and assembly and nobody has time to chase paper.

**For planners and managers** it gives one live view of every job, part and operation in production, with QRM capacity signals, issue tracking and a browser-based 3D viewer for STEP files.

**For operators** it gives a touch-friendly work queue on any tablet, kiosk or phone: clock in with a PIN, see what is next, record what happened.

**For the systems around it** it offers a REST API, webhooks and an MCP server, so your ERP or planning tool stays the system of record.

Self-host it with Docker, or use the [hosted version](https://app.eryxon.eu). See [Architecture](docs/ARCHITECTURE.md) for how it fits together and the [Changelog](CHANGELOG.md) for what is new.

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
- ERP sync with incremental change detection
- Webhook notifications for lifecycle events
- MCP server for AI assistant integration

**Platform**
- Multi-language (English, Dutch, German)
- Tenant isolation with row-level security; a self-hosted installation serves one workshop
- Self-hostable via Docker Compose

## Quick Start

Requires Node.js 22 and Docker (for the local Supabase stack).

```bash
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow
npm ci
npx supabase start      # local Postgres, auth, storage, Edge Functions; prints the API URL and anon key
cp .env.example .env    # paste that URL and anon key into VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev             # http://localhost:8080 — the first sign-up creates the workshop
```

`npx supabase stop` shuts the stack down. To develop against a hosted Supabase project instead, put its URL and anon key in `.env` and skip `supabase start`.

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL 17, Edge Functions, Realtime) |
| 3D Viewer | Three.js with browser-side STEP parsing |
| Deployment | Docker (self-hosted), Vercel + Supabase (hosted) |
| API | REST with API key auth, rate limiting, webhook dispatch |

The app is a responsive web app for phones, tablets and desktops. Installable PWA support is off by default; build with `VITE_ENABLE_PWA=true` to enable it.

## Self-Hosting

Full self-hosting guide: [eryxon.eu/guides/self-hosting](https://eryxon.eu/guides/self-hosting/)

Use the versioned image or immutable digest recorded in a GitHub release. Configure `.env` and `ERYXON_IMAGE`, then follow [RELEASING.md](RELEASING.md) for matching backend migrations, deployment, and recovery. Merging a pull request does not deploy production.

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

Contributor docs live in [`docs/`](docs/): [Architecture](docs/ARCHITECTURE.md), [Conventions](docs/CONVENTIONS.md), [ADRs](docs/decisions/). Versioning and publication: [RELEASING.md](RELEASING.md).

## AI Agent Support

Agent instructions live in [`.agents/`](.agents/) and are shared by every tool: [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md) (Codex, Windsurf, Cline), [.cursorrules](.cursorrules), [.github/copilot-instructions.md](.github/copilot-instructions.md).

## License

**Business Source License 1.1** (source-available)

- Free to self-host for a single production site (one workshop); read, modify, and run the source
- Any non-production use is free
- Running it across several sites, or offering it to others as a service, needs a commercial license — see [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md)
- Each released version converts to its Change License (GNU GPL v2.0 or later) four years after release

See [LICENSE](LICENSE) for the full terms.

## Contributing & Security

- Want to help? Start with [CONTRIBUTING.md](CONTRIBUTING.md) — translations (NL/DE), bug reports from the shop floor, and code are all welcome.
- Found a vulnerability? Please report it privately — see [SECURITY.md](SECURITY.md).

## Support

- Issues: [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- Docs: [eryxon.eu](https://eryxon.eu)
- Professional services: [vanenkhuizen.com](https://www.vanenkhuizen.com/)

---

<p align="center">
  Made in Europe by <a href="https://vanenkhuizen.com">Van Enkhuizen</a> &middot; <a href="https://sheetmetalconnect.com">Sheet Metal Connect</a>
</p>
