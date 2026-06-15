-- Create the sync_imports table used by api-erp-sync to record ERP sync runs.
--
-- The table is defined in the baseline schema (20260121175020_remote_schema.sql)
-- but was never present on every project, so GET /api-erp-sync/status failed with
-- "Could not find the table 'public.sync_imports'" (a 500). This migration creates
-- it idempotently, with the same columns, FK, RLS and grants as the baseline, plus
-- a tenant_id + created_at index matching the /status query (tenant filter, recent
-- first).

CREATE TABLE IF NOT EXISTS "public"."sync_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "operation" "text" NOT NULL DEFAULT 'upsert'::"text",
    "source" "text" DEFAULT 'api'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "record_count" integer DEFAULT 0,
    "total_records" integer DEFAULT 0,
    "created_count" integer DEFAULT 0,
    "updated_count" integer DEFAULT 0,
    "skipped_count" integer DEFAULT 0,
    "error_count" integer DEFAULT 0,
    "sync_hash" "text",
    "errors" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."sync_imports" OWNER TO "postgres";

-- Primary key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sync_imports_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."sync_imports"
      ADD CONSTRAINT "sync_imports_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

-- Tenant FK (cascade with tenant lifecycle)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'tenants')
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'sync_imports_tenant_id_fkey'
     ) THEN
    ALTER TABLE ONLY "public"."sync_imports"
      ADD CONSTRAINT "sync_imports_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Query index: /status filters by tenant_id and orders by created_at desc
CREATE INDEX IF NOT EXISTS "sync_imports_tenant_created_idx"
  ON "public"."sync_imports" ("tenant_id", "created_at" DESC);

-- Row Level Security: tenant isolation for reads, full access for service_role
ALTER TABLE "public"."sync_imports" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_tenant_id')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'sync_imports'
         AND policyname = 'sync_imports_tenant_isolation'
     ) THEN
    EXECUTE $pol$
      CREATE POLICY "sync_imports_tenant_isolation" ON "public"."sync_imports"
        FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()))
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sync_imports'
      AND policyname = 'sync_imports_service_role'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "sync_imports_service_role" ON "public"."sync_imports"
        TO "service_role" USING (true) WITH CHECK (true)
    $pol$;
  END IF;
END $$;

-- Grants (match baseline)
GRANT ALL ON TABLE "public"."sync_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_imports" TO "service_role";
GRANT ALL ON TABLE "public"."sync_imports" TO "anon";
