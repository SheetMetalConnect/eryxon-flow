# Eryxon Flow - Manufacturing Execution System

**Internal Project - Proprietary**

A modern, production-ready MES (Manufacturing Execution System) built with React, TypeScript, and Supabase for managing sheet metal production workflows with real-time tracking, QRM (Quick Response Manufacturing) capacity management, and comprehensive API integration.

## ✨ Features

### Core Production Management
- **Job Management** - Create and track manufacturing jobs through the complete lifecycle
- **Parts Tracking** - Monitor parts through production stages with assembly support
- **Operations Management** - Assign and track operator tasks with time tracking
- **Issue Tracking** - Log and resolve production defects with photo attachments
- **Real-time Dashboard** - Live production stats, metrics, and QRM capacity monitoring

### Quick Response Manufacturing (QRM)
- **Capacity Management** - WIP (Work-In-Progress) limits per cell/stage
- **Capacity Warnings** - Visual indicators when cells approach limits
- **Flow Visualization** - Routing visualization showing next cell capacity
- **Bottleneck Prevention** - Optional enforcement to prevent overcapacity

### Operator Features
- **Work Queue** - Personalized task list with filtering and search
- **Operator Terminal** - Clean, real-time production interface with capacity indicators
- **Time Tracking** - Start, pause, stop with accurate time calculations
- **Production Quantities** - Track actual vs planned quantities with scrap reporting
- **Substeps Management** - Break down operations into smaller checkable steps
- **Issue Reporting** - Quick issue logging with photos and severity levels
- **3D CAD Viewer** - View STEP files directly in browser with controls

### Admin Features
- **Dashboard** - Overview of production status and metrics
- **Job Creation Wizard** - Multi-step job creation with parts and operations
- **Assignments** - Assign work to operators
- **Issue Review** - Approve, reject, or close reported issues
- **Activity Monitor** - Real-time view of all operator activity
- **Data Export** - Export complete database to JSON/CSV
- **Organization Settings** - Configure company details, timezone, billing

### Configuration
- **Cells/Stages** - Define workflow stages with QRM WIP limits
- **Materials** - Manage materials catalog
- **Resources** - Track tools, fixtures, and equipment
- **Users** - Manage operator and admin accounts with role-based access
- **Steps Templates** - Reusable operation substep templates
- **Scrap Reasons** - Categorized scrap/defect reason codes
- **API Keys** - Generate keys for external integrations
- **Webhooks** - Real-time event notifications to external systems

### Integrations
- **REST API** - Complete CRUD operations for all entities
- **Webhooks** - Event-driven notifications (operation started/completed, issues, etc.)
- **MCP Server** - AI-powered automation via Model Context Protocol
- **Integrations Marketplace** - Browse and configure third-party integrations

### Multi-Tenancy & Security
- **Row-Level Security** - Complete tenant isolation at database level
- **Role-Based Access** - Admin and Operator roles with different capabilities
- **Subscription Plans** - Free, Pro, Premium with usage limits
- **API Authentication** - Bearer token auth with bcrypt-hashed keys

### User Experience
- **Multi-language Support** - English, Dutch, German (i18next)
- **Dark Mode** - Modern dark theme design system
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - Supabase Realtime subscriptions
- **Interactive Help** - In-app help pages with FAQs and guides
- **Onboarding** - Wizard for new tenant setup with mock data option

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account

### Installation

```sh
# Clone the repository
git clone <REPOSITORY_URL>

# Navigate to project directory
cd eryxon-flow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase URL and keys

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## 🏗️ Technology Stack

### Frontend
- **React** 18.3.1 - UI framework
- **TypeScript** 5.8.3 - Type safety
- **Vite** 5.4.19 - Build tool with SWC for fast compilation
- **React Router** 6.30.1 - Client-side routing
- **Tailwind CSS** 3.4.17 - Utility-first CSS framework

### UI Components
- **shadcn/ui** - 54 Radix UI components (accessible, unstyled primitives)
- **Material-UI** 7.3.5 - Additional component library for data grids
- **Lucide React** - Icon library
- **next-themes** - Dark mode support

### State Management & Data
- **@tanstack/react-query** 5.83.0 - Server state management & caching
- **@supabase/supabase-js** 2.80.0 - Backend client
- **React Context** - Global state (auth, tenant)

### Backend
- **Supabase** - PostgreSQL database with Row-Level Security
- **Supabase Edge Functions** - Serverless API endpoints (23 functions)
- **Supabase Realtime** - WebSocket subscriptions for live updates
- **Supabase Storage** - File uploads (CAD files, photos, PDFs)

### Forms & Validation
- **react-hook-form** 7.61.1 - Form management
- **zod** 3.25.76 - Schema validation

### Internationalization
- **i18next** 25.6.2 - Translation framework
- **react-i18next** 16.3.3 - React integration
- Supported languages: English (en), Dutch (nl), German (de)

### Additional Libraries
- **three.js** - 3D CAD viewer for STEP files
- **recharts** - Charts and metrics visualization
- **papaparse** - CSV parsing and export
- **jszip** - ZIP archive creation for exports
- **react-joyride** - Interactive onboarding tours
- **date-fns** - Date manipulation

## 📁 Project Structure

```
/
├── src/
│   ├── components/
│   │   ├── ui/                    # 54 shadcn/ui components
│   │   ├── admin/                 # Admin-specific components (7 files)
│   │   ├── operator/              # Operator components (11 files)
│   │   ├── terminal/              # Terminal view components (6 files)
│   │   ├── qrm/                   # QRM capacity components (7 files)
│   │   ├── issues/                # Issue tracking components (6 files)
│   │   ├── onboarding/            # Onboarding wizard (10 files)
│   │   └── mui/                   # Material-UI wrappers (11 files)
│   ├── pages/
│   │   ├── admin/                 # 20 admin pages
│   │   ├── operator/              # 5 operator pages
│   │   └── common/                # 5 shared pages (Help, About, etc.)
│   ├── hooks/                     # 12 custom React hooks
│   ├── lib/                       # 9 utility libraries
│   ├── contexts/                  # AuthContext for user/tenant state
│   ├── integrations/supabase/     # Supabase client + generated types
│   ├── i18n/                      # Translations (en, nl, de)
│   ├── layouts/                   # Layout components
│   ├── theme/                     # MUI theme configuration
│   ├── types/                     # TypeScript type definitions
│   └── styles/                    # Global CSS, design tokens
├── supabase/
│   ├── functions/                 # 23 Edge Functions
│   └── migrations/                # Database schema migrations
├── mcp-server/                    # Model Context Protocol server
├── docs/                          # Documentation files
├── public/                        # Static assets
└── scripts/                       # Utility scripts
```

## 🔑 Key Pages & Routes

### Operator Routes
- `/operator/work-queue` - Main work queue view
- `/operator/terminal` - Operator terminal with QRM capacity
- `/operator/my-activity` - Time tracking history (last 7 days)
- `/operator/my-issues` - Issues reported by operator
- `/operator/view` - Legacy operator view

### Admin Routes
- `/admin/dashboard` - Production overview dashboard
- `/admin/jobs` - Job list and management
- `/admin/jobs/new` - Create new job wizard
- `/admin/parts` - Parts list
- `/admin/operations` - Operations list
- `/admin/assignments` - Assign work to operators
- `/admin/issues` - Issue review queue
- `/admin/activity` - Activity monitor
- `/admin/integrations` - Integrations marketplace
- `/admin/data-export` - Data export tool
- `/admin/settings` - Organization settings
- `/admin/config/stages` - Cells/Stages configuration with QRM WIP limits
- `/admin/config/materials` - Materials catalog
- `/admin/config/resources` - Resources management
- `/admin/config/users` - User management
- `/admin/config/steps-templates` - Reusable substep templates
- `/admin/config/scrap-reasons` - Scrap reason codes
- `/admin/config/api-keys` - API key management
- `/admin/config/webhooks` - Webhook configuration

### Common Routes
- `/help` - Interactive help page with FAQs
- `/about` - About page
- `/api-docs` - API documentation (Swagger UI)
- `/pricing` - Subscription plans
- `/my-plan` - Current plan and usage

## 🤖 MCP Server Integration

Eryxon Flow includes a Model Context Protocol (MCP) server that enables AI assistants like Claude to directly interact with manufacturing data.

### Available MCP Tools (9 tools)

- `fetch_jobs` - Retrieve jobs with filtering
- `fetch_parts` - Get parts data
- `fetch_tasks` - Query tasks and assignments
- `fetch_issues` - View production issues
- `update_job` - Modify job status/priority
- `update_part` - Update part progress
- `update_task` - Change task assignments
- `create_job` - Create new manufacturing jobs
- `get_dashboard_stats` - Retrieve production metrics

### Setup MCP Server

1. Navigate to the MCP server directory and build:
```bash
cd mcp-server
npm install
npm run build
```

2. Configure your MCP client (e.g., Claude Desktop):
```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/absolute/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key"
      }
    }
  }
}
```

3. Restart your MCP client and the tools will be available!

See [mcp-server/README.md](mcp-server/README.md) for detailed documentation.

## 📚 Documentation

Comprehensive documentation is available in the `/docs` folder:

- **[HOW-THE-APP-WORKS.md](docs/HOW-THE-APP-WORKS.md)** - Complete functional guide
- **[API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)** - REST API reference
- **[HELP.md](docs/HELP.md)** - User help and FAQs (also available at `/help` when logged in)
- **[DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** - Design tokens and styling guide
- **[3d-viewer.md](docs/3d-viewer.md)** - 3D CAD viewer guide
- **[NOTIFICATIONS_SYSTEM.md](docs/NOTIFICATIONS_SYSTEM.md)** - Notifications architecture
- **[FLEXIBLE_METADATA_GUIDE.md](docs/FLEXIBLE_METADATA_GUIDE.md)** - Custom fields system
- **[DATA_EXPORT_FEATURE.md](docs/DATA_EXPORT_FEATURE.md)** - Data export guide
- **[PLAN_LIMITS_IMPLEMENTATION.md](docs/PLAN_LIMITS_IMPLEMENTATION.md)** - Subscription limits
- **[EDGE_FUNCTIONS_SETUP.md](docs/EDGE_FUNCTIONS_SETUP.md)** - Edge Functions guide
- **[INTEGRATIONS_MARKETPLACE.md](docs/INTEGRATIONS_MARKETPLACE.md)** - Integration platform
- **[RESOURCE_SEEDING_INSTRUCTIONS.md](docs/RESOURCE_SEEDING_INSTRUCTIONS.md)** - Seed data guide
- **[CLAUDE.md](CLAUDE.md)** - AI assistant guide for this codebase

## 🛠️ Development

### Available Scripts

```sh
# Start development server (localhost:8080)
npm run dev

# Build for production
npm run build

# Build for development (with dev mode flags)
npm run build:dev

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Development Workflow

1. **Code Organization**: Use feature-based organization in `src/components/`
2. **Import Aliases**: Always use `@/` alias instead of relative imports
3. **Styling**: Use Tailwind utility classes with design tokens from `src/styles/design-system.css`
4. **TypeScript**: Relaxed mode for developer productivity (implicit any allowed)
5. **State Management**: React Query for server state, Context for global state, useState for local
6. **Real-time**: Use Supabase Realtime subscriptions with proper cleanup

### Code Style

```typescript
// ✅ Good: Use path alias
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// ❌ Avoid: Relative imports
import { Button } from '../../../components/ui/button';

// ✅ Good: Tenant-scoped queries
const { data } = await supabase
  .from('jobs')
  .select('*')
  .eq('tenant_id', profile.tenant_id);

// ✅ Good: Real-time subscription with cleanup
useEffect(() => {
  const channel = supabase.channel('changes').subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

## 🔒 Security

### Multi-Tenancy
- Complete tenant isolation via PostgreSQL Row-Level Security (RLS)
- All database queries are automatically filtered by `tenant_id`
- Impossible to access other tenant's data

### Authentication
- Supabase Auth with JWT tokens
- Auto-refresh tokens
- Session persistence in localStorage

### Authorization
- Client-side route protection (UX convenience)
- Server-side RLS policies (actual security)
- Role-based access control (admin vs operator)

### API Security
- Bearer token authentication
- Bcrypt-hashed API keys
- HMAC-SHA256 webhook signatures
- Rate limiting per tenant
- Plan-based usage limits

## 📦 Deployment

### Lovable Platform

The project is deployed via [Lovable](https://lovable.dev/projects/aaa3208a-70fb-4eb6-a5eb-5823f025e734).

To deploy updates: **Share → Publish**

### Custom Domain

Navigate to **Project > Settings > Domains** and click **Connect Domain**.

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain)

## 🧪 Testing

**Status**: No automated testing configured

**Current Approach**:
- Manual testing
- Production monitoring
- User feedback

**Future**: Consider adding Vitest + React Testing Library

## 📊 Performance

### Optimizations
- **React Query Caching** - 5-minute stale time for server state
- **Code Splitting** - Lazy loading for heavy components
- **Edge Function Caching** - 5s cache with 10s stale-while-revalidate
- **Database Indexing** - Indexes on `tenant_id` and foreign keys
- **Pagination** - 100 records per page (max 1000)
- **Image Optimization** - Signed URLs with 1-hour expiration

### Real-time Efficiency
- Single subscription per component
- Proper cleanup on unmount
- Filtered subscriptions by `tenant_id`

## 🌍 Internationalization

The app supports 3 languages:
- **English** (en) - Default
- **Dutch** (nl)
- **German** (de)

Translation files: `src/i18n/locales/{lang}/translation.json`

Validate translations:
```bash
node scripts/check-translations.js
```

## 📄 License

**Proprietary - Internal Use Only**

All rights reserved. This software is for internal use only and may not be distributed, copied, or modified without explicit permission.

## 🔗 Project Links

- **Lovable Project**: [https://lovable.dev/projects/aaa3208a-70fb-4eb6-a5eb-5823f025e734](https://lovable.dev/projects/aaa3208a-70fb-4eb6-a5eb-5823f025e734)
- **Documentation**: [/docs](./docs)
- **API Docs**: Available at `/api-docs` when running
- **In-App Help**: Navigate to `/help` when logged in

---

**Last Updated**: November 22, 2025  
**Version**: 1.2  
**Status**: Production  
**Built with**: React 18 + TypeScript + Supabase
