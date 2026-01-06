# Documentation Index

Welcome to the Eryxon Flow documentation!

## 🚀 Getting Started

**New to Eryxon Flow?** Start here:

1. **[Quick Start Guide](QUICK_START.md)** - Get up and running in 5 minutes
2. **[Self-Hosting Guide](SELF_HOSTING_GUIDE.md)** - Deploy your own instance
3. **[Migration Guide](MIGRATION_GUIDE.md)** - Move to new Supabase project

## 📖 Documentation Categories

### Deployment & Infrastructure

- **[Production Roadmap](PRODUCTION_ROADMAP.md)** ⭐ - Complete launch guide
- **[Cloudflare Deployment](CLOUDFLARE_DEPLOY.md)** - Deploy to Cloudflare Pages
- **[Supabase Migration](SUPABASE_CLOUDFLARE_MIGRATION.md)** - Quick migration guide
- **[CI/CD Deployment](CICD_DEPLOYMENT_PLAN.md)** - GitHub Actions workflows
- **[Edge Functions Setup](EDGE_FUNCTIONS_SETUP.md)** - Supabase functions

### Security

- **[Open Source Security Guide](security/OPEN_SOURCE_SECURITY_GUIDE.md)** ⚠️ - Must read before open sourcing
- Security audit script: `scripts/security/security-audit.sh`
- Cleanup script: `scripts/security/prepare-for-open-source.sh`

### Database & Architecture

- **[Database Schema](DATABASE.md)** - Complete schema reference
- **[Database Diagram](DATABASE_DIAGRAM.dbml)** - Visual ER diagram
- **[Backend Architecture](BACKEND_ARCHITECTURE_REVIEW.md)** - System design
- **[Coding Patterns](CODING_PATTERNS.md)** - Development patterns

### Features & Integrations

- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference
- **[API Authentication](API_KEY_AUTHENTICATION.md)** - API key system
- **[ERP Integration](ERP_INTEGRATION.md)** - External system integration
- **[API Sync](API_SYNC.md)** - Data synchronization
- **[MQTT/Connectivity](CONNECTIVITY.md)** - IoT integration
- **[MCP Integration](MCP_INTEGRATION.md)** - AI assistant integration
- **[Webhooks](NOTIFICATIONS_SYSTEM.md)** - Event notifications
- **[Integrations Marketplace](INTEGRATIONS_MARKETPLACE.md)** - Plugin system

### Data & Analytics

- **[CSV Import](CSV_IMPORT.md)** - Bulk data import
- **[Data Export](DATA_EXPORT_FEATURE.md)** - Export functionality
- **[Flexible Metadata](FLEXIBLE_METADATA_GUIDE.md)** - Custom fields
- **[Caching Strategy](CACHING.md)** - Performance optimization

### Features

- **[3D Viewer](3d-viewer.md)** - CAD file viewer
- **[PMI Extraction](PMI_EXTRACTION.md)** - Manufacturing data
- **[PMI/MBD Design](PMI_MBD_DESIGN.md)** - Model-based definition
- **[Part Images](PART_IMAGES_IMPLEMENTATION_PLAN.md)** - Image management
- **[Shipping Management](SHIPPING_MANAGEMENT.md)** - Logistics features
- **[Scheduler](SCHEDULER_DESIGN.md)** - Production scheduling

### Design & UX

- **[Design System](DESIGN_SYSTEM.md)** ⭐ - UI design guidelines
- **[Responsive UI](RESPONSIVE_UI_PATTERNS.md)** - Mobile patterns
- **[Error Handling](ERROR_HANDLING.md)** - User-friendly errors
- **[Help System](HELP.md)** - In-app documentation

### Development

- **[Claude Guidelines](CLAUDE.md)** - AI development guidelines
- **[How the App Works](HOW-THE-APP-WORKS.md)** - System overview
- Testing: `npm test`
- Type checking: `npx tsc --noEmit`

## 🛠️ Utility Scripts

All scripts are in the `scripts/` directory:

### Security Scripts (`scripts/security/`)

```bash
# Audit repository for sensitive data
./scripts/security/security-audit.sh

# Prepare repository for open source
./scripts/security/prepare-for-open-source.sh
```

### Deployment Scripts (`scripts/deployment/`)

```bash
# Verify current Supabase setup
./scripts/deployment/verify-supabase-setup.sh

# Consolidate all migrations into one file
./scripts/deployment/consolidate-migrations.sh

# Create Cloudflare Pages configuration
./scripts/deployment/create-cloudflare-config.sh
```

## 📊 Quick Reference

### Project Structure

```
eryxon-flow/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom hooks
│   ├── integrations/      # Supabase client
│   └── i18n/              # Translations
├── supabase/              # Backend
│   ├── migrations/        # Database schema
│   └── functions/         # Edge Functions
├── docs/                  # Documentation (you are here)
├── scripts/               # Utility scripts
└── public/                # Static assets
```

### Key Technologies

- **Frontend**: React + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Deployment**: Cloudflare Pages
- **License**: BSL 1.1

### Environment Variables

```env
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id

# Optional
VITE_CAD_SERVICE_URL=http://localhost:8888
```

See `.env.example` for complete list.

## 🎯 Common Tasks

### Deploy to Production

1. Follow **[Production Roadmap](PRODUCTION_ROADMAP.md)**
2. Or quick start: **[Cloudflare Deployment](CLOUDFLARE_DEPLOY.md)**

### Migrate Database

1. Create new Supabase project
2. Run: `./scripts/deployment/consolidate-migrations.sh`
3. Apply to new project via SQL Editor
4. Or use: `supabase db push`

### Prepare for Open Source

1. Read: **[Open Source Security Guide](security/OPEN_SOURCE_SECURITY_GUIDE.md)**
2. Run: `./scripts/security/prepare-for-open-source.sh`
3. Verify: `./scripts/security/security-audit.sh`

### Add New Feature

1. Follow patterns in **[Coding Patterns](CODING_PATTERNS.md)**
2. Follow design in **[Design System](DESIGN_SYSTEM.md)**
3. Update migrations in `supabase/migrations/`
4. Add translations in `src/i18n/locales/`

## 📞 Getting Help

- **GitHub Issues**: Bug reports and features
- **Documentation**: You're reading it!
- **Self-Hosting**: See [SELF_HOSTING_GUIDE.md](SELF_HOSTING_GUIDE.md)

## 📄 License

Eryxon Flow is licensed under the **Business Source License 1.1** (BSL 1.1).

**What this means:**
- ✅ Free to use, modify, and self-host
- ✅ Source code is available
- ✅ Can be used commercially internally
- ❌ Cannot offer as a competing hosted service

See [LICENSE](../LICENSE) for full terms.

---

**Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) (coming soon)

**Questions?** Open an issue on GitHub!
