-- Migration: Setup for new signup notifications
--
-- This migration documents the setup needed for admin notifications on new signups.
-- The actual webhook is configured via Supabase Dashboard (not SQL) for security.
--
-- ============================================================================
-- SETUP INSTRUCTIONS (Manual steps in Supabase Dashboard)
-- ============================================================================
--
-- STEP 1: Deploy the Edge Function
-- --------------------------------
-- Run: supabase functions deploy notify-new-signup
--
-- STEP 2: Set Edge Function Secrets
-- ---------------------------------
-- Go to: Supabase Dashboard > Settings > Edge Functions > Secrets
-- Add these secrets:
--   - RESEND_API_KEY: Your Resend API key
--   - ADMIN_NOTIFICATION_EMAIL: Email to receive signup notifications (e.g., admin@yourcompany.com)
--   - APP_URL: Your app URL (e.g., https://app.eryxon.eu)
--
-- STEP 3: Create Database Webhook
-- -------------------------------
-- Go to: Supabase Dashboard > Database > Webhooks > Create webhook
-- Configure:
--   - Name: notify-new-signup
--   - Table: tenants
--   - Events: INSERT
--   - Type: Supabase Edge Function
--   - Edge Function: notify-new-signup
--   - HTTP Headers: (leave default)
--
-- ============================================================================
-- ALTERNATIVE: pg_net approach (for programmatic setup)
-- ============================================================================
-- If you prefer to set up via SQL instead of Dashboard webhooks,
-- uncomment and configure the code below. This requires:
-- 1. Enable pg_net extension
-- 2. Set database secrets for Supabase URL and service key
--
-- Note: Dashboard webhooks are recommended as they're easier to maintain.

-- Enable pg_net extension (uncomment if using SQL approach)
-- CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to send notification (using database webhook approach)
-- This is called by Supabase's database webhook feature automatically
-- No custom trigger needed when using Dashboard webhooks!

-- Add helpful comment
COMMENT ON TABLE public.tenants IS
'Tenant organizations. New tenant INSERT triggers admin notification via database webhook.
Setup: See migration 20260111190249_notify_new_signup_webhook.sql for instructions.';
