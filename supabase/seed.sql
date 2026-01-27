-- ============================================================
-- Eryxon MES Seed File
-- Run after migrations to set up storage and cron jobs
-- ============================================================

-- Create storage buckets (idempotent - skip if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('parts-images', 'parts-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('issues', 'issues', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('parts-cad', 'parts-cad', false, 104857600, ARRAY['model/step', 'model/stl', 'application/sla', 'application/octet-stream', 'model/3mf']),
  ('batch-images', 'batch-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
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

-- Storage policies for batch-images bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload batch images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'batch-images');

CREATE POLICY IF NOT EXISTS "Authenticated users can view batch images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'batch-images');

CREATE POLICY IF NOT EXISTS "Authenticated users can delete batch images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'batch-images');

-- Schedule cron jobs (requires pg_cron extension)
-- Entire block is wrapped in exception handling so the seed file
-- succeeds even when pg_cron is not available (e.g. local dev).
DO $$
BEGIN
  -- Remove existing jobs if present (idempotent)
  PERFORM cron.unschedule('monthly-parts-reset') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-parts-reset');
  PERFORM cron.unschedule('check-jobs-due-soon') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-jobs-due-soon');
  PERFORM cron.unschedule('auto-close-attendance') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-close-attendance');
  PERFORM cron.unschedule('cleanup-expired-invitations') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-invitations');
  PERFORM cron.unschedule('cleanup-mqtt-logs') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-mqtt-logs');

  -- Schedule jobs
  PERFORM cron.schedule('monthly-parts-reset',        '0 0 1 * *',  'SELECT reset_monthly_parts_counters()');
  PERFORM cron.schedule('check-jobs-due-soon',        '0 8 * * *',  'SELECT check_jobs_due_soon()');
  PERFORM cron.schedule('auto-close-attendance',      '0 0 * * *',  'SELECT auto_close_stale_attendance()');
  PERFORM cron.schedule('cleanup-expired-invitations','0 2 * * *',  'SELECT cleanup_expired_invitations()');
  PERFORM cron.schedule('cleanup-mqtt-logs',          '0 3 * * 0',  'SELECT cleanup_old_mqtt_logs()');

  RAISE NOTICE 'pg_cron jobs scheduled successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — skipping cron job scheduling: %', SQLERRM;
END;
$$;
