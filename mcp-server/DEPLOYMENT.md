# MCP Server Deployment Guide

## Architecture Overview

```
┌─────────────────┐
│  Claude Desktop │
│  (User's Mac)   │
└────────┬────────┘
         │ MCP Protocol (SSE)
         ▼
┌─────────────────────────────┐
│  Your Hosted MCP Server     │
│  (Railway/Fly.io/Render)    │
│  - Multi-tenant            │
│  - API key authentication  │
└────────┬────────────────────┘
         │ REST API (Bearer token)
         ▼
┌─────────────────────────────┐
│  Supabase Edge Functions    │
│  - Tenant isolation (RLS)   │
│  - API endpoints            │
└─────────────────────────────┘
```

## Deployment Options

### Option 1: Railway (Recommended)

**Why Railway:**
- ✅ Zero-config deployments
- ✅ Automatic HTTPS
- ✅ Built-in monitoring
- ✅ $5/month starter plan

**Deploy:**

1. Install Railway CLI:
```bash
npm install -g @railway/cli
railway login
```

2. Deploy from `mcp-server` directory:
```bash
cd mcp-server
railway init
railway up
```

3. Set environment variables in Railway dashboard:
```
ERYXON_API_URL=https://your-project.supabase.co
OPENAI_API_KEY=sk-...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

4. Get your MCP URL:
```
https://your-mcp-server.railway.app
```

### Option 2: Fly.io

**Why Fly.io:**
- ✅ Global edge deployment
- ✅ Free tier available
- ✅ Excellent performance

**Deploy:**

1. Install Fly CLI:
```bash
brew install flyctl
flyctl auth login
```

2. Create `fly.toml` in `mcp-server/`:
```toml
app = "eryxon-mcp"
primary_region = "iad"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8080"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
```

3. Deploy:
```bash
flyctl launch
flyctl secrets set ERYXON_API_URL=https://your-project.supabase.co
flyctl secrets set OPENAI_API_KEY=sk-...
flyctl deploy
```

### Option 3: Render

**Deploy:**

1. Create `render.yaml`:
```yaml
services:
  - type: web
    name: eryxon-mcp
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: ERYXON_API_URL
        value: https://your-project.supabase.co
      - key: OPENAI_API_KEY
        sync: false
      - key: PORT
        value: 10000
```

2. Connect repo to Render dashboard

### Option 4: Docker (Self-Host)

**Dockerfile** (already exists):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

**Deploy:**
```bash
docker build -t eryxon-mcp ./mcp-server
docker run -d -p 3000:3000 \
  -e ERYXON_API_URL=https://your-project.supabase.co \
  -e OPENAI_API_KEY=sk-... \
  eryxon-mcp
```

---

## User Configuration

Once deployed, users configure Claude Desktop to connect to YOUR hosted MCP server:

**User's Claude Desktop config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-everything",
        "mcp-proxy",
        "https://your-mcp-server.railway.app"
      ],
      "env": {
        "ERYXON_API_KEY": "ery_live_xxxxx"
      }
    }
  }
}
```

**What users need:**
1. Your hosted MCP URL
2. Their API key from your app (Settings → API Keys)

---

## Frontend Integration

### 1. Add MCP Status Indicator

Add to your nav component:

```tsx
// src/components/MCPStatusIndicator.tsx
import { useQuery } from '@tanstack/react-query';

export function MCPStatusIndicator() {
  const { data: status } = useQuery({
    queryKey: ['mcp-status'],
    queryFn: async () => {
      const response = await fetch('https://your-mcp-server.railway.app/health');
      return response.ok;
    },
    refetchInterval: 30000, // Check every 30s
  });

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${status ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-sm text-muted-foreground">
        MCP {status ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
```

### 2. MCP Setup Instructions Page

Create a page at `/settings/mcp-integration` with:
- Copy-paste Claude Desktop config
- User's API key (auto-filled)
- Status check
- Troubleshooting

---

## Monitoring

### Health Check Endpoint

The MCP server exposes `/health`:

```bash
curl https://your-mcp-server.railway.app/health
# Returns: {"status": "ok", "mode": "api", "version": "2.4.0"}
```

### Metrics to Monitor

- Request rate per API key
- Error rates
- Response times
- Active connections

---

## Security

### API Key Validation

The MCP server validates API keys via your API:

```
User's Claude Desktop
  → MCP Server (Bearer: ery_live_xxx)
  → Your API (/api-jobs with Bearer: ery_live_xxx)
  → Supabase (validates key + RLS)
```

**Security benefits:**
- ✅ Tenant isolation via RLS
- ✅ No direct database access
- ✅ API keys can be revoked instantly
- ✅ Usage tracking per tenant

### Rate Limiting

Add rate limiting in your Edge Functions or use Upstash Rate Limit:

```bash
npm install @upstash/ratelimit @upstash/redis
```

---

## Costs

**Railway Starter Plan ($5/month):**
- ✅ Handles 100+ concurrent users
- ✅ Automatic scaling
- ✅ Included metrics

**Additional costs:**
- Upstash Redis: $0-10/month (optional caching)
- OpenAI API: Pay-per-use for AI features

---

## Next Steps

1. Deploy MCP server to Railway
2. Add health endpoint to your app nav
3. Create `/settings/mcp-integration` page
4. Test with your own Claude Desktop
5. Document for users
6. Monitor usage and errors
