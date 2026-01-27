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

-- Storage policies (Idempotent using DO blocks for PG15 compatibility)
DO $$
BEGIN
    -- parts-images
    BEGIN CREATE POLICY "Authenticated users can upload part images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'parts-images'); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Authenticated users can view part images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'parts-images'); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Authenticated users can delete part images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'parts-images'); EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- issues
    BEGIN CREATE POLICY "Authenticated users can upload issue attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'issues'); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Authenticated users can view issue attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'issues'); EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- parts-cad
    BEGIN CREATE POLICY "Authenticated users can upload CAD files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'parts-cad'); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Authenticated users can view CAD files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'parts-cad'); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Authenticated users can delete CAD files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'parts-cad'); EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- batch-images
    BEGIN CREATE POLICY "Authenticated users can upload batch images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'batch-images'); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Authenticated users can view batch images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'batch-images'); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Authenticated users can delete batch images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'batch-images'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Schedule cron jobs (requires pg_cron extension)
DO $$
BEGIN
    -- Enable extension if possible
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'schedule') THEN
      -- Remove existing jobs
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
  ELSE
      RAISE NOTICE 'pg_cron extension not installed — skipping cron job scheduling.';
  END IF;
END $$;
