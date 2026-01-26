-- ============================================================
-- Eryxon MES Seed File
-- Run after migrations to set up storage and cron jobs
-- ============================================================

-- Create storage buckets (idempotent - skip if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('parts-images', 'parts-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('issues', 'issues', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('parts-cad', 'parts-cad', false, 104857600, ARRAY['model/step', 'model/stl', 'application/sla', 'application/octet-stream', 'model/3mf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for parts-images bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload part images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'parts-images');

CREATE POLICY IF NOT EXISTS "Authenticated users can view part images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'parts-images');

CREATE POLICY IF NOT EXISTS "Authenticated users can delete part images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'parts-images');

-- Storage policies for issues bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload issue attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'issues');

CREATE POLICY IF NOT EXISTS "Authenticated users can view issue attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'issues');

-- Storage policies for parts-cad bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload CAD files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'parts-cad');

CREATE POLICY IF NOT EXISTS "Authenticated users can view CAD files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'parts-cad');

CREATE POLICY IF NOT EXISTS "Authenticated users can delete CAD files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'parts-cad');

-- Schedule cron jobs (requires pg_cron extension)
-- Monthly reset of parts counter (1st of each month at midnight UTC)
SELECT cron.schedule(
  'monthly-parts-reset',
  '0 0 1 * *',
  $$SELECT reset_monthly_parts_counters()$$
);

-- Check for jobs due soon (daily at 8am UTC)
SELECT cron.schedule(
  'check-jobs-due-soon',
  '0 8 * * *',
  $$SELECT check_jobs_due_soon()$$
);

-- Auto-close stale attendance entries (daily at midnight UTC)
SELECT cron.schedule(
  'auto-close-attendance',
  '0 0 * * *',
  $$SELECT auto_close_stale_attendance()$$
);

-- Cleanup expired invitations (daily at 2am UTC)
SELECT cron.schedule(
  'cleanup-expired-invitations',
  '0 2 * * *',
  $$SELECT cleanup_expired_invitations()$$
);

-- Cleanup old MQTT logs (weekly on Sunday at 3am UTC)
SELECT cron.schedule(
  'cleanup-mqtt-logs',
  '0 3 * * 0',
  $$SELECT cleanup_old_mqtt_logs()$$
);
