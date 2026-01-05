---
title: "Edge Functions Setup Guide"
description: "Documentation for Edge Functions Setup Guide"
---



This guide explains how to run and test Supabase Edge Functions locally and deploy them to production.

## Prerequisites

1. **Supabase CLI** - Install the Supabase CLI:
   ```bash
   npm install -g supabase
   # or
   brew install supabase/tap/supabase
   ```

2. **Docker** - Required for running Edge Functions locally:
   - Install Docker Desktop: https://www.docker.com/products/docker-desktop/

3. **Deno** (Optional) - For better development experience:
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

## Project Structure

Edge Functions are located in `/supabase/functions/`:
```
supabase/
├── functions/
│   ├── api-jobs/
│   │   └── index.ts
│   ├── api-parts/
│   │   └── index.ts
│   ├── api-export/          # NEW: Data export function
│   │   └── index.ts
│   └── ... (other functions)
└── config.toml
```

## Running Edge Functions Locally

### 1. Start Supabase Local Development

First, ensure you're in the project root directory:

```bash
cd /home/user/eryxon-flow
```

Initialize Supabase (if not already done):
```bash
supabase init
```

Start the local Supabase stack:
```bash
supabase start
```

This will start:
- PostgreSQL database
- Authentication service
- Edge Functions runtime
- Storage service
- Realtime service

**Note:** The first run may take several minutes as it downloads Docker images.

### 2. Serve Edge Functions

To run all Edge Functions locally:

```bash
supabase functions serve
```

To run a specific function:
```bash
supabase functions serve api-export
```

To run with environment variables:
```bash
supabase functions serve --env-file .env.local
```

### 3. Access Local Edge Functions

Local Edge Functions will be available at:
```
http://localhost:54321/functions/v1/[function-name]
```

For example:
- Jobs API: `http://localhost:54321/functions/v1/api-jobs`
- Data Export: `http://localhost:54321/functions/v1/api-export`

### 4. Testing the Data Export Function

You can test the new data export function using curl:

```bash

TOKEN="your-local-supabase-anon-key"


curl -X GET \
  "http://localhost:54321/functions/v1/api-export?entities=jobs,parts&format=json" \
  -H "Authorization: Bearer $TOKEN"
```

**Get your local anon key:**
When you run `supabase start`, it displays the anon key. You can also get it with:
```bash
supabase status
```

## Deployment to Production

### 1. Link to Your Supabase Project

```bash
supabase login
supabase link --project-ref your-project-ref
```

**Find your project ref:**
- Go to your Supabase dashboard: https://app.supabase.com
- Select your project
- Project ref is in the URL: `https://app.supabase.com/project/[PROJECT_REF]`

### 2. Deploy All Functions

Deploy all Edge Functions at once:
```bash
supabase functions deploy
```

### 3. Deploy a Specific Function

Deploy only the data export function:
```bash
supabase functions deploy api-export
```

### 4. Set Environment Variables

If your functions need environment variables (secrets):

```bash
supabase secrets set MY_SECRET_KEY=value
```

To set multiple secrets:
```bash
supabase secrets set \
  SECRET_ONE=value1 \
  SECRET_TWO=value2
```

### 5. View Deployed Functions

List all deployed functions:
```bash
supabase functions list
```

View function details:
```bash
supabase functions inspect api-export
```

## Monitoring and Logs

### View Function Logs (Local)

When running locally, logs appear in the terminal where you ran `supabase functions serve`.

### View Function Logs (Production)

View real-time logs from production:
```bash
supabase functions logs api-export
```

View logs with filters:
```bash

supabase functions logs api-export --limit 100


supabase functions logs api-export --follow
```

## Debugging Edge Functions

### 1. Add Console Logs

In your function code:
```typescript
console.log('Debug info:', someVariable);
console.error('Error occurred:', error);
```

### 2. Use Deno Debugger (Local)

Run with inspect flag:
```bash
supabase functions serve --inspect-brk api-export
```

Then connect with Chrome DevTools:
1. Open Chrome and go to `chrome://inspect`
2. Click "inspect" on your function
3. Set breakpoints and debug

### 3. Test with Different HTTP Methods

```bash

curl -X GET http://localhost:54321/functions/v1/api-export


curl -X POST http://localhost:54321/functions/v1/api-jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"job_number": "TEST-001"}'
```

## Environment Variables

### Local Development (.env.local)

Create a `.env.local` file in the project root:

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
```

### Production

Environment variables are automatically available in production:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_ANON_KEY` - Anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

Access them in your function:
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL');
```

## Common Issues and Solutions

### Issue: "Docker is not running"
**Solution:** Start Docker Desktop and wait for it to fully start.

### Issue: "Port already in use"
**Solution:** Stop the existing Supabase instance:
```bash
supabase stop
supabase start
```

### Issue: "Function not found"
**Solution:** Ensure the function is in the correct directory structure:
```
supabase/functions/[function-name]/index.ts
```

### Issue: "CORS errors"
**Solution:** Add CORS headers to your function response:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle OPTIONS preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

// Add to all responses
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

### Issue: "Authentication failed"
**Solution:** Ensure you're passing the correct Authorization header:
```bash
curl -H "Authorization: Bearer YOUR_ANON_KEY" ...
```

## Data Export Function Specifics

### Endpoint
```
GET /functions/v1/api-export
```

### Query Parameters
- `entities` - Comma-separated list of entities to export (or "all")
  - Example: `entities=jobs,parts,operations`
- `format` - Export format (json or csv)
  - Example: `format=json`

### Authentication
- Requires authenticated user (Bearer token)
- User must have admin role
- RLS automatically filters data by tenant

### Example Usage

```bash

curl -X GET \
  "https://your-project.supabase.co/functions/v1/api-export?entities=all&format=json" \
  -H "Authorization: Bearer $USER_TOKEN"


curl -X GET \
  "https://your-project.supabase.co/functions/v1/api-export?entities=jobs,parts&format=csv" \
  -H "Authorization: Bearer $USER_TOKEN"
```

### Testing Locally

1. Start Supabase:
   ```bash
   supabase start
   ```

2. Get a test user token:
   ```bash
   # Create test user (if needed)
   supabase auth signup --email test@example.com --password testpass123

   # Get session token (use the web UI or SDK)
   ```

3. Test the endpoint:
   ```bash
   curl -X GET \
     "http://localhost:54321/functions/v1/api-export?entities=jobs&format=json" \
     -H "Authorization: Bearer $TOKEN"
   ```

## Resources

- Supabase Edge Functions Docs: https://supabase.com/docs/guides/functions
- Deno Documentation: https://deno.land/manual
- Deno Deploy: https://deno.com/deploy/docs

## Quick Reference Commands

```bash

supabase start


supabase functions serve


supabase functions serve api-export


supabase functions deploy


supabase functions deploy api-export


supabase functions logs api-export


supabase stop


supabase db reset
```

## Next Steps

1. Start local Supabase: `supabase start`
2. Serve functions: `supabase functions serve`
3. Test the data export function in the UI at: `http://localhost:5173/admin/data-export`
4. Deploy to production: `supabase functions deploy api-export`

For more help, run:
```bash
supabase functions --help
```
