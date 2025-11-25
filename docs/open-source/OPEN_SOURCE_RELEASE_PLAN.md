# Open Source Release Plan

**Status:** Planning
**Target:** Fully open-source Manufacturing Execution System
**License:** MIT (recommended)
**Business Model:** Integrations & Consulting

---

## Overview

This document outlines the plan to release Eryxon Flow as a fully open-source project. The goal is to make deployment as simple as possible while maintaining the powerful features that make this MES valuable.

### What We're Keeping

- Multi-tenancy support (great for companies with multiple sites/shops)
- Full feature set (QRM, operations, issues, time tracking, etc.)
- MCP Server for AI integrations
- REST API with webhooks
- All existing seed scripts for demo data

### What We're Removing

- Stripe billing integration
- Plan-based feature limits (everything becomes "unlimited")
- Usage quotas and restrictions
- SaaS-specific pricing pages

---

## Release Phases

### Phase 1: Remove Commercial Code

**Priority:** High
**Effort:** Medium

#### 1.1 Remove Billing & Pricing Components

Files to remove or modify:

```
src/components/billing/
├── StripeBillingSection.tsx     → DELETE
├── PlanLimitsBanner.tsx         → DELETE or simplify
└── UsageDisplay.tsx             → DELETE

src/pages/
├── Pricing.tsx                  → DELETE
├── MyPlan.tsx                   → DELETE or convert to "Settings"

docs/
├── EU_PAYMENT_BILLING_INTEGRATION_PLAN.md  → DELETE
├── STRIPE_SETUP_GUIDE.md                    → DELETE
├── PLAN_LIMITS_IMPLEMENTATION.md            → DELETE
```

#### 1.2 Simplify Tenant Model

Current tenant model has plan tiers (free/pro/premium). Options:

**Option A: Remove plans entirely**
- All tenants get full access
- Simplest approach

**Option B: Keep structure, default to "premium"** (Recommended)
- Keeps database schema intact
- New tenants auto-assigned "premium" plan
- Easier migration path if someone wants to add billing later

#### 1.3 Remove Rate Limiting by Plan

Modify edge functions to remove plan-based restrictions:
- `supabase/functions/_shared/rate-limiter.ts` - Simplify or remove
- `supabase/functions/_shared/plan-limits.ts` - Remove plan checks

---

### Phase 2: Security Cleanup

**Priority:** Critical
**Effort:** Low

#### 2.1 Remove Hardcoded Credentials

| File | Line | Action |
|------|------|--------|
| `src/lib/upload-with-progress.ts` | 38-39 | Use `import.meta.env.VITE_SUPABASE_*` |
| `src/lib/webhooks.ts` | 51 | Remove fallback URL |
| `supabase/config.toml` | 1 | Replace with placeholder |
| `mcp-server/.env.example` | 1 | Use placeholder URL |

#### 2.2 Clean Migration Archives

Review and sanitize:
- `supabase/migrations/archive/20251117174506_*.sql` - Remove vault secrets

#### 2.3 Create Environment Templates

Create `.env.example`:
```env
# Supabase Configuration (get these from your Supabase project dashboard)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=your-project-id
```

---

### Phase 3: Deployment Infrastructure

**Priority:** High
**Effort:** Medium-High

#### 3.1 Default: Bring Your Own Supabase (Cloud)

The recommended and simplest deployment path:

1. User creates Supabase project (free tier available)
2. User applies our schema
3. User deploys edge functions
4. User runs the app (npm/Docker)

**Documentation:** See [SELF_HOSTING_GUIDE.md](./SELF_HOSTING_GUIDE.md)

#### 3.2 Advanced: Full Self-Hosted Stack

For users who want complete control:

- Self-hosted Supabase (7+ containers)
- Requires more DevOps knowledge
- Good consulting opportunity

**Components:**
```
PostgreSQL        → Database
GoTrue            → Authentication
PostgREST         → REST API
Realtime          → WebSocket subscriptions
Storage API       → File storage
Kong              → API Gateway
Studio            → Admin dashboard (optional)
```

#### 3.3 Docker Setup

Create Docker configuration for the application:

```yaml
# docker-compose.yml (application only)
version: '3.8'
services:
  eryxon-flow:
    build: .
    ports:
      - "3000:80"
    environment:
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_PUBLISHABLE_KEY=${SUPABASE_ANON_KEY}
```

For full self-hosted, provide separate `docker-compose.supabase.yml`.

---

### Phase 4: Database Schema Consolidation

**Priority:** High
**Effort:** Medium

#### 4.1 Create Consolidated Schema

Merge all migrations into a single, well-documented schema file:

```
supabase/
├── schema.sql              # Complete schema (NEW)
├── seed.sql                # Demo data using existing seed functions
├── migrations/             # Keep for reference/incremental updates
│   ├── archive/            # Historical migrations
│   └── *.sql              # Active migrations
```

#### 4.2 Schema Contents

The consolidated schema should include:

1. **Tables** (in dependency order)
   - tenants
   - profiles
   - cells, materials, resources
   - jobs, parts, operations
   - issues, time_entries, substeps
   - api_keys, webhooks, activity_log
   - mcp_* tables

2. **Row-Level Security Policies**
   - All tenant isolation policies
   - Role-based access (admin/operator)

3. **Functions**
   - `get_tenant_info()`
   - `has_role()`
   - Seed functions (scrap_reasons, demo_operators, demo_resources)
   - QRM metrics functions

4. **Triggers**
   - Activity logging
   - Timestamp updates

5. **Storage Buckets**
   - parts-images
   - issues

---

### Phase 5: Documentation Rewrite

**Priority:** High
**Effort:** Medium

#### 5.1 New Documentation Structure

```
docs/
├── QUICK_START.md              # 5-minute setup guide
├── SELF_HOSTING_GUIDE.md       # Complete deployment guide
├── ARCHITECTURE.md             # System overview (update existing)
├── API_DOCUMENTATION.md        # Keep, update if needed
├── DEVELOPMENT.md              # Local dev setup
├── CONTRIBUTING.md             # How to contribute
├── MCP_INTEGRATION.md          # Keep existing
├── HOW-THE-APP-WORKS.md        # Keep existing
└── DESIGN_SYSTEM.md            # Keep existing
```

#### 5.2 Files to Remove

```
docs/
├── EU_PAYMENT_BILLING_INTEGRATION_PLAN.md  → DELETE
├── STRIPE_SETUP_GUIDE.md                    → DELETE
├── PLAN_LIMITS_IMPLEMENTATION.md            → DELETE (or archive)
```

#### 5.3 README.md Overhaul

Transform from internal project to open-source project:

- Remove "Proprietary - Internal Use Only"
- Add prominent Quick Start section
- Add Docker deployment instructions
- Add license badge
- Add contribution guidelines link
- Remove Lovable-specific deployment info

---

### Phase 6: Community & Licensing

**Priority:** Medium
**Effort:** Low

#### 6.1 License Selection

**Recommended: MIT License**

Reasons:
- Maximum adoption potential
- Simple and well-understood
- Compatible with commercial use (supports consulting model)
- No copyleft requirements

Alternative considerations:
- **Apache 2.0** - If patent protection is desired
- **AGPL-3.0** - If you want to prevent closed-source SaaS competitors

#### 6.2 Community Files

Create:
```
LICENSE                          # MIT license text
CONTRIBUTING.md                  # Contribution guidelines
CODE_OF_CONDUCT.md              # Community standards
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   ├── feature_request.md
│   └── question.md
├── PULL_REQUEST_TEMPLATE.md
└── FUNDING.yml                  # Optional: GitHub sponsors
```

---

### Phase 7: Final Release

**Priority:** Critical
**Effort:** Low

#### 7.1 Pre-Release Checklist

- [ ] All hardcoded credentials removed
- [ ] Billing code removed
- [ ] `.env.example` created
- [ ] Docker setup tested
- [ ] Schema consolidation complete
- [ ] Documentation updated
- [ ] License file added
- [ ] Grep for old project URLs: `grep -r "vatgianzotsurljznsry" .`
- [ ] Grep for sensitive terms: `grep -r "lovable.dev" .`

#### 7.2 Create Fresh Repository

```bash
# Remove all git history
rm -rf .git

# Initialize fresh repo
git init
git add .
git commit -m "Initial open-source release v1.0.0"

# Create GitHub repo and push
gh repo create eryxon-flow --public --source=. --push
```

#### 7.3 Release Announcement

- GitHub release with changelog
- Tag: `v1.0.0`
- Consider: Product Hunt, Hacker News, relevant subreddits

---

## Timeline Estimate

| Phase | Description | Effort |
|-------|-------------|--------|
| 1 | Remove commercial code | 2-3 hours |
| 2 | Security cleanup | 1 hour |
| 3 | Docker infrastructure | 2-4 hours |
| 4 | Schema consolidation | 2-3 hours |
| 5 | Documentation | 2-3 hours |
| 6 | Community files | 1 hour |
| 7 | Final release | 1 hour |
| **Total** | | **~12-18 hours** |

---

## Post-Release Considerations

### Consulting Opportunities

With the open-source model, consulting revenue can come from:

1. **Self-hosted Supabase setup** - Complex, good margin
2. **Custom integrations** - ERP, accounting, shipping
3. **MCP/AI automation** - Custom tools and workflows
4. **Training** - Onboarding manufacturing teams
5. **Custom features** - Industry-specific modifications
6. **Support contracts** - SLA-based support

### Future Roadmap (Community-Driven)

- Kubernetes Helm charts
- Terraform modules for cloud deployment
- Additional language translations
- Plugin system for integrations
- Mobile app (React Native)

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-tenancy | Keep | Valuable for multi-site companies |
| License | MIT | Maximum adoption |
| Default deployment | Supabase Cloud | Simplest path |
| Demo data | Use existing seeds | Already implemented |
| Plan model | Default to "premium" | Minimal schema changes |

---

*Last Updated: November 2025*
