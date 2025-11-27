# Eryxon Flow - Manufacturing Execution System

**Internal Project - Proprietary**

<div align="center">

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.19-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.80.0-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4.17-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

<div align="center">

![React Query](https://img.shields.io/badge/React_Query-5.83.0-FF4154?style=flat-square&logo=react-query&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-6.30.1-CA4245?style=flat-square&logo=react-router&logoColor=white)
![MUI](https://img.shields.io/badge/Material_UI-7.3.5-007FFF?style=flat-square&logo=mui&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-0.180.0-000000?style=flat-square&logo=three.js&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3.25.76-3E67B1?style=flat-square&logo=zod&logoColor=white)
![i18next](https://img.shields.io/badge/i18next-25.6.2-26A69A?style=flat-square&logo=i18next&logoColor=white)

</div>

---

<div align="center">

![Commits](https://img.shields.io/badge/commits-514-blue)
![Inception](https://img.shields.io/badge/inception-2025-11-09-lightgrey)
![LOC](https://img.shields.io/badge/lines-63.3K-green)
![Velocity](https://img.shields.io/badge/last_30d-514_commits-orange)

</div>

---

A modern, production-ready MES (Manufacturing Execution System) for sheet metal manufacturing with real-time tracking, QRM capacity management, and comprehensive API integration.

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

## 📦 Deployment

Deployed via [Lovable Platform](https://lovable.dev/projects/aaa3208a-70fb-4eb6-a5eb-5823f025e734)

To deploy updates: **Share → Publish**

For custom domains, see [Lovable docs](https://docs.lovable.dev/features/custom-domain)

## 📄 License

**Proprietary - Internal Use Only**

Copyright © 2025 Sheet Metal Connect e.U. All rights reserved.

This software is for internal use only and may not be distributed, copied, or modified without explicit permission.

---

**Built with** React 18 + TypeScript + Supabase  
**Status**: Production  
**Version**: 1.2
