# Eryxon MES

**The simple, elegant and powerful manufacturing execution system that your people will love to use. Made for SMB metal fabrication.**

<div align="center">

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL_1.1-blue?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.80.0-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

---

## What Makes This Different

- **MCP Server** - AI/automation ready out of the box
- **API-first** - Send data from any system
- **Webhooks** - Link to any other system
- **Event-driven, real-time** - Industry 4.0 ready
- **Modern UI** - Operators actually want to use it

It's opinionated. Built for sheet metal manufacturing. Not for everyone.

## ✨ Key Features

- **Production Management** - Job tracking, parts routing, operation assignments, and issue tracking
- **QRM Capacity Management** - WIP limits, capacity warnings, and bottleneck prevention
- **Operator Terminal** - Real-time production interface with time tracking and 3D CAD viewer
- **Admin Dashboard** - Live production metrics, job wizard, and activity monitoring
- **Multi-tenant SaaS** - Complete tenant isolation with row-level security
- **REST API & Webhooks** - Full integration capabilities with external systems
- **MCP Server** - AI-powered automation via Model Context Protocol
- **Multi-language** - English, Dutch, German with dark mode support

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

Visit `http://localhost:8080` to access the application.

## 📚 Documentation

Comprehensive documentation is available in the [`/docs`](./docs) folder:

- **[HOW-THE-APP-WORKS.md](docs/HOW-THE-APP-WORKS.md)** - Complete functional guide
- **[API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)** - REST API reference
- **[DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** - Design tokens and styling
- **[EDGE_FUNCTIONS_SETUP.md](docs/EDGE_FUNCTIONS_SETUP.md)** - Edge Functions guide
- **[CICD_DEPLOYMENT_PLAN.md](docs/CICD_DEPLOYMENT_PLAN.md)** - CI/CD pipeline and Docker deployment
- **[CLAUDE.md](CLAUDE.md)** - AI assistant guide for contributors

Additional documentation:
- [3D Viewer](docs/3d-viewer.md)
- [Notifications System](docs/NOTIFICATIONS_SYSTEM.md)
- [Data Export](docs/DATA_EXPORT_FEATURE.md)
- [Integrations Marketplace](docs/INTEGRATIONS_MARKETPLACE.md)
- [MCP Server Setup](mcp-server/README.md)

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **UI**: shadcn/ui (54+ components), Material-UI, Lucide icons
- **State**: React Query, React Context
- **Backend**: Supabase (PostgreSQL, Realtime, Edge Functions, Storage)
- **Forms**: react-hook-form, Zod validation
- **3D**: Three.js for STEP file viewing
- **Charts**: Recharts
- **i18n**: i18next with en/nl/de support

## 📁 Project Structure

```
├── src/
│   ├── components/     # UI components (admin, operator, terminal, qrm, etc.)
│   ├── pages/          # Route pages (admin, operator, common)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries
│   └── integrations/   # Supabase client
├── supabase/
│   ├── functions/      # 23 Edge Functions
│   └── migrations/     # Database schema
├── mcp-server/         # Model Context Protocol server
└── docs/               # Documentation
```

## 🔒 Security

- **Multi-Tenancy**: PostgreSQL Row-Level Security for complete data isolation
- **Authentication**: Supabase Auth with JWT tokens
- **API Security**: Bearer token auth with bcrypt-hashed keys
- **Webhooks**: HMAC-SHA256 signatures for verification

## Pricing (Hosted)

| Tier | Limits | Support | Price |
|------|--------|---------|-------|
| **Free** | 100 jobs/mo, 1K parts | Docs only | €0 |
| **Pro** | 1K jobs/mo, 10K parts | Email | €97/mo |
| **Enterprise** | Unlimited | Dedicated + SSO | €497/mo |

- **Free** = Try it without installing anything
- **Enterprise** = Hand-holding tier (your infra or ours)

Want to self-host? See the [Self-Hosting Guide](docs/SELF_HOSTING_GUIDE.md) - unlimited, free, you manage it.

Need integration work or custom forks? [Contact us](mailto:office@sheetmetalconnect.com).

## Deployment

### Self-Hosted (Free)

```bash
# Clone and configure
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow
cp .env.example .env
# Edit .env with your Supabase credentials

# Run with Docker
docker-compose up -d
```

See **[docs/SELF_HOSTING_GUIDE.md](docs/SELF_HOSTING_GUIDE.md)** for complete setup instructions.

### Docker Quick Start

```bash
docker pull ghcr.io/sheetmetalconnect/eryxon-flow:latest
docker run -p 8080:80 \
  -e VITE_SUPABASE_URL=your-url \
  -e VITE_SUPABASE_PUBLISHABLE_KEY=your-key \
  ghcr.io/sheetmetalconnect/eryxon-flow:latest
```

## License

**Business Source License 1.1 (BSL 1.1)**

- You can view, modify, and self-host the code for your own use - free, unlimited
- You cannot offer commercial hosted versions that compete with our SaaS
- After 4 years, converts to Apache 2.0

See [LICENSE](LICENSE) for full terms.

Copyright © 2025 Sheet Metal Connect e.U.

---

**Built with** React + TypeScript + Supabase | **Region**: EU (Netherlands)
