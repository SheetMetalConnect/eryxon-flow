import { supabase } from "@/integrations/supabase/client";
import { MockDataResult, GeneratorContext } from "./types";
import { PartData } from "./parts";

export interface OperationData {
    id: string;
    cell_id: string;
    part_id: string;
    status: string;
}

export async function seedOperations(
    ctx: GeneratorContext,
    partData: PartData[],
    cellIdMap: Record<string, string>,
    resourceData: any[] = []
): Promise<MockDataResult & { operationData?: OperationData[] }> {
    try {
        if (!ctx.options.includeOperations || partData.length === 0 || Object.keys(cellIdMap).length === 0) {
            return { success: true, operationData: [] };
        }

        const tenantId = ctx.tenantId;
        let operations: any[] = [];
        let savedOperations: OperationData[] = [];

        // Helper to create routing
        const createRouting = (
            partId: string,
            routing: Array<{
                cell: string;
                seq: number;
                name: string;
                desc: string;
                hours: number;
                status: string;
                meta?: any;
            }>
        ) => {
            routing.forEach(op => {
                // Only add if cell exists (safety check)
                if (cellIdMap[op.cell]) {
                    operations.push({
                        tenant_id: tenantId,
                        part_id: partId,
                        cell_id: cellIdMap[op.cell],
                        operation_name: op.name,
                        notes: op.desc,
                        sequence: op.seq,
                        status: op.status,
                        estimated_time: Math.round(op.hours * 60),
                        metadata: op.meta || {},
                    });
                }
            });
        };

        // --- Define Routings ---
        // HF-FRAME-001 (Completed)
        const frame001 = partData.find(p => p.part_number === "HF-FRAME-001");
        if (frame001) {
            createRouting(frame001.id, [
                { cell: "Lasersnijden", seq: 10, name: "Lasersnijden platen", desc: "Fiber laser snijden hoofdplaten", hours: 1.5, status: "completed", meta: { program: "HF_FRAME_001.nc" } },
                { cell: "CNC Kantbank", seq: 20, name: "Kanten versterkingsribben", desc: "Kanten L-profielen", hours: 0.8, status: "completed" },
                { cell: "Lassen", seq: 30, name: "Constructie lassen", desc: "MIG lassen hoofdconstructie", hours: 4.5, status: "completed", meta: { wps: "WPS-NL-2024-089" } },
                { cell: "Afwerking", seq: 40, name: "Gritstralen + Primer", desc: "Gritstralen SA 2.5", hours: 1.2, status: "completed" },
                { cell: "Kwaliteitscontrole", seq: 50, name: "Eindcontrole", desc: "Dimensiecontrole", hours: 0.5, status: "completed" }
            ]);
        }

        // HF-BRACKET-002 (Completed)
        const bracket002 = partData.find(p => p.part_number === "HF-BRACKET-002");
        if (bracket002) {
            createRouting(bracket002.id, [
                { cell: "Lasersnijden", seq: 10, name: "Lasersnijden", desc: "Snijden beugels", hours: 0.6, status: "completed" },
                { cell: "CNC Kantbank", seq: 20, name: "Kanten", desc: "Kanten 90°", hours: 0.4, status: "completed" },
                { cell: "Lassen", seq: 30, name: "Tack lassen", desc: "Punten lassen", hours: 0.8, status: "completed" },
                { cell: "Kwaliteitscontrole", seq: 40, name: "Visuele controle", desc: "Lasnaad controle", hours: 0.2, status: "completed" }
            ]);
        }

        // CR-PANEL-A1 (In Progress)
        const crPanelA1 = partData.find(p => p.part_number === "CR-PANEL-A1");
        if (crPanelA1) {
            createRouting(crPanelA1.id, [
                { cell: "Lasersnijden", seq: 10, name: "Lasersnijden RVS", desc: "Fiber laser snijden 316L", hours: 0.8, status: "completed", meta: { nitrogen: true } },
                { cell: "CNC Kantbank", seq: 20, name: "Precisie kanten", desc: "Kanten RVS cleanroom", hours: 0.5, status: "completed" },
                { cell: "Lassen", seq: 30, name: "TIG lassen", desc: "TIG lassen montagepunten", hours: 1.2, status: "in_progress" },
                { cell: "Afwerking", seq: 40, name: "Elektropolish", desc: "Ra < 0.4μm", hours: 0.6, status: "not_started" },
                { cell: "Kwaliteitscontrole", seq: 50, name: "Cleanroom inspectie", desc: "Particle test", hours: 0.4, status: "not_started" }
            ]);
        }

        // CR-PANEL-B1 (In Progress/Not Started mix)
        const crPanelB1 = partData.find(p => p.part_number === "CR-PANEL-B1");
        if (crPanelB1) {
            createRouting(crPanelB1.id, [
                { cell: "Lasersnijden", seq: 10, name: "Lasersnijden RVS", desc: "Snijden zijpaneel", hours: 0.6, status: "completed" },
                { cell: "CNC Kantbank", seq: 20, name: "Kanten", desc: "Kanten 3x 90°", hours: 0.4, status: "in_progress" },
                { cell: "Lassen", seq: 30, name: "TIG lassen", desc: "Hoekverbindingen", hours: 0.8, status: "not_started" },
                { cell: "Afwerking", seq: 40, name: "Elektropolish", desc: "Polijsten", hours: 0.5, status: "not_started" },
                { cell: "Kwaliteitscontrole", seq: 50, name: "Inspectie", desc: "Oppervlakte", hours: 0.3, status: "not_started" }
            ]);
        }

        // ESS-BOX-TOP (In Progress - Aluminum)
        const essTop = partData.find(p => p.part_number === "ESS-BOX-TOP");
        if (essTop) {
            createRouting(essTop.id, [
                { cell: "Lasersnijden", seq: 10, name: "Lasersnijden Alu", desc: "Snijden AlMg3 3mm", hours: 0.7, status: "in_progress" },
                { cell: "CNC Kantbank", seq: 20, name: "Kanten deksel", desc: "Kanten rand", hours: 0.5, status: "not_started" },
                { cell: "Montage", seq: 30, name: "Montage inserts", desc: "Helicoil M6", hours: 0.3, status: "not_started" },
                { cell: "Afwerking", seq: 40, name: "Anodiseren", desc: "Naturel 15μm", hours: 0.4, status: "not_started" },
                { cell: "Kwaliteitscontrole", seq: 50, name: "Eindcontrole", desc: "Laagdikte", hours: 0.2, status: "not_started" }
            ]);
        }

        // Additional generic routing for parts not explicitly handled above
        // This ensures coverage even if we add more parts later
        const handledPartIds = new Set(operations.map(o => o.part_id));
        const unhandledParts = partData.filter(p => !handledPartIds.has(p.id));

        unhandledParts.forEach(p => {
            // Simple generic routing
            createRouting(p.id, [
                { cell: "Lasersnijden", seq: 10, name: "Lasersnijden (Gen)", desc: "Standard cutting", hours: 1.0, status: "not_started" },
                { cell: "CNC Kantbank", seq: 20, name: "Kanten (Gen)", desc: "Standard bending", hours: 0.5, status: "not_started" },
                { cell: "Kwaliteitscontrole", seq: 30, name: "Inspectie (Gen)", desc: "Standard QC", hours: 0.2, status: "not_started" }
            ]);
        });


        // Insert Operations
        if (operations.length > 0) {
            const { data: insertedOps, error: opError } = await supabase
                .from("operations")
                .insert(operations)
                .select("id, cell_id, part_id, status");

            if (opError) throw opError;
            savedOperations = insertedOps || [];
            console.log(`✓ Created ${savedOperations.length} operations`);
        }

        // --- Substep Templates (Generic) ---
        // Only create if they don't exist? For now, we seed them as part of this.
        // In a real app, maybe these are static, but here we want to demonstrate the feature.
        const templateDefinitions = [
            { name: "Cutting", description: "Standard cutting checklist", type: "cutting", items: ["Check material", "Load program", "Execute", "Inspect"] },
            { name: "Bending", description: "Standard bending checklist", type: "bending", items: ["Check tooling", "Test bend", "Execute", "Check angles"] },
            { name: "Welding", description: "Standard welding checklist", type: "welding", items: ["Clean joint", "Tack weld", "Weld", "Visual check"] },
        ];

        for (const def of templateDefinitions) {
            try {
                // Upsert template
                const { data: template } = await supabase.from("substep_templates")
                    .insert({ tenant_id: tenantId, name: def.name, description: def.description, operation_type: def.type, is_global: false })
                    .select("id").single();

                if (template) {
                    const items = def.items.map((item, i) => ({ template_id: template.id, name: item, sequence: (i + 1) * 10 }));
                    await supabase.from("substep_template_items").insert(items);
                }
            } catch (e) { /* ignore duplicates/errors */ }
        }


        // --- Link Resources ---
        if (ctx.options.includeResources && resourceData.length > 0 && savedOperations.length > 0) {
            const opResources: any[] = [];
            // Simple mapping based on cell name
            const laser = resourceData.find(r => r.name.includes("Laser") || r.type === "machine");
            const bender = resourceData.find(r => r.name.includes("Die") || r.type === "tooling");

            savedOperations.forEach(op => {
                // Get cell name from ID
                const cellName = Object.entries(cellIdMap).find(([_, id]) => id === op.cell_id)?.[0];
                if (cellName === "Lasersnijden" && laser) {
                    opResources.push({ operation_id: op.id, resource_id: laser.id, quantity: 1 });
                } else if (cellName === "CNC Kantbank" && bender) {
                    opResources.push({ operation_id: op.id, resource_id: bender.id, quantity: 1 });
                }
            });

            if (opResources.length > 0) {
                await supabase.from("operation_resources").insert(opResources);
                console.log(`✓ Linked ${opResources.length} resources`);
            }
        }

        return { success: true, operationData: savedOperations };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
