# CI/CD Deployment Plan - Eryxon Flow

## Architecture

```
Feature Branches → dev branch → main branch
       ↓               ↓             ↓
   CI Tests      Deploy DEV     Build Docker Image
                    ↓                 ↓
              Netlify Dev      Push to GHCR
              Current Supabase       ↓
                              Deploy to Hetzner
                              New Supabase (EU)
```

## Environments

| Environment | Frontend | Database | Region | Trigger |
|-------------|----------|----------|--------|---------|
| **DEV** | Netlify | Current Supabase | US/EU | Push to `dev` |
| **PROD** | Hetzner (Docker) | New Supabase | EU | Push to `main` |

## Branch Strategy

- `main` - Production releases (protected)
- `dev` - Development/staging
- `feature/*`, `fix/*`, `claude/*` - Working branches → PR to `dev`

## Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | All PRs | Lint, type-check, build, test |
| `deploy-dev.yml` | Push to `dev` | Build → Netlify + Supabase Edge Functions |
| `deploy-prod.yml` | Push to `main` | Build Docker → GHCR → Hetzner + Supabase Edge Functions |

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
| `VITE_SUPABASE_URL_PROD` | New Supabase URL (EU) |
| `VITE_SUPABASE_ANON_KEY_PROD` | New Supabase anon key |
| `SUPABASE_PROJECT_REF_PROD` | New project ref |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI token |
| `HETZNER_HOST` | Hetzner server IP |
| `HETZNER_USERNAME` | SSH username (e.g., `root`) |
| `HETZNER_SSH_KEY` | SSH private key |

---

## Hetzner Server Setup

### 1. Create Server

1. Go to [Hetzner Cloud Console](https://console.hetzner.cloud)
2. Create new project or use existing
3. Add server:
   - **Location**: EU (Falkenstein, Nuremberg, or Helsinki)
   - **Image**: Ubuntu 24.04
   - **Type**: CX22 (~€4/month) or CX32 for more resources
   - **SSH Key**: Add your public key

### 2. Initial Server Setup

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Create app directory
mkdir -p /opt/eryxon-flow
cd /opt/eryxon-flow

# Login to GitHub Container Registry
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
      - caddy_config:/config
    depends_on:
      - app

volumes:
  caddy_data:
  caddy_config:
EOF

# Create Caddyfile (replace domain)
cat > Caddyfile << 'EOF'
app.yourdomain.com {
    reverse_proxy app:80
}
EOF

# Start services
docker compose up -d
```

### 3. DNS Configuration

Point your domain to the Hetzner server IP:
```
A    app.yourdomain.com    YOUR_SERVER_IP
```

Caddy will automatically obtain SSL certificates from Let's Encrypt.

---

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

# Create PR to dev → CI runs
# Merge to dev → Deploys to DEV (Netlify)
# Test on DEV
# Create PR from dev to main
# Merge to main → Builds Docker → Deploys to PROD (Hetzner)
```

---

## Docker Commands

### Local Development
```bash
# Build locally
docker build -t eryxon-flow \
  --build-arg VITE_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=xxx .

# Run locally
docker run -p 8080:80 eryxon-flow
```

### Production
```bash
# Pull latest image
docker pull ghcr.io/sheetmetalconnect/eryxon-flow:latest

# View logs
docker logs -f eryxon-flow

# Restart
docker compose restart

# Full redeploy
docker compose pull && docker compose up -d --remove-orphans
```

---

## File Structure

```
.github/
  workflows/
    ci.yml              # PR checks
    deploy-dev.yml      # Dev deployment (Netlify)
    deploy-prod.yml     # Prod deployment (Docker → Hetzner)
Dockerfile              # Multi-stage build
nginx.conf              # SPA routing config
docker-compose.yml      # Simple deployment
docker-compose.prod.yml # Production with Caddy/SSL
Caddyfile               # Caddy reverse proxy config
netlify.toml            # Netlify config (dev)
```

---

## Future: Client Self-Hosted Deployments

For clients wanting fully self-hosted (including Supabase):

```yaml
# docker-compose.selfhosted.yml (future)
services:
  app:
    image: ghcr.io/sheetmetalconnect/eryxon-flow:latest
    # ... app config

  # Supabase stack
  postgres:
    image: supabase/postgres:15.1.0.147
  kong:
    image: kong:2.8.1
  auth:
    image: supabase/gotrue:latest
  rest:
    image: postgrest/postgrest:latest
  realtime:
    image: supabase/realtime:latest
  storage:
    image: supabase/storage-api:latest

  # Redis (when PR merged)
  redis:
    image: redis:alpine
```

---

## Monitoring

### Health Check
```bash
curl https://app.yourdomain.com/health
```

### Docker Status
```bash
docker ps
docker stats
docker logs eryxon-flow --tail 100
```

### Supabase
- Monitor via Supabase Dashboard
- Edge Function logs in Dashboard → Functions → Logs
