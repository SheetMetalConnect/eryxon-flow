-- Fix: Replace the old signup notification trigger that fired on INSERT/UPDATE/DELETE
-- on the tenants table (causing 3 emails per signup and missing user data).
--
-- Changes:
-- 1. Drop the old trigger on tenants table (fired on INSERT + UPDATE + DELETE)
-- 2. The new webhook should be configured via Supabase Dashboard (Database > Webhooks)
--    to call the notify-new-signup edge function on profiles INSERT events.
--    This avoids hardcoding URLs and lets Supabase handle auth automatically.

-- Drop the old trigger that causes triple emails
DROP TRIGGER IF EXISTS "notify-new-signup" ON "public"."tenants";

-- Drop any existing notify_admin_signup function/trigger if present
DROP TRIGGER IF EXISTS "notify-new-signup" ON "public"."profiles";
DROP FUNCTION IF EXISTS public.notify_admin_signup();

-- =============================================================================
-- WEBHOOK SETUP INSTRUCTIONS (Supabase Dashboard)
-- =============================================================================
-- 1. Go to Supabase Dashboard > Database > Webhooks
-- 2. Click "Create a new webhook"
-- 3. Configure:
--    - Name: notify-new-signup
--    - Table: profiles
--    - Events: INSERT only (uncheck UPDATE and DELETE)
--    - Type: Supabase Edge Functions
--    - Edge Function: notify-new-signup
--    - HTTP Headers: (leave default, Supabase adds auth automatically)
-- 4. Save the webhook
--
-- The edge function (notify-new-signup) handles all validation:
--   - Only processes admin role
--   - Validates required data exists
--   - Escapes HTML to prevent XSS
--   - Only sends email if SIGNUP_NOTIFY_EMAIL secret is set
-- =============================================================================
