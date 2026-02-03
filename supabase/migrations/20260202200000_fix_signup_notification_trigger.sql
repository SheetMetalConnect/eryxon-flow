-- Fix: Replace the old signup notification trigger that fired on INSERT/UPDATE/DELETE
-- on the tenants table (causing 3 emails per signup and missing user data).
--
-- Changes:
-- 1. Drop the old trigger on tenants table (fired on INSERT + UPDATE + DELETE)
-- 2. Create a new trigger on profiles table that only fires on INSERT
--    for admin users (new company signups), calling the notify-new-signup edge function
--    which includes contact person name and email in the notification.

-- Drop the old trigger that causes triple emails
DROP TRIGGER IF EXISTS "notify-new-signup" ON "public"."tenants";

-- Create the new trigger on profiles table, only for INSERT
-- This uses Supabase's database webhook pattern (supabase_functions.http_request)
-- The edge function URL and auth headers are configured via Supabase Dashboard > Database > Webhooks
--
-- To set this up in the Supabase Dashboard:
-- 1. Go to Database > Webhooks
-- 2. Create a new webhook called "notify-new-signup"
-- 3. Table: profiles, Events: INSERT only
-- 4. Type: Supabase Edge Function
-- 5. Edge Function: notify-new-signup
-- 6. Add a filter condition: record.role = 'admin' AND record.has_email_login = true
--
-- The trigger below ensures only admin profile inserts fire the webhook.
-- The edge function itself also validates role=admin as a safety check.

CREATE OR REPLACE FUNCTION public.notify_admin_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payload JSONB;
BEGIN
  -- Only notify for admin users with email login (new company signups)
  -- Skip operators, machine users, and invitation-based signups that join existing tenants
  -- Use IS NOT TRUE to correctly handle NULL values (NULL != true evaluates to NULL, not true)
  IF NEW.role != 'admin' OR NEW.has_email_login IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Check if this admin is the first user in the tenant (true signup, not invited admin)
  IF (SELECT COUNT(*) FROM public.profiles WHERE tenant_id = NEW.tenant_id) > 1 THEN
    RETURN NEW;
  END IF;

  -- Build webhook payload matching the edge function's expected format
  v_payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'profiles',
    'schema', 'public',
    'record', jsonb_build_object(
      'id', NEW.id,
      'tenant_id', NEW.tenant_id,
      'username', NEW.username,
      'full_name', NEW.full_name,
      'email', NEW.email,
      'role', NEW.role,
      'created_at', NEW.created_at
    )
  );

  -- Call the edge function via pg_net (matching existing webhook-dispatch pattern)
  PERFORM net.http_post(
    url := 'https://vatgianzotsurljznsry.supabase.co/functions/v1/notify-new-signup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := v_payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup transaction
    RAISE WARNING 'Failed to send signup notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "notify-new-signup"
  AFTER INSERT ON "public"."profiles"
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_signup();
