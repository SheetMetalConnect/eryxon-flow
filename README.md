# Eryxon Flow

Source-available Manufacturing Execution System (MES) for job shops and make-to-order manufacturers. Licensed under BSL 1.1.

## Features

- **Job and part tracking** with real-time status updates via WebSockets
- **Operator terminals** for time tracking and work queue management
- **Multi-tenant SaaS architecture** with row-level security (RLS)
- **REST API** with webhooks for ERP integration and automation
- **CSV import/export** for bulk data operations
- **3D STEP file viewer** (client-side, browser-based)
- **Multi-language support** (English, Dutch, German)
- **Real-time dashboard** with production stats and metrics

### Scope

Eryxon focuses on **core MES functionality**: production tracking, operator management, and quality documentation.

This is **not** an ERP, analytics platform, or logistics system. We do one thing well.

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

## Support

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- Commercial support: office@sheetmetalconnect.com
