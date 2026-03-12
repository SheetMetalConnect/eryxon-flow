-- ============================================================
-- Post-Schema Setup Migration (consolidated)
-- Combines: apply_seed, add_missing_auth_trigger,
--           enhance_batch_management, create_batch_requirements,
--           fix_signup_notification_trigger
-- ============================================================

-- ============================================================
-- 1. Storage buckets & policies
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('parts-images', 'parts-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('issues', 'issues', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('parts-cad', 'parts-cad', false, 104857600, ARRAY['model/step', 'model/stl', 'application/sla', 'application/octet-stream', 'model/3mf']),
  ('batch-images', 'batch-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

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

-- ============================================================
-- 2. Cron jobs (pg_cron)
-- ============================================================
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'schedule') THEN
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

-- ============================================================
-- 3. Auth trigger for new user signup
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. Enhance batch management
-- ============================================================
ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'blocked';

ALTER TABLE public.operation_batches
ADD COLUMN IF NOT EXISTS parent_batch_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'operation_batches_parent_batch_id_fkey'
    ) THEN
        ALTER TABLE public.operation_batches
        ADD CONSTRAINT operation_batches_parent_batch_id_fkey
        FOREIGN KEY (parent_batch_id)
        REFERENCES public.operation_batches(id)
        ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_operation_batches_parent
ON public.operation_batches(parent_batch_id)
WHERE parent_batch_id IS NOT NULL;

ALTER TABLE public.operation_batches
ADD COLUMN IF NOT EXISTS nesting_image_url TEXT,
ADD COLUMN IF NOT EXISTS layout_image_url TEXT;

COMMENT ON COLUMN public.operation_batches.parent_batch_id IS 'Reference to parent batch for nested batches (e.g., sheets within a master nesting batch)';
COMMENT ON COLUMN public.operation_batches.nesting_image_url IS 'URL to nesting layout image (signed URL from batch-images storage bucket)';
COMMENT ON COLUMN public.operation_batches.layout_image_url IS 'URL to general layout image (signed URL from batch-images storage bucket)';

-- ============================================================
-- 5. Batch requirements table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.batch_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    material_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id UUID NOT NULL,
    CONSTRAINT batch_requirements_batch_id_fkey
        FOREIGN KEY (batch_id)
        REFERENCES public.operation_batches(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_batch_requirements_batch_id
ON public.batch_requirements(batch_id);

CREATE INDEX IF NOT EXISTS idx_batch_requirements_tenant_id
ON public.batch_requirements(tenant_id);

ALTER TABLE public.batch_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view batch_requirements from their tenant"
ON public.batch_requirements
FOR SELECT
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can insert batch_requirements for their tenant"
ON public.batch_requirements
FOR INSERT
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can update batch_requirements from their tenant"
ON public.batch_requirements
FOR UPDATE
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can delete batch_requirements from their tenant"
ON public.batch_requirements
FOR DELETE
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

COMMENT ON TABLE public.batch_requirements IS 'Material requirements tracked within operation batches';
COMMENT ON COLUMN public.batch_requirements.batch_id IS 'Reference to the operation batch';
COMMENT ON COLUMN public.batch_requirements.material_name IS 'Name of the required material';
COMMENT ON COLUMN public.batch_requirements.quantity IS 'Quantity required';
COMMENT ON COLUMN public.batch_requirements.status IS 'Status of the requirement (pending, fulfilled, etc.)';
COMMENT ON COLUMN public.batch_requirements.tenant_id IS 'Tenant ID for multi-tenant isolation';

-- ============================================================
-- 6. Fix signup notification trigger
-- ============================================================
DROP TRIGGER IF EXISTS "notify-new-signup" ON "public"."tenants";
DROP TRIGGER IF EXISTS "notify-new-signup" ON "public"."profiles";
DROP FUNCTION IF EXISTS public.notify_admin_signup();

DO $$
BEGIN
  RAISE NOTICE
    'Manual setup required: create a Database Webhook named "notify-new-signup" for INSERT on public.profiles, targeting the notify-new-signup edge function, with filter record.role = ''admin'' AND record.has_email_login = true.';
END;
$$;
