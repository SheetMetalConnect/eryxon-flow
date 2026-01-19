-- Migration: Add UPDATE policy for tenants table
-- This allows admin users to update their own tenant's configuration
-- Previously only service_role could update tenants, which prevented
-- the onboarding modal completion from being persisted.

-- Add UPDATE policy for admins to update their tenant
CREATE POLICY "Admins can update their tenant"
ON "public"."tenants"
FOR UPDATE
USING (
  ("id" = "public"."get_user_tenant_id"())
  AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")
)
WITH CHECK (
  ("id" = "public"."get_user_tenant_id"())
  AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")
);

-- Add comment explaining the policy
COMMENT ON POLICY "Admins can update their tenant" ON "public"."tenants"
IS 'Allows admin users to update their own tenant configuration, including onboarding status';
