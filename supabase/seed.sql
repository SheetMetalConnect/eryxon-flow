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
    -- Drop legacy policies without tenant isolation
    DROP POLICY IF EXISTS "Anyone can upload to parts-images" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can read from parts-images" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can delete from parts-images" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload to issues" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can read from issues" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can delete from issues" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload to parts-cad" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can read from parts-cad" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can delete from parts-cad" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload to batch-images" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can read from batch-images" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can delete from batch-images" ON storage.objects;

    -- parts-images
    BEGIN CREATE POLICY "Tenant scoped upload to parts-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'parts-images' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Tenant scoped read from parts-images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'parts-images' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Tenant scoped delete from parts-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'parts-images' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- issues
    BEGIN CREATE POLICY "Tenant scoped upload to issues" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'issues' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Tenant scoped read from issues" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'issues' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Tenant scoped delete from issues" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'issues' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- parts-cad
    BEGIN CREATE POLICY "Tenant scoped upload to parts-cad" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'parts-cad' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Tenant scoped read from parts-cad" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'parts-cad' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Tenant scoped delete from parts-cad" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'parts-cad' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- batch-images
    BEGIN CREATE POLICY "Tenant scoped upload to batch-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'batch-images' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Tenant scoped read from batch-images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'batch-images' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE POLICY "Tenant scoped delete from batch-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'batch-images' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END;
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
      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-parts-reset') THEN
        PERFORM cron.unschedule('monthly-parts-reset');
      END IF;
      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-jobs-due-soon') THEN
        PERFORM cron.unschedule('check-jobs-due-soon');
      END IF;
      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-close-attendance') THEN
        PERFORM cron.unschedule('auto-close-attendance');
      END IF;
      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-invitations') THEN
        PERFORM cron.unschedule('cleanup-expired-invitations');
      END IF;
      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-mqtt-logs') THEN
        PERFORM cron.unschedule('cleanup-mqtt-logs');
      END IF;

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
