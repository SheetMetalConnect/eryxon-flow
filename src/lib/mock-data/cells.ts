import { supabase } from "@/integrations/supabase/client";
import { MockDataResult, GeneratorContext } from "./types";

export async function seedCells(ctx: GeneratorContext): Promise<MockDataResult & { cellIds?: string[]; cellIdMap?: Record<string, string> }> {
    try {
        if (!ctx.options.includeCells) {
            return { success: true, cellIds: [], cellIdMap: {} };
        }

        const cellIdMap: Record<string, string> = {};
        const cells = [
            {
                tenant_id: ctx.tenantId,
                name: "Lasersnijden", // Laser Cutting
                sequence: 0,
                description: "High-precision fiber laser snijstation",
                color: "#3b82f6", // blue
                active: true,
                wip_limit: 15,
                enforce_wip_limit: false,
                wip_warning_threshold: 12,
                show_capacity_warning: true,
            },
            {
                tenant_id: ctx.tenantId,
                name: "CNC Kantbank", // CNC Bending
                sequence: 1,
                description: "Precisie kantbank en vouwbewerkingen",
                color: "#f59e0b", // amber
                active: true,
                wip_limit: 10,
                enforce_wip_limit: false,
                wip_warning_threshold: 8,
                show_capacity_warning: true,
            },
            {
                tenant_id: ctx.tenantId,
                name: "Lassen", // Welding
                sequence: 2,
                description: "MIG/TIG lassen en constructiewerk",
                color: "#ef4444", // red
                active: true,
                wip_limit: 8,
                enforce_wip_limit: true,
                wip_warning_threshold: 6,
                show_capacity_warning: true,
            },
            {
                tenant_id: ctx.tenantId,
                name: "Montage", // Assembly
                sequence: 3,
                description: "Eindmontage en hardware installatie",
                color: "#8b5cf6", // violet
                active: true,
                wip_limit: 12,
                enforce_wip_limit: false,
                wip_warning_threshold: 10,
                show_capacity_warning: true,
            },
            {
                tenant_id: ctx.tenantId,
                name: "Afwerking", // Finishing
                sequence: 4,
                description: "Poedercoaten en oppervlaktebehandeling",
                color: "#10b981", // green
                active: true,
                wip_limit: 20,
                enforce_wip_limit: false,
                wip_warning_threshold: 16,
                show_capacity_warning: true,
            },
            {
                tenant_id: ctx.tenantId,
                name: "Kwaliteitscontrole", // Quality Control
                sequence: 5,
                description: "Eindcontrole en kwaliteitsborging",
                color: "#6366f1", // indigo
                active: true,
                wip_limit: 15,
                enforce_wip_limit: false,
                wip_warning_threshold: 12,
                show_capacity_warning: true,
            },
        ];

        // Upsert to support idempotency/updates
        const { data: cellData, error: cellError } = await supabase
            .from("cells")
            .upsert(cells, { onConflict: 'tenant_id,name' })
            .select("id, name");

        if (cellError) throw cellError;

        const cellIds = cellData?.map((c) => c.id) || [];
        cellData?.forEach((c) => {
            cellIdMap[c.name] = c.id;
        });

        console.log(`✓ Created ${cellData?.length} QRM cells with WIP limits`);

        return { success: true, cellIds, cellIdMap };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
