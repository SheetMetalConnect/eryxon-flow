import { supabase } from "@/integrations/supabase/client";
import { MockDataResult, GeneratorContext } from "./types";

export async function seedOperators(ctx: GeneratorContext): Promise<MockDataResult & { operatorIds?: string[] }> {
    try {
        if (!ctx.options.includeOperators) {
            return { success: true, operatorIds: [] };
        }

        let operatorIds: string[] = [];

        // First check if operators already exist
        const { data: existingOps } = await supabase
            .from("profiles")
            .select("id")
            .eq("tenant_id", ctx.tenantId)
            .eq("role", "operator")
            .like("email", "%@sheetmetalconnect.nl");

        if (existingOps && existingOps.length > 0) {
            operatorIds = existingOps.map((o) => o.id);
            console.log(`✓ ${existingOps.length} demo operators already exist`);
        } else {
            // Use RPC function that handles auth.users constraint
            const { error: rpcError } = await supabase.rpc(
                "seed_demo_operators",
                { p_tenant_id: ctx.tenantId }
            );

            if (rpcError) {
                console.warn("⚠️ Operator seeding skipped (requires auth setup):", rpcError.message);
                console.log("  → Demo will continue without operators (operations will be unassigned)");
            } else {
                // Fetch the created operators
                const { data: createdOps } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("tenant_id", ctx.tenantId)
                    .eq("role", "operator")
                    .like("email", "%@sheetmetalconnect.nl");

                if (createdOps && createdOps.length > 0) {
                    operatorIds = createdOps.map(o => o.id);
                    console.log(`✓ Created ${createdOps.length} shop floor operators`);
                }
            }
        }

        return { success: true, operatorIds };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function seedResources(ctx: GeneratorContext): Promise<MockDataResult & { resourceData?: any[], scrapReasonData?: any[] }> {
    try {
        if (ctx.options.includeResources) {
            const { error: resourceSeedError } = await supabase.rpc(
                "seed_demo_resources",
                { p_tenant_id: ctx.tenantId }
            );

            if (resourceSeedError && !resourceSeedError.message?.includes("already exist")) {
                console.warn("Resource seeding warning:", resourceSeedError);
            } else {
                console.log("✓ Seeded demo resources (molds, tooling, fixtures, materials)");
            }
        }

        // Always seed scrap reasons if we want quantity records later
        const { error: scrapReasonsError } = await supabase.rpc(
            "seed_default_scrap_reasons",
            { p_tenant_id: ctx.tenantId }
        );

        if (scrapReasonsError && !scrapReasonsError.message?.includes("already exist")) {
            console.warn("Scrap reasons warning:", scrapReasonsError);
        } else {
            console.log("✓ Seeded default scrap reasons");
        }

        // Fetch for return
        const { data: resourceData } = await supabase
            .from("resources")
            .select("id, name, type")
            .eq("tenant_id", ctx.tenantId);

        const { data: scrapReasonData } = await supabase
            .from("scrap_reasons")
            .select("id, code, category")
            .eq("tenant_id", ctx.tenantId);

        return {
            success: true,
            resourceData: resourceData || [],
            scrapReasonData: scrapReasonData || []
        };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
