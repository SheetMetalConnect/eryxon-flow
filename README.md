# Eryxon Flow

Manufacturing Execution System (MES) for job shops and make-to-order manufacturers. Track jobs through production, give operators tablet-friendly work queues, and integrate with your ERP.

**[Live Demo](https://app.eryxon.eu)** · [Documentation](https://eryxon.eu) · [GitHub](https://github.com/SheetMetalConnect/eryxon-flow)

**Current Release:** `0.3.2`

## Who It's For

**Job shops** running high-mix, low-volume production — sheet metal, machine shops, custom fabrication. If you're tracking thousands of unique parts through multiple operations, this is built for you.

## Features

### Shop Floor
- **Operator terminals** — Touch-friendly tablets for starting/stopping jobs, viewing drawings, and logging time
- **Work queues** — Visual job lists organized by stage (cutting, bending, welding, etc.)
- **Real-time tracking** — Live status updates via WebSockets to dashboards and managers

### Management
- **Job & part tracking** — Follow orders through production with full visibility
- **Dashboard stats** — Active jobs, operator activity, and production metrics at a glance
- **3D STEP viewer** — Browser-based CAD viewer for operators (no software install)

### Integration
- **REST API** — Full CRUD for jobs, parts, operations with webhook notifications
- **CSV import/export** — Bulk data operations for ERP sync
- **Multi-tenant SaaS** — Row-level security for hosted deployments

### Built for Teams
- **Multi-language** — English, Dutch, German
- **Self-hostable** — Run on your own infrastructure
- **API-first** — Build custom integrations and own your data

## Quick Deploy

See **[DEPLOY.md](DEPLOY.md)** for complete deployment instructions.

## Releases

Eryxon Flow uses a simple SemVer-based release model:

- `MAJOR` for breaking API, database, or deployment changes
- `MINOR` for backward-compatible features and meaningful platform expansions
- `PATCH` for fixes, security hardening, docs, and release stabilization

Work in progress should land in the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md) until tagged.

## Prerequisites

- [Supabase](https://supabase.com) account
- [Cloudflare](https://cloudflare.com) account
- Node.js 20+

## Local Development

```bash
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow

cp .env.example .env
# Edit .env with your Supabase credentials

npm install
npm run dev
```

## Environment Variables

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

See `.env.example` for complete list.

## Architecture

**Frontend**: React + TypeScript + Vite
**UI**: shadcn/ui + Tailwind CSS + Custom Design System
**Backend**: Supabase (PostgreSQL + Edge Functions + Realtime)
**Deployment**: Cloudflare Pages, Docker, or self-hosted reverse proxy setups
**Database**: Multi-tenant schema with RLS and versioned migrations under `supabase/migrations/`
**API**: Supabase Edge Functions with shared auth, validation, and webhook helpers
**3D Rendering**: Three.js + occt-import-js (client-side STEP parsing)

## Documentation

- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes
- [DEPLOY.md](DEPLOY.md) - Quick deployment guide for the application
- [docs/README.md](docs/README.md) - Developer and engineering documentation index
- [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) - Backend API reference
- [docs/API_PAYLOAD_REFERENCE.md](docs/API_PAYLOAD_REFERENCE.md) - API payload shapes and examples
- [website/src/content/docs/](website/src/content/docs/) - Source for public-facing product, architecture, and operator/admin docs
- [website/src/content/docs/guides/self-hosting.md](website/src/content/docs/guides/self-hosting.md) - Canonical self-hosting guide
- [website/src/content/docs/architecture/app-architecture.md](website/src/content/docs/architecture/app-architecture.md) - Architecture overview

## License

**Business Source License 1.1**

- Free to use for your own manufacturing business
- Source available for modification and improvement
- Self-host unlimited instances
- Cannot offer as competing hosted service

See [LICENSE](LICENSE) for full terms.

**Change Date**: 2029-01-01 (converts to Apache 2.0)

**Why BSL?** Free for your business, prevents competitors from reselling our hosted service. Converts to Apache 2.0 on 2029-01-01. [Learn more about BSL](https://mariadb.com/bsl-faq-adopting/).

## Support

- Documentation: [website/src/content/docs/](website/src/content/docs/)
- Issues: [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- Commercial support: office@sheetmetalconnect.com
