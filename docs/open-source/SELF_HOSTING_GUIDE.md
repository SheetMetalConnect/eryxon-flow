# Self-Hosting Guide

This guide covers how to deploy Eryxon Flow for your own use. We offer two deployment paths depending on your infrastructure preferences.

---

## Deployment Options

| Option | Complexity | Best For |
|--------|------------|----------|
| **Supabase Cloud** (Recommended) | Easy | Most users, quick setup |
| **Self-Hosted Supabase** | Advanced | Full control, air-gapped environments |

---

## Option 1: Supabase Cloud (Recommended)

This is the fastest way to get started. Supabase offers a generous free tier that works for small deployments.

### Prerequisites

- Node.js 18+ and npm
- A Supabase account ([supabase.com](https://supabase.com))
- Git

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose your organization
4. Enter project details:
   - **Name:** `eryxon-flow` (or your preference)
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Choose closest to your users
5. Click **Create new project**
6. Wait for project to be ready (~2 minutes)

### Step 2: Get Your Credentials

From your Supabase project dashboard:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (for edge functions - keep this secret!)

### Step 3: Apply Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/schema.sql`
3. Paste and click **Run**

Or using Supabase CLI:
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-id

# Push schema
supabase db push
```

### Step 4: Deploy Edge Functions

```bash
# Navigate to project
cd eryxon-flow

# Login to Supabase
supabase login

# Deploy all functions
supabase functions deploy
```

### Step 5: Configure Storage Buckets

The schema should create these automatically, but verify in **Storage**:

1. `parts-images` - For CAD files and part photos
2. `issues` - For issue attachments

If missing, create them with these settings:
- **Public:** No
- **File size limit:** 50MB
- **Allowed MIME types:** `image/*`, `application/pdf`, `model/step`

### Step 6: Clone and Configure Application

```bash
# Clone the repository
git clone https://github.com/your-org/eryxon-flow.git
cd eryxon-flow

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### Step 7: Run the Application

**Development mode:**
```bash
npm run dev
# Open http://localhost:8080
```

**Production build:**
```bash
npm run build
npm run preview
# Or serve the 'dist' folder with any static file server
```

### Step 8: Create Your First User

1. Open the application in your browser
2. Click **Sign Up**
3. Enter your email and password
4. Check your email for verification link
5. First user automatically becomes admin

### Step 9: Load Demo Data (Optional)

If you want sample data to explore:

1. Go to **Settings** → **Organization**
2. Click **Load Demo Data**
3. This uses the seed functions to create sample jobs, parts, and operations

---

## Option 2: Self-Hosted Supabase

For organizations requiring full control over their data and infrastructure.

> **Note:** This is an advanced setup. Consider our [consulting services](#need-help) for assistance.

### Prerequisites

- Docker and Docker Compose
- 4GB+ RAM
- 20GB+ disk space
- Domain name (for production)
- SSL certificates (Let's Encrypt recommended)

### Architecture Overview

Self-hosted Supabase consists of multiple services:

```
┌─────────────────────────────────────────────────────────┐
│                    Your Server                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Postgres│  │ GoTrue  │  │PostgREST │  │ Realtime │  │
│  │   DB    │  │  Auth   │  │   API    │  │   WS     │  │
│  └─────────┘  └─────────┘  └──────────┘  └──────────┘  │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐               │
│  │ Storage │  │  Kong   │  │  Studio  │               │
│  │   API   │  │ Gateway │  │ (Admin)  │               │
│  └─────────┘  └─────────┘  └──────────┘               │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │              Eryxon Flow (Frontend)             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Step 1: Clone Supabase Docker

```bash
# Clone the official Supabase docker setup
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Copy example env
cp .env.example .env
```

### Step 2: Configure Environment

Edit `.env` and set:

```env
# Generate these with: openssl rand -base64 32
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-min-32-chars
ANON_KEY=generate-using-supabase-docs
SERVICE_ROLE_KEY=generate-using-supabase-docs

# Your domain
SITE_URL=https://your-domain.com
API_EXTERNAL_URL=https://your-domain.com

# SMTP for auth emails
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_SENDER_NAME=Eryxon Flow
```

### Step 3: Generate JWT Keys

Use the Supabase JWT generator or:

```bash
# Install jwt-cli or use online tool
# ANON_KEY: role=anon
# SERVICE_ROLE_KEY: role=service_role
```

See: [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)

### Step 4: Start Supabase Services

```bash
docker compose up -d
```

Verify all services are running:
```bash
docker compose ps
```

### Step 5: Apply Schema

```bash
# Connect to postgres
docker compose exec db psql -U postgres

# Or use the Studio UI at http://localhost:3000
```

### Step 6: Configure Eryxon Flow

```bash
cd /path/to/eryxon-flow

# Create .env pointing to your self-hosted instance
cat > .env << EOF
VITE_SUPABASE_URL=https://your-domain.com
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
EOF
```

### Step 7: Deploy Application

**Option A: Docker**
```bash
# Build and run
docker build -t eryxon-flow .
docker run -p 3000:80 --env-file .env eryxon-flow
```

**Option B: Static Hosting**
```bash
npm run build
# Deploy 'dist' folder to nginx, Apache, or CDN
```

### Production Considerations

For production self-hosted deployments:

- [ ] Set up SSL/TLS (Let's Encrypt)
- [ ] Configure proper backups for PostgreSQL
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation
- [ ] Set up email delivery (transactional email service)
- [ ] Review and harden security settings
- [ ] Set up CI/CD for updates

---

## Docker Deployment (Application Only)

If you're using Supabase Cloud but want to containerize the frontend:

### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  eryxon-flow:
    build: .
    ports:
      - "3000:80"
    environment:
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_PUBLISHABLE_KEY=${SUPABASE_ANON_KEY}
    restart: unless-stopped
```

### Run with Docker Compose

```bash
# Create .env with your Supabase credentials
echo "SUPABASE_URL=https://your-project.supabase.co" > .env
echo "SUPABASE_ANON_KEY=your-anon-key" >> .env

# Build and run
docker compose up -d

# Access at http://localhost:3000
```

---

## MCP Server Setup

The MCP Server enables AI assistants (like Claude) to interact with your manufacturing data.

### Prerequisites

- Node.js 18+
- Supabase service role key

### Installation

```bash
cd mcp-server
npm install
npm run build
```

### Configuration

Create `mcp-server/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### Integration with Claude Desktop

Add to your Claude Desktop config (`~/.claude/config.json`):

```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key"
      }
    }
  }
}
```

---

## Troubleshooting

### Common Issues

**"Invalid API key" error**
- Verify your `VITE_SUPABASE_PUBLISHABLE_KEY` is correct
- Make sure you're using the `anon` key, not the `service_role` key

**"Permission denied" on database queries**
- Check that RLS policies are correctly applied
- Verify user is authenticated
- Check tenant_id matches

**Edge functions not working**
- Verify functions are deployed: `supabase functions list`
- Check function logs: `supabase functions logs function-name`
- Ensure `SERVICE_ROLE_KEY` is set in function environment

**Storage uploads failing**
- Verify buckets exist with correct names
- Check bucket policies allow authenticated uploads
- Verify file size is within limits

### Getting Help

- **GitHub Issues:** Report bugs and request features
- **Discussions:** Ask questions and share tips
- **Documentation:** Check `/docs` folder for detailed guides

---

## Need Help?

For complex deployments, custom integrations, or enterprise support:

**Consulting Services Available:**
- Self-hosted Supabase setup and hardening
- Custom ERP/accounting integrations
- MCP automation and AI workflows
- Training and onboarding
- Support contracts

Contact: [your-contact-info]

---

## Updates and Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild
npm run build

# Restart your server/container
```

### Updating Database Schema

When new migrations are released:

```bash
# Using Supabase CLI
supabase db push

# Or manually apply via SQL Editor
```

### Backup Recommendations

- **Database:** Daily automated backups (Supabase Cloud does this automatically)
- **Storage:** Regular backups of uploaded files
- **Configuration:** Keep `.env` files in secure backup

---

*Last Updated: November 2025*
