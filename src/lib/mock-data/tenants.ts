import { supabase } from "@/integrations/supabase/client";
import { MockDataResult } from "./types";

export async function ensureTenantRequest(tenantId: string): Promise<MockDataResult> {
    // CRITICAL: Validate tenant_id to prevent cross-tenant contamination
    if (!tenantId || tenantId.trim() === "") {
        return { success: false, error: "tenant_id is required and cannot be empty" };
    }

    try {
        // Check if tenant exists
        const { data: tenantExists, error: checkError } = await supabase
            .from("tenants")
            .select("id")
            .eq("id", tenantId)
            .maybeSingle();

        if (checkError) throw checkError;

        if (!tenantExists) {
            console.log(`⚠️ Tenant ${tenantId} not found. creating it now...`);
            const { error: createTenantError } = await supabase.from("tenants").insert({
                id: tenantId,
                name: "Demo Organization",
                company_name: "Demo Company",
                plan: "free",
                status: "active",
            });

            if (createTenantError) {
                console.error("Failed to create missing tenant:", createTenantError);
                return {
                    success: false,
                    error: `Failed to restore missing tenant: ${createTenantError.message}`,
                };
            }
            console.log("✓ Restored missing tenant record");
        }

        // Check if tenant already has demo data
        const skipDemoCheck = tenantId === "11111111-1111-1111-1111-111111111111";

        if (!skipDemoCheck) {
            const { data: isDemoMode, error: demoCheckError } = await supabase.rpc(
                "is_demo_mode",
                { p_tenant_id: tenantId },
            );

            if (demoCheckError) {
                console.warn("Could not check demo mode status:", demoCheckError);
            } else if (isDemoMode === true) {
                console.log(
                    "⚠️ Tenant already has demo data. Skipping to prevent duplicates.",
                );
                return {
                    success: false,
                    error:
                        "Demo data already exists for this tenant. Please clear existing demo data first.",
                };
            }
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
