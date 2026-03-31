# Self-Hosting Eryxon Flow

This guide covers running Eryxon Flow with a self-hosted Supabase instance using `supabase start`.

## Prerequisites

- Docker Desktop running
- Supabase CLI (`brew install supabase/tap/supabase`)
- Node.js 20+ (for building the frontend)
- ~10 GB free Docker disk space (for Supabase images)

## Quick Start

### 1. Start local Supabase

```bash
cd eryxon-flow
supabase start
```

This starts PostgreSQL, GoTrue (auth), PostgREST, Realtime, Storage, and Studio. Migrations from `supabase/migrations/` are applied automatically.

Note the output — you'll need the **Publishable key** and **API URL** (default: `http://127.0.0.1:54321`).

### 2. Start Edge Functions

```bash
supabase functions serve
```

Required for API key generation, data export/import, webhooks, and other server-side features.

### 3. Build and run the frontend

```bash
docker build \
  --build-arg VITE_SUPABASE_URL="http://127.0.0.1:54321" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="<your-publishable-key>" \
  --build-arg VITE_SUPABASE_PROJECT_ID="local" \
  --build-arg VITE_DEFAULT_LANGUAGE="en" \
  -t eryxon-flow:local .

docker run -d --name eryxon-flow --restart unless-stopped -p 8082:80 eryxon-flow:local
```

Open http://localhost:8082

### 4. Create your first user

```sql
-- Connect to local DB
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

-- Create tenant
INSERT INTO tenants (id, name, company_name, plan, status, timezone)
VALUES (gen_random_uuid(), 'My Company', 'My Company', 'premium', 'active', 'Europe/Amsterdam')
RETURNING id;

-- Create auth user (replace <tenant-id> with the returned UUID)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data,
  email_change, email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token, recovery_token)
VALUES (
  gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
  'admin@example.com', crypt('your-password', gen_salt('bf')),
  now(), 'authenticated', 'authenticated', now(), now(), '',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  '', '', '', '', '', '', ''
) RETURNING id;

-- Update the auto-created profile (trigger creates it, we fix tenant + role)
UPDATE profiles SET
  tenant_id = '<tenant-id>',
  role = 'admin',
  is_root_admin = true,
  full_name = 'Admin User',
  active = true
WHERE id = '<user-id>';
```

## Known Issues & Workarounds

### Captcha not needed

Self-hosted Supabase has no Cloudflare Turnstile. Do **not** set `VITE_TURNSTILE_SITE_KEY` — the frontend automatically skips captcha when the key is absent.

### GoTrue NULL string columns

When manually inserting into `auth.users`, set all token/change columns to empty strings (not NULL):

```
email_change='', email_change_token_new='', email_change_token_current='',
phone_change='', phone_change_token='', reauthentication_token='', recovery_token=''
```

GoTrue crashes with `Scan error on column "email_change": converting NULL to string` if these are NULL.

### Phone uniqueness constraint

The `auth.users.phone` column has a unique constraint. When inserting multiple users, leave `phone` unset (NULL) rather than setting it to empty string `''`.

### `factory_holidays` vs `factory_calendar`

The Factory Calendar UI reads from `factory_calendar` (individual date rows with `day_type`), **not** from `factory_holidays`. To show holidays on the calendar, insert into `factory_calendar`:

```sql
INSERT INTO factory_calendar (id, tenant_id, date, day_type, name, capacity_multiplier)
VALUES (gen_random_uuid(), '<tenant-id>', '2026-04-06', 'holiday', 'Easter Monday', 0);
```

Valid `day_type` values: `'holiday'`, `'closure'`, `'half_day'`, `'working'`.

### Storage bucket mime types

The `parts-cad` bucket only allows CAD file types by default. To also store PDFs (technical drawings):

```sql
UPDATE storage.buckets
SET allowed_mime_types = '{model/step,model/stl,application/sla,application/octet-stream,model/3mf,application/pdf}'
WHERE name = 'parts-cad';
```

### File paths in `parts.file_paths`

Paths should be relative to the bucket root, **without** the bucket name prefix:

```
-- Correct:
ARRAY['MyPart/drawing.stp', 'MyPart/drawing.pdf']

-- Wrong (causes double prefix in signed URL):
ARRAY['parts-cad/MyPart/drawing.stp']
```

## Useful Commands

```bash
# Reset DB (re-apply all migrations)
supabase db reset

# Access Supabase Studio (admin UI)
open http://127.0.0.1:54323

# Direct DB access
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Backup
docker exec supabase_db_<project> pg_dump -U postgres --no-owner postgres > backup.sql

# Rebuild frontend after code changes
docker rm -f eryxon-flow
docker build --build-arg VITE_SUPABASE_URL="http://127.0.0.1:54321" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="<key>" \
  --build-arg VITE_SUPABASE_PROJECT_ID="local" \
  -t eryxon-flow:local .
docker run -d --name eryxon-flow --restart unless-stopped -p 8082:80 eryxon-flow:local
```

## Ports

| Service | Port |
|---------|------|
| Frontend (nginx) | 8082 (configurable) |
| Supabase API (Kong) | 54321 |
| PostgreSQL | 54322 |
| Supabase Studio | 54323 |
