# Eryxon Flow

Manufacturing Execution System (MES) for job shops and make-to-order manufacturers. Track jobs through production, give operators tablet-friendly work queues, and integrate with your ERP.

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
**Deployment**: Cloudflare Pages
**Database**: 87 migrations, multi-tenant schema with RLS
**API**: 28 Edge Functions (refactored with shared CRUD builder)
**3D Rendering**: Three.js + occt-import-js (client-side STEP parsing)

## Documentation

- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes
- [DEPLOY.md](DEPLOY.md) - Deployment guide
- [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) - API reference
- [docs/SELF_HOSTING_GUIDE.md](docs/SELF_HOSTING_GUIDE.md) - Self-hosting
- [docs/DATABASE.md](docs/DATABASE.md) - Database schema
- [docs/](docs/) - Complete documentation

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

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- Commercial support: office@sheetmetalconnect.com
