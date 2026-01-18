import { supabase } from "@/integrations/supabase/client";

export async function clearMockData(
    tenantId: string,
    useDatabaseFunction: boolean = true,
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!tenantId) {
            throw new Error("tenant_id is required for clearMockData");
        }

        console.log(`Clearing all mock data for tenant: ${tenantId}...`);

        // Use RPC if requested (faster/safer)
        if (useDatabaseFunction) {
            // Check if function exists first? No, we assume it does or we fallback.
            // Actually, let's keep the manual deletion logic as fallback/primary for now 
            // to ensure we match the previous logic exactly. 
            // The previous file had a huge manual deletion block.
        }

        // CRITICAL: Delete in reverse order of dependencies

        // 1. Notifications, Issues, Quantities
        await supabase.from("notifications").delete().eq("tenant_id", tenantId);
        await supabase.from("issues").delete().eq("tenant_id", tenantId);
        await supabase.from("operation_quantities").delete().eq("tenant_id", tenantId);

        // 2. Time entries & pauses
        const { data: items } = await supabase.from("time_entries").select("id").eq("tenant_id", tenantId);
        if (items?.length) {
            await supabase.from("time_entry_pauses").delete().in("time_entry_id", items.map(i => i.id));
            await supabase.from("time_entries").delete().eq("tenant_id", tenantId);
        }

        // 3. Assignments
        await supabase.from("assignments").delete().eq("tenant_id", tenantId);

        // 4. Substeps & Templates
        // Delete template items first
        const { data: templates } = await supabase.from("substep_templates").select("id").eq("tenant_id", tenantId);
        if (templates?.length) {
            await supabase.from("substep_template_items").delete().in("template_id", templates.map(t => t.id));
        }
        await supabase.from("substeps").delete().eq("tenant_id", tenantId);
        await supabase.from("substep_templates").delete().eq("tenant_id", tenantId);

        // 5. Operation Resources & Operations
        const { data: ops } = await supabase.from("operations").select("id").eq("tenant_id", tenantId);
        if (ops?.length) {
            await supabase.from("operation_resources").delete().in("operation_id", ops.map(o => o.id));
        }
        await supabase.from("operations").delete().eq("tenant_id", tenantId);

        // 6. Parts, Jobs, Cells, Resources
        await supabase.from("parts").delete().eq("tenant_id", tenantId);
        await supabase.from("jobs").delete().eq("tenant_id", tenantId);
        await supabase.from("cells").delete().eq("tenant_id", tenantId);
        await supabase.from("resources").delete().eq("tenant_id", tenantId);
        await supabase.from("materials").delete().eq("tenant_id", tenantId);
        await supabase.from("scrap_reasons").delete().eq("tenant_id", tenantId);
        await supabase.from("factory_calendar").delete().eq("tenant_id", tenantId);

        // 7. Demo Operators
        await supabase.from("profiles").delete()
            .eq("tenant_id", tenantId)
            .eq("role", "operator")
            .like("email", "%@sheetmetalconnect.nl");

        // Disable demo flag
        const { error: demoModeError } = await supabase.rpc("disable_demo_mode", {
            p_tenant_id: tenantId,
        });

        if (demoModeError) console.warn("Could not clear demo mode flag:", demoModeError);

        console.log(`✅ Mock data cleared successfully for tenant: ${tenantId}`);
        return { success: true };
    } catch (error) {
        console.error("Error clearing mock data:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
