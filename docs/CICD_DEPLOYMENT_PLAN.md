# CI/CD Deployment Plan - Eryxon Flow

## Overview

This document outlines the CI/CD strategy for migrating from Lovable to a professional GitHub-based deployment pipeline with separate development and production environments.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GitHub Repository                                  │
│                    (SheetMetalConnect/eryxon-flow)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────────┐
            │  Feature  │   │    Dev    │   │     Main      │
            │  Branches │   │   Branch  │   │    Branch     │
            └───────────┘   └───────────┘   └───────────────┘
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────────┐
            │   Lint    │   │  Deploy   │   │    Deploy     │
            │   Build   │   │  to Dev   │   │  to Prod      │
            │   Test    │   │   Env     │   │    Env        │
            └───────────┘   └───────────┘   └───────────────┘
                                │               │
                                ▼               ▼
                        ┌───────────┐   ┌───────────────┐
                        │  Supabase │   │   Supabase    │
                        │    DEV    │   │     PROD      │
                        └───────────┘   └───────────────┘
                                │               │
                                ▼               ▼
                        ┌───────────┐   ┌───────────────┐
                        │  Netlify  │   │   Netlify     │
                        │  Preview  │   │  Production   │
                        └───────────┘   │   OR Hetzner  │
                                        └───────────────┘
```

---

## Environment Strategy

### 1. Development Environment (DEV)

**Purpose**: Testing, QA, feature acceptance before production

| Component | Service | Details |
|-----------|---------|---------|
| Frontend | Netlify (Preview) | Auto-deploy on `dev` branch pushes |
| Database | Supabase DEV Project | Separate project with seed data |
| Edge Functions | Supabase DEV | Deployed via CLI |
| URL | `dev.eryxon-flow.netlify.app` | Or custom subdomain |

**Characteristics**:
- Uses seed scripts for test data (no prod data sync needed)
- Runs full test suite before deployment
- Accessible for internal QA/acceptance testing
- Can be reset/reseeded at any time

### 2. Production Environment (PROD)

**Purpose**: Live customer-facing application

| Component | Service | Details |
|-----------|---------|---------|
| Frontend | Netlify OR Hetzner | Production domain |
| Database | Supabase PROD Project | Current production instance |
| Edge Functions | Supabase PROD | Deployed after acceptance |
| URL | `app.eryxon-flow.com` | Production domain |

**Deployment Options**:

#### Option A: Netlify (Recommended for SaaS)
- Simple, managed hosting
- Global CDN
- Easy rollbacks
- Built-in analytics

#### Option B: Hetzner (Self-hosted)
- Full control
- Lower cost at scale
- Docker-based deployment
- Required for future client self-hosting

---

## Branch Strategy

```
main (production)
  │
  └── dev (staging/acceptance)
        │
        ├── feature/xxx (feature branches)
        ├── fix/xxx (bug fixes)
        └── claude/xxx (AI-assisted development)
```

| Branch | Purpose | Deploys To | Trigger |
|--------|---------|------------|---------|
| `main` | Production releases | Production | Manual merge from `dev` |
| `dev` | Staging/acceptance | Dev environment | Auto on push |
| `feature/*` | Feature development | PR preview (optional) | PR creation |

---

## GitHub Actions Workflows

### Workflow 1: CI Pipeline (`ci.yml`)

**Triggers**: All pull requests, pushes to `dev` and `main`

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for production
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL_PROD }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY_PROD }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7

  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test
        # Note: Tests need to be set up first (see Testing Strategy section)
```

### Workflow 2: Deploy to Dev (`deploy-dev.yml`)

**Triggers**: Push to `dev` branch (after CI passes)

```yaml
# .github/workflows/deploy-dev.yml
name: Deploy to Development

on:
  push:
    branches: [dev]

jobs:
  deploy-frontend:
    name: Deploy Frontend to Dev
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for dev environment
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL_DEV }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY_DEV }}

      - name: Deploy to Netlify (Dev)
        uses: nwtgck/actions-netlify@v3
        with:
          publish-dir: './dist'
          production-deploy: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions - Dev"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID_DEV }}

  deploy-edge-functions:
    name: Deploy Edge Functions to Dev
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Deploy Edge Functions
        run: |
          supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF_DEV }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### Workflow 3: Deploy to Production (`deploy-prod.yml`)

**Triggers**: Push to `main` branch (manual merge from dev)

```yaml
# .github/workflows/deploy-prod.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    name: Deploy Frontend to Production
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for production
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL_PROD }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY_PROD }}

      - name: Deploy to Netlify (Production)
        uses: nwtgck/actions-netlify@v3
        with:
          publish-dir: './dist'
          production-deploy: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions - Production"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID_PROD }}

  deploy-edge-functions:
    name: Deploy Edge Functions to Production
    runs-on: ubuntu-latest
    environment: production
    needs: deploy-frontend
    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Deploy Edge Functions
        run: |
          supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF_PROD }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  create-release:
    name: Create Release Tag
    runs-on: ubuntu-latest
    needs: [deploy-frontend, deploy-edge-functions]
    steps:
      - uses: actions/checkout@v4

      - name: Get version from package.json
        id: version
        run: echo "VERSION=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: v${{ steps.version.outputs.VERSION }}
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## GitHub Secrets Configuration

### Required Secrets

| Secret Name | Environment | Description |
|-------------|-------------|-------------|
| `VITE_SUPABASE_URL_DEV` | Development | Dev Supabase project URL |
| `VITE_SUPABASE_ANON_KEY_DEV` | Development | Dev Supabase anon key |
| `SUPABASE_PROJECT_REF_DEV` | Development | Dev Supabase project ref |
| `NETLIFY_SITE_ID_DEV` | Development | Dev Netlify site ID |
| `VITE_SUPABASE_URL_PROD` | Production | Prod Supabase project URL |
| `VITE_SUPABASE_ANON_KEY_PROD` | Production | Prod Supabase anon key |
| `SUPABASE_PROJECT_REF_PROD` | Production | Prod Supabase project ref |
| `NETLIFY_SITE_ID_PROD` | Production | Prod Netlify site ID |
| `SUPABASE_ACCESS_TOKEN` | All | Supabase CLI access token |
| `NETLIFY_AUTH_TOKEN` | All | Netlify personal access token |

### Setting Up Secrets

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add each secret for both environments
3. Use GitHub Environments for `development` and `production` with protection rules

---

## Testing Strategy

### Phase 1: Basic Testing Setup

Add Vitest for unit/integration tests:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Update `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Phase 2: Test Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| Unit Tests | Vitest | Test utility functions, hooks |
| Component Tests | React Testing Library | Test UI components |
| Integration Tests | Vitest + MSW | Test API integrations |
| E2E Tests (Future) | Playwright | Full user flow testing |

### Recommended Test Files

```
src/
├── test/
│   ├── setup.ts              # Test setup (jsdom, mocks)
│   └── mocks/
│       └── handlers.ts       # MSW API handlers
├── lib/
│   ├── scheduler.ts
│   └── scheduler.test.ts     # Unit tests
├── hooks/
│   ├── useQRMMetrics.ts
│   └── useQRMMetrics.test.ts # Hook tests
└── components/
    └── ui/
        └── Button.test.tsx   # Component tests
```

---

## Netlify Configuration

Create `netlify.toml` in project root:

```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"

# SPA redirect - send all routes to index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "frame-ancestors 'none'"

# Cache static assets
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

## Future: Docker Containerization

For self-hosted client deployments with local Supabase:

### Dockerfile (Frontend)

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose (Full Stack Self-Hosted)

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Frontend
  eryxon-flow:
    build:
      context: .
      args:
        VITE_SUPABASE_URL: http://localhost:8000
        VITE_SUPABASE_PUBLISHABLE_KEY: ${SUPABASE_ANON_KEY}
    ports:
      - "80:80"
    depends_on:
      - supabase-kong

  # Supabase Services (simplified)
  supabase-db:
    image: supabase/postgres:15.1.0.147
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - supabase-db:/var/lib/postgresql/data

  supabase-kong:
    image: kong:2.8.1
    ports:
      - "8000:8000"
    environment:
      KONG_DATABASE: "off"
    depends_on:
      - supabase-db

  # Add more Supabase services as needed:
  # - supabase-auth
  # - supabase-rest
  # - supabase-realtime
  # - supabase-storage

volumes:
  supabase-db:
```

### GitHub Workflow for Docker Builds

```yaml
# .github/workflows/docker-build.yml
name: Build Docker Image

on:
  release:
    types: [published]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.ref_name }}
            ghcr.io/${{ github.repository }}:latest
          build-args: |
            VITE_SUPABASE_URL=__SUPABASE_URL__
            VITE_SUPABASE_PUBLISHABLE_KEY=__SUPABASE_ANON_KEY__
```

---

## Implementation Roadmap

### Phase 1: Foundation (Immediate)
- [ ] Create `dev` branch from `main`
- [ ] Set up second Supabase project for DEV environment
- [ ] Create Netlify account and sites (dev + prod)
- [ ] Configure GitHub secrets
- [ ] Implement CI workflow (`ci.yml`)
- [ ] Create `netlify.toml`

### Phase 2: Deployment Automation
- [ ] Implement dev deployment workflow (`deploy-dev.yml`)
- [ ] Implement prod deployment workflow (`deploy-prod.yml`)
- [ ] Configure GitHub Environments with protection rules
- [ ] Test full pipeline: feature → dev → prod

### Phase 3: Testing Infrastructure
- [ ] Add Vitest and React Testing Library
- [ ] Create test setup and configuration
- [ ] Write initial unit tests for critical utilities
- [ ] Add tests to CI pipeline

### Phase 4: Docker & Self-Hosting (Future)
- [ ] Create Dockerfile for frontend
- [ ] Create docker-compose for full stack
- [ ] Set up GitHub Container Registry
- [ ] Document self-hosted deployment process
- [ ] Create client deployment guide

---

## Workflow Summary

```
Developer Flow:
1. Create feature branch from `dev`
2. Make changes, commit, push
3. Create PR to `dev` → CI runs (lint, build, test)
4. Merge to `dev` → Auto-deploy to DEV environment
5. QA/Acceptance testing on DEV
6. Create PR from `dev` to `main`
7. Merge to `main` → Auto-deploy to PRODUCTION
8. Release tag created automatically
```

---

## Rollback Procedure

### Netlify Rollback
1. Go to Netlify dashboard → Deploys
2. Click on previous successful deploy
3. Click "Publish deploy"

### Git Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit (use with caution)
git reset --hard <commit-hash>
git push --force-with-lease origin main
```

---

## Monitoring & Alerts

### Recommended Tools
- **Netlify Analytics**: Built-in traffic monitoring
- **Supabase Dashboard**: Database monitoring, function logs
- **GitHub Actions**: Build/deploy status
- **Sentry** (optional): Error tracking

### Health Checks
Add a health endpoint or monitor the main app URL for uptime.

---

## Cost Considerations

| Service | Free Tier | Estimated Monthly (Growth) |
|---------|-----------|---------------------------|
| GitHub Actions | 2,000 min/month | Free for most projects |
| Netlify | 100GB bandwidth | $19/month (Pro) |
| Supabase (DEV) | 500MB DB, 1GB storage | Free tier sufficient |
| Supabase (PROD) | Current plan | Current pricing |
| Hetzner (if used) | N/A | ~$5-20/month |

---

## Next Steps

1. **Review this plan** and confirm the approach
2. **Create the Supabase DEV project** with seed data
3. **Set up Netlify** accounts and sites
4. **I can create the GitHub Actions workflows** once the plan is approved

Questions to confirm:
- Preferred production hosting: Netlify or Hetzner?
- Do you need preview deployments for PRs?
- Any specific test scenarios to prioritize?
