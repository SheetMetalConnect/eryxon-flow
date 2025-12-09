# Eryxon MES

**The simple, elegant and powerful manufacturing execution system that your people will love to use. Made for SMB metal fabrication.**

<div align="center">

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL_1.1-blue?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2.6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.86.2-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

---

## About This Project

Eryxon MES is built by [Sheet Metal Connect e.U.](https://www.sheetmetalconnect.com/), founded by Luke van Enkhuizen, for digital transformation of SMB metals companies.

This is a starting point. Each shop is unique - fork it, customize it, make it yours. Sheet Metal Connect e.U. can help you self-host and adapt it to your specific needs.

**Recommended:** Self-host with your own Supabase instance or Docker.

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

- **Frontend**: React 18, TypeScript 5.8, Vite 7, TailwindCSS 3
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

## Getting Started

| | Hosted Demo | Self-Hosted (Recommended) |
|---|---|---|
| **Where** | Our infrastructure | Your infrastructure |
| **Usage** | Limited | Unlimited |
| **API** | Limited | Full |
| **Webhooks** | Limited | Full |
| **MCP Server** | Limited | Full |
| **Support** | Docs only | Community + Consulting |

- **Hosted Demo** — Try it online, limited usage for evaluation and educational purposes
- **Self-Hosted** — Full features, unlimited usage, bring your own Supabase or Docker

**Recommended:** Self-host with your own Supabase instance. See the [Self-Hosting Guide](docs/SELF_HOSTING_GUIDE.md) for database setup, migrations, and deployment.

Need help setting up or customizing? [Contact Sheet Metal Connect e.U.](mailto:office@sheetmetalconnect.com)

## Deployment

### Self-Hosted

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

**TL;DR:** Use it, modify it, self-host it - all free. Just don't host it and charge others for access.

- ✅ Self-host for your own manufacturing operations - free, unlimited
- ✅ Fork it, modify it, make it yours - each shop is unique
- ✅ Use for internal business, development, testing, education
- ❌ Cannot host it and sell access as a SaaS to others
- 🔄 Converts to Apache 2.0 after 4 years

See [LICENSE](LICENSE) for full terms.

---

## Contributing & Support

- **Website**: [sheetmetalconnect.com](https://www.sheetmetalconnect.com/)
- **Issues & PRs**: [GitHub](https://github.com/SheetMetalConnect/eryxon-flow)
- **Consulting & Custom Setup**: [office@sheetmetalconnect.com](mailto:office@sheetmetalconnect.com)

No guarantees of continued development, but likely will be updated with latest features.

---

Copyright © 2025 Sheet Metal Connect e.U.

**Built with** React + TypeScript + Supabase | **Region**: EU (Netherlands)
