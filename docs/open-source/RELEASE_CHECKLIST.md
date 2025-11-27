# Open Source Release Checklist

Use this checklist to track progress toward the open-source release.

---

## Phase 1: Remove Commercial Code

### Billing & Pricing Components

- [ ] Delete `src/components/billing/StripeBillingSection.tsx`
- [ ] Remove/simplify `src/components/billing/PlanLimitsBanner.tsx`
- [ ] Remove `src/components/billing/UsageDisplay.tsx`
- [ ] Delete `src/pages/Pricing.tsx`
- [ ] Modify or delete `src/pages/MyPlan.tsx`
- [ ] Remove Stripe-related edge functions (if any)
- [ ] Remove billing waitlist table references

### Simplify Tenant Model

- [ ] Review `tenants` table - decide on plan handling
- [ ] Update `AuthContext.tsx` to default all tenants to full access
- [ ] Remove plan-based feature gating in UI components

### Remove Rate Limiting by Plan

- [ ] Simplify `supabase/functions/_shared/rate-limiter.ts`
- [ ] Remove `supabase/functions/_shared/plan-limits.ts` checks
- [ ] Update edge functions that check plan limits

### Documentation to Remove

- [ ] Delete `docs/EU_PAYMENT_BILLING_INTEGRATION_PLAN.md`
- [ ] Delete `docs/STRIPE_SETUP_GUIDE.md`
- [ ] Delete `docs/PLAN_LIMITS_IMPLEMENTATION.md`

---

## Phase 2: Security Cleanup

### Remove Hardcoded Credentials

- [ ] Fix `src/lib/upload-with-progress.ts:38-39` - use env vars
- [ ] Fix `src/lib/webhooks.ts:51` - remove fallback URL
- [ ] Update `supabase/config.toml` - use placeholder project_id
- [ ] Update `mcp-server/.env.example` - use placeholder URL
- [ ] Review `supabase/migrations/archive/` for credentials

### Create Environment Templates

- [ ] Create `.env.example` in root directory
- [ ] Update `mcp-server/.env.example` with placeholders
- [ ] Document all required environment variables

### Final Credential Audit

- [ ] Run: `grep -r "vatgianzotsurljznsry" .`
- [ ] Run: `grep -r "eyJhbGciOiJIUzI1NiI" .`
- [ ] Run: `grep -r "supabase.co" . | grep -v ".md"`
- [ ] Review any matches and fix

---

## Phase 3: Database Schema

### Create Consolidated Schema

- [ ] Merge all migrations into `supabase/schema.sql`
- [ ] Include all tables in correct order
- [ ] Include all RLS policies
- [ ] Include all functions and triggers
- [ ] Include storage bucket creation
- [ ] Test fresh database setup with schema

### Seed Data

- [ ] Verify seed functions work standalone
- [ ] Document seed function usage
- [ ] Create optional demo data script

---

## Phase 4: Docker Setup

### Application Dockerfile

- [ ] Create `Dockerfile` for React app
- [ ] Create `nginx.conf` for SPA routing
- [ ] Create `docker-compose.yml` (app only)
- [ ] Test Docker build and run

### Documentation

- [ ] Document Docker deployment in SELF_HOSTING_GUIDE.md
- [ ] Add Docker commands to QUICK_START.md

---

## Phase 5: Documentation

### Update Existing Docs

- [ ] Update `README.md` - remove proprietary notice
- [ ] Update `README.md` - add open source info
- [ ] Update `README.md` - remove Lovable references
- [ ] Review `docs/CLAUDE.md` for internal references
- [ ] Review `docs/HOW-THE-APP-WORKS.md` for billing references

### New Documentation

- [x] Create `docs/open-source/OPEN_SOURCE_RELEASE_PLAN.md`
- [x] Create `docs/open-source/SELF_HOSTING_GUIDE.md`
- [x] Create `docs/open-source/QUICK_START.md`
- [x] Create `docs/open-source/CONTRIBUTING.md`
- [x] Create `docs/open-source/RELEASE_CHECKLIST.md`

### Move Documentation (when ready)

- [ ] Move QUICK_START.md to root `docs/`
- [ ] Move SELF_HOSTING_GUIDE.md to root `docs/`
- [ ] Move CONTRIBUTING.md to root directory
- [ ] Archive or delete `docs/open-source/` folder

---

## Phase 6: Licensing & Community

### License

- [ ] Choose license (MIT recommended)
- [ ] Create `LICENSE` file in root
- [ ] Add license header to key files (optional)
- [ ] Update README with license badge

### Community Files

- [ ] Create `CODE_OF_CONDUCT.md`
- [ ] Finalize `CONTRIBUTING.md` (move to root)
- [ ] Create `.github/ISSUE_TEMPLATE/bug_report.md`
- [ ] Create `.github/ISSUE_TEMPLATE/feature_request.md`
- [ ] Create `.github/PULL_REQUEST_TEMPLATE.md`

---

## Phase 7: Final Release

### Pre-Release Audit

- [ ] Full grep for sensitive strings
- [ ] Test complete setup from scratch
- [ ] Review all files manually
- [ ] Get second pair of eyes review

### Repository Setup

- [ ] Remove `.git` directory
- [ ] Initialize fresh git repo
- [ ] Create initial commit
- [ ] Create GitHub repository
- [ ] Push to GitHub

### Post-Release

- [ ] Create GitHub release v1.0.0
- [ ] Write release notes
- [ ] Set up GitHub Actions (CI)
- [ ] Enable GitHub Discussions
- [ ] Configure issue labels

---

## Files Summary

### Files to DELETE

```
src/components/billing/StripeBillingSection.tsx
src/pages/Pricing.tsx
docs/EU_PAYMENT_BILLING_INTEGRATION_PLAN.md
docs/STRIPE_SETUP_GUIDE.md
docs/PLAN_LIMITS_IMPLEMENTATION.md
```

### Files to CREATE

```
.env.example
LICENSE
CODE_OF_CONDUCT.md
CONTRIBUTING.md (move from docs)
Dockerfile
nginx.conf
docker-compose.yml
supabase/schema.sql
.github/ISSUE_TEMPLATE/bug_report.md
.github/ISSUE_TEMPLATE/feature_request.md
.github/PULL_REQUEST_TEMPLATE.md
```

### Files to MODIFY

```
README.md
src/lib/upload-with-progress.ts
src/lib/webhooks.ts
supabase/config.toml
mcp-server/.env.example
src/contexts/AuthContext.tsx (possibly)
supabase/functions/_shared/rate-limiter.ts
supabase/functions/_shared/plan-limits.ts
```

---

## Testing Checklist

Before release, verify:

- [ ] Fresh Supabase project setup works
- [ ] Schema applies without errors
- [ ] App starts with only env vars configured
- [ ] User can sign up and become admin
- [ ] Demo data seeds correctly
- [ ] All major features work (jobs, parts, operations)
- [ ] Operator terminal functions
- [ ] API endpoints work
- [ ] MCP server connects and functions
- [ ] Docker build and run works

---

## Notes

Use this space for notes during the release process:

```
Date:
Note:
```

---

*Last Updated: November 2025*
