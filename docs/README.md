# Eryxon Flow Documentation

## Quick Links

- **[DEPLOY.md](../DEPLOY.md)** ⭐ - Essential deployment steps (10 min read)
- **[OPEN_SOURCE.md](OPEN_SOURCE.md)** 🔒 - Security checklist before open sourcing
- **[SELF_HOSTING_GUIDE.md](SELF_HOSTING_GUIDE.md)** - Complete self-hosting guide
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Full API reference
- **[DATABASE.md](DATABASE.md)** - Database schema reference
- **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** - UI design guidelines

## Deployment Scripts

```bash
# Security
./scripts/security/security-audit.sh         # Check for security issues
./scripts/security/clean-git-history.sh      # Remove .env from history (optional)

# Deployment
./scripts/deployment/verify-supabase-setup.sh    # Verify 85 migrations, 28 functions
./scripts/deployment/consolidate-migrations.sh   # Merge all migrations into one SQL file
```

## Essential Information

**Stack**:
- Frontend: React + TypeScript + Vite
- Backend: Supabase (PostgreSQL + Edge Functions)
- Deployment: Cloudflare Pages
- License: BSL 1.1

**Environment Variables** (Cloudflare Pages):
```
VITE_SUPABASE_URL = https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = your-anon-key
VITE_SUPABASE_PROJECT_ID = YOUR_PROJECT_ID
```

**What's Included**:
- 85 database migrations (10,080 lines SQL)
- 28 Edge Functions (complete backend API)
- Multi-tenant SaaS with RLS
- Complete UI with shadcn/ui

**Time to Deploy**: ~25 minutes

**Cost**: $0-25/mo (Cloudflare free, Supabase free tier or Pro)

---

For everything else, see individual docs in this folder.
