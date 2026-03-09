-- Fix: Replace the old signup notification trigger that fired on INSERT/UPDATE/DELETE
-- on the tenants table (causing 3 emails per signup and missing user data).
--
-- Changes:
-- 1. Drop the old trigger on tenants table (fired on INSERT + UPDATE + DELETE)
-- 2. Remove any previously hardcoded profile trigger/function implementation
-- 3. Require environment-specific webhook setup outside the migration so this
--    remains portable across hosted and self-hosted deployments.

-- Drop the old trigger that causes triple emails
DROP TRIGGER IF EXISTS "notify-new-signup" ON "public"."tenants";

-- Drop any previous implementation that hardcoded a specific project URL.
DROP TRIGGER IF EXISTS "notify-new-signup" ON "public"."profiles";
DROP FUNCTION IF EXISTS public.notify_admin_signup();

DO $$
BEGIN
  RAISE NOTICE
    'Manual setup required: create a Database Webhook named "notify-new-signup" for INSERT on public.profiles, targeting the notify-new-signup edge function, with filter record.role = ''admin'' AND record.has_email_login = true.';
END;
$$;
