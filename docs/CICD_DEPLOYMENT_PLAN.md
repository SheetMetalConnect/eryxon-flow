# CI/CD Deployment Plan - Eryxon Flow

## Architecture

```
Feature Branches → main branch
       ↓               ↓
   CI Tests      Build Docker Image
                 (push to GHCR)

    ┌─────────────────────────────────────────────┐
    │          Manual Release Workflow            │
    └─────────────────────────────────────────────┘
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

| Environment | Frontend | Database | Purpose |
|-------------|----------|----------|---------|
| **DEV** | Lovable | Current Supabase | Development & testing |
| **PROD** | Docker (Hetzner) | New Supabase (EU) | Production |
| **Local** | Docker | DEV or PROD Supabase | Local testing |
| **On-Premise** | Docker | Customer Supabase | Customer deployments |

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PRs | Lint, type-check, build, test |
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
5. **Approve** the migration step (GitHub Environment protection)

---

## GitHub Secrets

| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL_PROD` | Supabase URL (EU region) |
| `VITE_SUPABASE_ANON_KEY_PROD` | Supabase anon key |
| `SUPABASE_PROJECT_REF_PROD` | Supabase project ref |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI token |

---

## Setup Steps

### 1. Create Supabase Production Project (EU)
1. Go to [supabase.com](https://supabase.com)
2. Create new project → Select **EU region** (Frankfurt)
3. Note: project URL, anon key, project ref

### 2. Configure GitHub
1. Add secrets: Settings → Secrets → Actions
2. Create Environment "production" with required reviewers

### 3. Initial Production Migration
```bash
supabase link --project-ref YOUR_PROD_PROJECT_REF
supabase db push
```

---

## Docker Image

### Pull from GHCR
```bash
# Latest
docker pull ghcr.io/sheetmetalconnect/eryxon-flow:latest

# Specific version
docker pull ghcr.io/sheetmetalconnect/eryxon-flow:1.0.0
```

### Run Locally (for testing)
```bash
docker run -p 8080:80 ghcr.io/sheetmetalconnect/eryxon-flow:latest
# Open http://localhost:8080
```

### Build Locally (custom Supabase)
```bash
docker build -t eryxon-flow \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key .

docker run -p 8080:80 eryxon-flow
```

---

## Hetzner Production Deployment

### 1. Create Server
1. [Hetzner Cloud Console](https://console.hetzner.cloud)
2. Create server: Ubuntu 24.04, CX22 (~€4/mo), EU region
3. Add SSH key

### 2. Server Setup
```bash
ssh root@YOUR_SERVER_IP

# Install Docker
curl -fsSL https://get.docker.com | sh

# Create app directory
mkdir -p /opt/eryxon-flow
cd /opt/eryxon-flow

# Login to GHCR
docker login ghcr.io -u YOUR_GITHUB_USERNAME

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
services:
  app:
    image: ghcr.io/sheetmetalconnect/eryxon-flow:latest
    container_name: eryxon-flow
    restart: unless-stopped
    expose:
      - "80"

  caddy:
    image: caddy:alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data

volumes:
  caddy_data:
EOF

# Create Caddyfile
cat > Caddyfile << 'EOF'
app.yourdomain.com {
    reverse_proxy app:80
}
EOF

# Start
docker compose up -d
```

### 3. DNS
Point `app.yourdomain.com` → Server IP. Caddy handles SSL automatically.

### 4. Update Production
```bash
cd /opt/eryxon-flow
docker compose pull
docker compose up -d --remove-orphans
```

---

## Customer On-Premise Deployment

Same Docker image, customer provides their own Supabase:

```bash
# Build with customer's Supabase
docker build -t eryxon-flow-customer \
  --build-arg VITE_SUPABASE_URL=https://customer-project.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=customer-anon-key .

# Or use docker-compose with env vars
cat > .env << EOF
SUPABASE_URL=https://customer-project.supabase.co
SUPABASE_ANON_KEY=customer-anon-key
EOF
```

---

## File Structure

```
.github/workflows/
  ci.yml              # PR checks
  deploy-prod.yml     # Main → Docker image (auto)
  release.yml         # Manual release with migrations
Dockerfile            # Multi-stage build
nginx.conf            # SPA routing
docker-compose.yml    # Simple deployment
docker-compose.prod.yml # With Caddy SSL
Caddyfile             # Caddy config
```

---

## Developer Workflow

```bash
# Development (use Lovable)
# Push to GitHub → Lovable auto-syncs

# Ready for production release
# Actions → Release → Run workflow
# Docker image built and pushed to GHCR

# Deploy to Hetzner
ssh root@server "cd /opt/eryxon-flow && docker compose pull && docker compose up -d"
```
