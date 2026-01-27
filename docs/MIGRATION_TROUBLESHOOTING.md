# Database Migration & Self-Hosting Troubleshooting Log

This document records issues encountered during the initial self-hosting setup and migration of the Eryxon MES database, along with their solutions.

## 1. Supabase CLI Authentication (CI/CD / Scripted Context)

**Issue:**
The `scripts/setup.sh` relies on `supabase login`, which is interactive. In automated environments or when using an AI agent, the interactive login is not possible.

**Solution:**
Use the **Database Password** to authenticate directly.
To use the CLI non-interactively:
1. Export the password: `export SUPABASE_DB_PASSWORD='your-password'`
2. Link the project: `supabase link --project-ref <project-id>`

> **Note:** If your password contains special characters (like `#`), it must be properly URL-encoded if used in connection strings, though the environment variable usually handles it for the CLI.

## 2. "Type already exists" / Schema Conflicts

**Issue:**
When running `supabase db push`, the error `ERROR: type "app_role" already exists` appeared. This happens when the target database already has some tables/types (partial state), but the migration tries to create them again without `IF NOT EXISTS` guards (or if the migration system assumes a clean state).

**Solution:**
**Hard Reset of the Public Schema.**
If this is a fresh setup or a test database, wipe the `public` schema to ensure a clean slate before applying migrations.

```sql
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
```

After running this SQL, run `supabase db push` again.

## 3. Migration History Conflicts

**Issue:**
`supabase db push` failed with "Remote migration versions not found in local migrations directory." This occurs when the `supabase_migrations.schema_migrations` table on the remote DB tracks a version that you don't have locally, or vice versa.

**Solution:**
Repair the migration history. If you know the remote state is invalid or you want to force a re-push:

```bash
supabase migration repair --status reverted <version_id>
```

This tells Supabase to treat that version as "not applied," allowing `db push` to try applying it again.

## 4. `supabase/config.toml` Parsing Errors

**Issue:**
The CLI returned: `failed to parse config: 'functions[verify_jwt]' expected a map or struct, got "bool"`.
This was caused by the line `verify_jwt = false` in the `[functions]` section of `supabase/config.toml`, which may be deprecated or incorrect for the specific CLI version.

**Solution:**
Comment out or remove the offending line in `supabase/config.toml`.

```toml
[functions]
# verify_jwt = false  <-- Commented out
```

Also, the `[project]` section with an empty `id` can sometimes cause validation errors. It is safe to comment it out if you are linking via command flags.

## 5. Storage Bucket Verification Failures (HTTP 400)

**Issue:**
The `scripts/verify-setup.sh` script reported `[FAIL] Storage bucket 'parts-images' exists (HTTP 400)`.
This is a **false negative**. The verification script often uses the `anon` key. If the buckets are created with `public: false` (private buckets), the anon key cannot confirm their existence via the REST API, resulting in a 400/401/403 error.

**Solution:**
Verify buckets via SQL:
```sql
SELECT * FROM storage.buckets;
```
If they appear there, they are created.

## 6. Seed Script Connection Strings

**Issue:**
When writing a custom Node.js script to run `seed.sql` using `pg`, the connection failed with `TypeError: Invalid URL`.
**Cause:** The database password contained a `#` character, which breaks standard URL parsing if not encoded.

**Solution:**
Always `encodeURIComponent` the password when building a connection string in code:

```javascript
const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
const connectionString = `postgres://postgres:${password}@db.projectref.supabase.co:5432/postgres`;
```

## 7. Missing `on_auth_user_created` Trigger

**Issue:**
New users sign up successfully (appear in `auth.users`) but no tenant or profile is created. Login fails because the application expects a profile row.

**Cause:**
When the `public` schema was reset (via `DROP SCHEMA public CASCADE`), the trigger `on_auth_user_created` on `auth.users` was NOT dropped (it's in the `auth` schema), BUT after the schema was recreated, the trigger still references the OLD function OID which no longer exists. Alternatively, the migration that creates the trigger is missing from the main schema file.

**Solution:**
Recreate the trigger manually or via migration:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Prevention:**
A migration (`20260127232000_add_missing_auth_trigger.sql`) has been added to ensure this trigger is always created.
