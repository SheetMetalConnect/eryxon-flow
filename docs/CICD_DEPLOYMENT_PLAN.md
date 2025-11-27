# CI/CD Deployment Plan - Eryxon Flow

## Architecture

```
Feature Branches → dev branch → main branch
       ↓               ↓             ↓
   CI Tests      Deploy DEV     Build Docker Image
                 (Netlify)      (auto push to GHCR)
                    ↓
              Current Supabase

                    ┌─────────────────────────────┐
                    │   Manual Release Workflow   │
                    └─────────────────────────────┘
                                 ↓
                        1. Run Tests
                                 ↓
                        2. Run Migrations (optional)
                                 ↓
                        3. Deploy Edge Functions
                                 ↓
                        4. Build & Push Docker Image
                                 ↓
                        5. Create GitHub Release
```

## Environments

| Environment | Frontend | Database | Trigger |
|-------------|----------|----------|---------|
| **DEV** | Netlify | Current Supabase | Push to `dev` |
| **PROD** | Docker Image (GHCR) | New Supabase (EU) | Manual release workflow |

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PRs to dev/main | Lint, type-check, build, test |
| `deploy-dev.yml` | Push to `dev` | Auto-deploy frontend to Netlify |
| `deploy-prod.yml` | Push to `main` | Auto-build Docker image to GHCR |
| `release.yml` | **Manual** | Full controlled release with migrations |

---

## Release Process

### Quick Release (no migrations)
1. Go to **Actions → Release → Run workflow**
2. Set `run_migrations: false`
3. Set `deploy_functions: true`
4. Click **Run workflow**

### Full Release (with migrations)
1. Go to **Actions → Release → Run workflow**
2. Set `run_migrations: true`
3. Set `deploy_functions: true`
4. Click **Run workflow**
5. **Approve** the migration step when prompted (GitHub Environment protection)

### Release Steps
```
1. Run Tests         → Lint, type-check, build, unit tests
2. Run Migrations    → (if enabled) supabase db push to PROD
3. Deploy Functions  → (if enabled) Deploy Edge Functions to PROD
4. Build Image       → Build Docker with PROD config → push to GHCR
5. Create Release    → Tag version, generate changelog
```

---

## GitHub Secrets

### Development
| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL_DEV` | Current Supabase URL |
| `VITE_SUPABASE_ANON_KEY_DEV` | Current Supabase anon key |
| `SUPABASE_PROJECT_REF_DEV` | `vatgianzotsurljznsry` |
| `NETLIFY_SITE_ID_DEV` | Netlify dev site ID |
| `NETLIFY_AUTH_TOKEN` | Netlify personal access token |

### Production
| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL_PROD` | New Supabase URL (EU region) |
| `VITE_SUPABASE_ANON_KEY_PROD` | New Supabase anon key |
| `SUPABASE_PROJECT_REF_PROD` | New Supabase project ref |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI token |

---

## Setup Steps

### 1. Create Supabase Production Project (EU)
1. Go to [supabase.com](https://supabase.com)
2. Create new project → Select **EU region** (Frankfurt)
3. Note: project URL, anon key, project ref

### 2. Create Netlify Dev Site
1. Go to [netlify.com](https://netlify.com)
2. Create site for dev environment
3. Get site ID and personal access token

### 3. Configure GitHub
1. Add secrets: Settings → Secrets → Actions
2. Create Environment "production" with required reviewers
3. Create `dev` branch from `main`

### 4. Initial Production Migration
```bash
supabase link --project-ref YOUR_PROD_PROJECT_REF
supabase db push
```

---

## Docker Image

### Available at GHCR
```bash
# Latest
docker pull ghcr.io/sheetmetalconnect/eryxon-flow:latest

# Specific version
docker pull ghcr.io/sheetmetalconnect/eryxon-flow:1.0.0

# By commit SHA
docker pull ghcr.io/sheetmetalconnect/eryxon-flow:abc1234
```

### Run Anywhere
```bash
docker run -d -p 80:80 ghcr.io/sheetmetalconnect/eryxon-flow:latest
```

---

## Future: Hetzner Deployment

When ready, add deploy step to `release.yml`:

1. Create Hetzner server (CX22, ~€4/mo, EU)
2. Install Docker on server
3. Add secrets: `HETZNER_HOST`, `HETZNER_USERNAME`, `HETZNER_SSH_KEY`
4. Use prepared files:
   - `docker-compose.prod.yml` - With Caddy SSL
   - `Caddyfile` - Reverse proxy

---

## File Structure

```
.github/workflows/
  ci.yml              # PR checks
  deploy-dev.yml      # Dev → Netlify (auto)
  deploy-prod.yml     # Main → Docker image (auto)
  release.yml         # Manual release with migrations
Dockerfile            # Multi-stage build
nginx.conf            # SPA routing
docker-compose.yml    # Simple deployment
docker-compose.prod.yml # With Caddy SSL
Caddyfile             # Caddy config
netlify.toml          # Netlify config
```

---

## Developer Workflow

```bash
# Daily development
git checkout dev && git pull
git checkout -b feature/my-feature
# ... work ...
git push -u origin feature/my-feature
# Create PR → CI runs → Merge → Auto-deploys to Netlify DEV

# Ready for production
# Create PR: dev → main → Merge → Auto-builds Docker image
# Then: Actions → Release → Run workflow (choose options)
```
