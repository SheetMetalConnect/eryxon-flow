# Eryxon Flow - Self-Hosted Deployment

Deploy Eryxon Flow on your own infrastructure with unlimited usage.

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow/selfhost

# 2. Copy and configure environment
cp .env.example .env

# 3. Start all services
docker compose up -d
```

**That's it!** Open http://localhost:8000 in your browser.

## Default Credentials

- **Dashboard**: `supabase` / `this_password_is_insecure_and_should_be_updated`
- **API Key** (anon): Found in `.env` as `ANON_KEY`

## Production Checklist

Before going live, update these values in `.env`:

1. `POSTGRES_PASSWORD` - Strong database password
2. `JWT_SECRET` - 32+ character secret
3. `DASHBOARD_PASSWORD` - Dashboard login password
4. `VAULT_ENC_KEY` - 32+ character encryption key
5. `SITE_URL` - Your actual domain (e.g., `https://flow.yourcompany.com`)
6. `API_EXTERNAL_URL` - Your API URL (e.g., `https://api.yourcompany.com`)

## Architecture

The stack includes:
- **PostgreSQL** - Database
- **PostgREST** - REST API
- **GoTrue** - Authentication
- **Realtime** - WebSocket subscriptions
- **Storage** - File storage
- **Kong** - API Gateway
- **Studio** - Admin dashboard
- **Eryxon Flow** - MES Application

## Common Commands

```bash
# Stop all services
docker compose down

# View logs
docker compose logs -f

# Reset database (destroys all data!)
docker compose down -v
docker compose up -d
```

## License

Self-hosted Eryxon Flow is free under BSL 1.1. See LICENSE for details.
