# Eryxon Flow

Open source Manufacturing Execution System (MES) for job shops and make-to-order manufacturers.

## Features

- Job and part tracking with real-time status updates
- Production planning and scheduling
- Multi-tenant SaaS architecture with row-level security
- Analytics and reporting (OEE, QRM, quality metrics)
- REST API with webhooks for ERP integration
- Shipping and logistics management
- Multi-language support (English, Dutch, German)

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
**UI**: shadcn/ui + Tailwind CSS
**Backend**: Supabase (PostgreSQL + Edge Functions)
**Deployment**: Cloudflare Pages
**Database**: 85 migrations, multi-tenant schema
**API**: 28 Edge Functions

## Documentation

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
