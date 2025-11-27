# CI/CD Deployment Plan - Eryxon Flow

## Architecture

```
Feature Branches → dev branch → main branch
       ↓               ↓             ↓
   CI Tests      Deploy DEV     Deploy PROD
                    ↓                ↓
              Current Supabase   New Supabase
              Netlify Dev        Netlify Prod / Hetzner
```

## Environments

| Environment | Frontend | Database | Trigger |
|-------------|----------|----------|---------|
| **DEV** | Netlify | Current Supabase project | Push to `dev` |
| **PROD** | Netlify or Hetzner | New Supabase project (TBD) | Push to `main` |

## Branch Strategy

- `main` - Production releases (protected)
- `dev` - Development/staging environment
- `feature/*`, `fix/*`, `claude/*` - Working branches → PR to `dev`

## Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | All PRs | Lint, type-check, build, test |
| `deploy-dev.yml` | Push to `dev` | Build + deploy to Netlify DEV + Supabase Edge Functions |
| `deploy-prod.yml` | Push to `main` | Build + deploy to Netlify PROD + Supabase Edge Functions |

## Required GitHub Secrets

### Development Environment
- `VITE_SUPABASE_URL_DEV` - Current Supabase URL
- `VITE_SUPABASE_ANON_KEY_DEV` - Current Supabase anon key
- `SUPABASE_PROJECT_REF_DEV` - Current project ref (`vatgianzotsurljznsry`)
- `NETLIFY_SITE_ID_DEV` - Netlify dev site ID

### Production Environment
- `VITE_SUPABASE_URL_PROD` - New Supabase URL (configure when ready)
- `VITE_SUPABASE_ANON_KEY_PROD` - New Supabase anon key
- `SUPABASE_PROJECT_REF_PROD` - New project ref
- `NETLIFY_SITE_ID_PROD` - Netlify prod site ID

### Shared
- `SUPABASE_ACCESS_TOKEN` - Supabase CLI token (from supabase.com/dashboard/account/tokens)
- `NETLIFY_AUTH_TOKEN` - Netlify personal access token

## Setup Steps

1. **Create Netlify sites**
   - Create dev site (e.g., `eryxon-flow-dev`)
   - Create prod site (e.g., `eryxon-flow` or custom domain)

2. **Get Netlify credentials**
   - Go to User Settings → Applications → Personal access tokens
   - Copy site IDs from Site Settings → General

3. **Get Supabase access token**
   - Go to supabase.com/dashboard/account/tokens
   - Generate new token for CLI access

4. **Configure GitHub secrets**
   - Go to repo Settings → Secrets and variables → Actions
   - Add all secrets listed above

5. **Create `dev` branch**
   ```bash
   git checkout main
   git checkout -b dev
   git push -u origin dev
   ```

6. **Set branch protection** (optional)
   - Require PR reviews for `main`
   - Require status checks to pass

## Developer Workflow

```bash
# Start new feature
git checkout dev
git pull origin dev
git checkout -b feature/my-feature

# Work on feature...
git add .
git commit -m "feat: add feature"
git push -u origin feature/my-feature

# Create PR to dev → CI runs automatically
# Merge to dev → Deploys to DEV environment
# Test on DEV environment
# Create PR from dev to main → Deploys to PROD
```

## Future: Docker Self-Hosted

For client self-hosted deployments, build Docker image:

```bash
docker build -t eryxon-flow \
  --build-arg VITE_SUPABASE_URL=http://localhost:8000 \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=your-key .
```

See `Dockerfile` and `docker-compose.yml` (to be created when needed).
