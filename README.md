# Eryxon Flow

Open source Manufacturing Execution System (MES) for job shops and make-to-order manufacturers.

## Why Eryxon Flow?

Traditional MES systems are expensive, complex, and designed for high-volume production. Eryxon Flow is built specifically for:

- **Job Shops**: Custom fabrication, one-off parts, varied workflows
- **Make-to-Order Manufacturers**: Low volume, high mix production
- **Contract Manufacturers**: Multiple customers, diverse requirements
- **Small-Medium Manufacturers**: Teams of 5-100 operators

### Key Differentiators

- **Simple Setup**: No consultants needed. Deploy in hours, not months
- **Real-Time Tracking**: Know exactly where every job is, right now
- **Shop Floor Friendly**: Designed for operators, not just managers
- **Self-Hostable**: Your data stays on your infrastructure
- **Open Source**: Modify, extend, integrate - it's yours

## Features

- **Job & Part Tracking**: Real-time status updates across production stages
- **Time Tracking**: Operators log time with pause/resume, see actual vs estimated
- **Issue Management**: Report production issues with photos, track resolution
- **3D CAD Viewer**: View STEP files directly in browser
- **Analytics**: OEE, QRM metrics, quality tracking
- **ERP Integration**: REST API with webhooks for bidirectional sync
- **Multi-Tenant**: SaaS-ready with row-level security
- **Multi-Language**: English, Dutch, German

## Quick Start

### Hosted (Easiest)

Visit [eryxon.com](https://eryxon.com) for a managed instance with 30-day free trial.

### Self-Hosted

See **[Self-Hosting Guide](website/src/content/docs/guides/self-hosting.md)** for complete instructions.

```bash
# Quick local setup
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow

cp .env.example .env
# Add your Supabase credentials to .env

npm install
npm run dev
```

### Prerequisites

- [Supabase](https://supabase.com) account (free tier works)
- Node.js 20+
- Optional: [Cloudflare](https://cloudflare.com) for deployment

## Architecture

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Auth | Supabase Auth + PIN login for operators |
| Deployment | Cloudflare Pages |
| Database | 85 migrations, multi-tenant schema |
| API | 28 Edge Functions, REST + webhooks |

## Documentation

- **[Getting Started](website/src/content/docs/guides/quick-start.md)**
- **[Self-Hosting Guide](website/src/content/docs/guides/self-hosting.md)**
- **[API Documentation](docs/API_DOCUMENTATION.md)**
- **[Database Schema](docs/DATABASE.md)**
- **[Full Documentation](https://eryxon.com/docs)**

## Contributing

We welcome contributions! Please read:

- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community standards
- **[Security Policy](SECURITY.md)** - Reporting vulnerabilities

## License

**Business Source License 1.1**

| Use Case | Allowed |
|----------|---------|
| Self-host for your manufacturing business | Yes |
| Modify and customize for your needs | Yes |
| Offer consulting/integration services | Yes |
| Development, testing, evaluation | Yes |
| Run as competing hosted SaaS | No |

The license converts to **Apache 2.0** after 4 years.

See [LICENSE](LICENSE) for full terms.

## Support

- **Documentation**: [eryxon.com/docs](https://eryxon.com/docs)
- **Issues**: [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/SheetMetalConnect/eryxon-flow/discussions)
- **Commercial Support**: office@sheetmetalconnect.com

## Acknowledgments

Built with open source:
- [Supabase](https://supabase.com) - Backend infrastructure
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [React](https://react.dev) - UI framework
- [Vite](https://vitejs.dev) - Build tool

---

Made for manufacturers, by manufacturers.
