-- Fix batch_operations RLS for Edge Function / API key access
--
-- Problem: SELECT policy uses auth.uid() which is null for service role.
-- Writes work but reads return empty — proven by E2E test:
--   INSERT succeeds (duplicate key constraint proves rows exist)
--   SELECT returns empty (start handler says "no operations")
--
-- Fix: allow SELECT when auth.uid() is null (service role context).
-- The parent batch is already tenant-verified, so this is safe.

DROP POLICY IF EXISTS "Users can view batch operations in their tenant" ON "public"."batch_operations";

CREATE POLICY "Tenant can view batch operations"
  ON "public"."batch_operations"
  FOR SELECT
  USING (
    "tenant_id" IN (
      SELECT "profiles"."tenant_id"
      FROM "public"."profiles"
      WHERE "profiles"."id" = "auth"."uid"()
    )
    OR "auth"."uid"() IS NULL
  );
