import { supabase } from "@/integrations/supabase/client";
import { MockDataResult, GeneratorContext } from "./types";

export interface PartData {
    id: string;
    part_number: string;
    job_id: string;
    parent_part_id?: string | null;
}

export async function seedParts(
    ctx: GeneratorContext,
    jobIdMap: Record<string, string>
): Promise<MockDataResult & { partIds?: string[], partData?: PartData[] }> {
    try {
        if (!ctx.options.includeParts || Object.keys(jobIdMap).length === 0) {
            return { success: true, partIds: [], partData: [] };
        }

        const tenantId = ctx.tenantId;
        let partIds: string[] = [];
        let allParts: PartData[] = [];

        // First: Create parent parts
        const parentParts = [
            {
                tenant_id: tenantId,
                job_id: jobIdMap["WO-2025-1047"],
                part_number: "HF-FRAME-001",
                material: "S355J2",
                notes: "Hoofdframe hydraulische hef - Gelast constructiestaal",
                quantity: 2,
                status: "completed" as const,
                parent_part_id: null,
                metadata: {
                    dimensions: "1200x800x150mm",
                    weight: "45.5kg",
                    material_spec: "EN 10025-2",
                    surface_treatment: "Gritstralen + Primer",
                },
            },
            {
                tenant_id: tenantId,
                job_id: jobIdMap["WO-2025-1089"],
                part_number: "CR-PANEL-A1",
                material: "RVS 316L",
                notes: "Bedieningspaneel voorzijde - Cleanroom ISO 5",
                quantity: 12,
                status: "in_progress" as const,
                parent_part_id: null,
                metadata: {
                    dimensions: "400x300x2mm",
                    weight: "2.8kg",
                    material_spec: "EN 1.4404",
                    surface_finish: "Elektropolish Ra<0.4μm",
                    cleanroom_packaging: true,
                },
            },
            {
                tenant_id: tenantId,
                job_id: jobIdMap["WO-2025-1124"],
                part_number: "ESS-BOX-TOP",
                material: "AlMg3",
                notes: "Deksel energieopslag behuizing - Parent assembly",
                quantity: 25,
                status: "in_progress" as const,
                parent_part_id: null,
                metadata: {
                    dimensions: "600x400x3mm",
                    weight: "1.9kg",
                    material_spec: "EN AW-5754",
                    anodize_color: "Natural clear",
                },
            },
            {
                tenant_id: tenantId,
                job_id: jobIdMap["WO-2025-1156"],
                part_number: "HTP-FRAME-MAIN",
                material: "RVS 304",
                notes: "Precisie framewerk - CMM inspectie verplicht",
                quantity: 4,
                status: "not_started" as const,
                parent_part_id: null,
                metadata: {
                    dimensions: "800x600x100mm",
                    weight: "18.5kg",
                    tolerance: "±0.05mm",
                    material_spec: "EN 1.4301",
                    inspection: "CMM + Material cert required",
                    flatness: "< 0.02mm",
                },
            },
            {
                tenant_id: tenantId,
                job_id: jobIdMap["WO-2025-1178"],
                part_number: "FK-BRACKET-A1",
                material: "Aluminium 7075-T6",
                notes: "Luchtvaart beugel - AS9100 traceability",
                quantity: 16,
                status: "in_progress" as const,
                parent_part_id: null,
                metadata: {
                    dimensions: "180x120x8mm",
                    weight: "0.45kg",
                    tolerance: "±0.1mm",
                    material_spec: "AMS-QQ-A-250/12",
                    certification: "AS9100D",
                    traceability: "Full lot traceability required",
                },
            },
            {
                tenant_id: tenantId,
                job_id: jobIdMap["WO-2025-1195"],
                part_number: "PH-MED-HOUSING",
                material: "RVS 316L",
                notes: "Medische behuizing - biocompatibel",
                quantity: 6,
                status: "not_started" as const,
                parent_part_id: null,
                metadata: {
                    dimensions: "350x280x120mm",
                    weight: "4.2kg",
                    material_spec: "EN 1.4404",
                    certification: "EN ISO 13485",
                    surface_finish: "Ra < 0.8μm",
                    biocompatible: true,
                },
            },
        ];

        const { data: parentPartsData, error: parentError } = await supabase
            .from("parts")
            .insert(parentParts)
            .select("id, part_number, job_id, parent_part_id");

        if (parentError) throw parentError;

        // Build lookup for parent IDs
        const partIdLookup: Record<string, string> = {};
        parentPartsData?.forEach((p) => {
            partIdLookup[p.part_number] = p.id;
        });

        // Second: Create child parts linked to parents
        const childParts = [
            {
                tenant_id: tenantId,
                job_id: jobIdMap["WO-2025-1047"],
                part_number: "HF-BRACKET-002",
                material: "S355J2",
                notes: "Montagebeugels zijkant - Child of HF-FRAME-001",
                quantity: 8,
                status: "completed" as const,
                parent_part_id: partIdLookup["HF-FRAME-001"],
                metadata: {
                    dimensions: "250x180x12mm",
                    weight: "3.2kg",
                    material_spec: "EN 10025-2",
                },
            },
            {
                tenant_id: tenantId,
                job_id: jobIdMap["WO-2025-1089"],
                part_number: "CR-PANEL-B1",
                material: "RVS 316L",
                notes: "Bedieningspaneel zijkant - Child of CR-PANEL-A1",
                quantity: 12,
                status: "in_progress" as const,
                parent_part_id: partIdLookup["CR-PANEL-A1"],
                metadata: {
                    dimensions: "300x250x2mm",
                    weight: "2.1kg",
                    material_spec: "EN 1.4404",
                    surface_finish: "Elektropolish Ra<0.4μm",
                },
            },
            {
                tenant_id: tenantId,
                job_id: jobIdMap["WO-2025-1124"],
                part_number: "ESS-BOX-SIDE",
                material: "AlMg3",
                notes: "Zijpaneel behuizing - Child of ESS-BOX-TOP",
                quantity: 50,
                status: "not_started" as const,
                parent_part_id: partIdLookup["ESS-BOX-TOP"],
                metadata: {
                    dimensions: "400x350x3mm",
                    weight: "1.4kg",
                    material_spec: "EN AW-5754",
                },
            },
            {
                tenant_id: tenantId,
                job_id: jobIdMap["WO-2025-1156"],
                part_number: "HTP-MOUNT-PLT",
                material: "RVS 304",
                notes: "Montageplaat precisie - Child of HTP-FRAME-MAIN",
                quantity: 8,
                status: "not_started" as const,
                parent_part_id: partIdLookup["HTP-FRAME-MAIN"],
                metadata: {
                    dimensions: "300x200x15mm",
                    weight: "6.8kg",
                    tolerance: "±0.05mm",
                    material_spec: "EN 1.4301",
                },
            },
            {
                tenant_id: tenantId,
                job_id: jobIdMap["WO-2025-1178"],
                part_number: "FK-BRACKET-B1",
                material: "Aluminium 7075-T6",
                notes: "Verstevigingsbeugel - Child of FK-BRACKET-A1",
                quantity: 32,
                status: "not_started" as const,
                parent_part_id: partIdLookup["FK-BRACKET-A1"],
                metadata: {
                    dimensions: "80x60x4mm",
                    weight: "0.12kg",
                    tolerance: "±0.1mm",
                    material_spec: "AMS-QQ-A-250/12",
                },
            },
            {
                tenant_id: tenantId,
                job_id: jobIdMap["WO-2025-1195"],
                part_number: "PH-MED-COVER",
                material: "RVS 316L",
                notes: "Deksel medische behuizing - Child of PH-MED-HOUSING",
                quantity: 6,
                status: "not_started" as const,
                parent_part_id: partIdLookup["PH-MED-HOUSING"],
                metadata: {
                    dimensions: "360x290x3mm",
                    weight: "2.1kg",
                    material_spec: "EN 1.4404",
                    surface_finish: "Ra < 0.8μm",
                },
            },
        ];

        const { data: childPartsData, error: childError } = await supabase
            .from("parts")
            .insert(childParts)
            .select("id, part_number, job_id, parent_part_id");

        if (childError) throw childError;

        allParts = [...(parentPartsData || []), ...(childPartsData || [])];
        partIds = allParts.map(p => p.id);

        console.log(`✓ Created ${allParts.length} parts (${parentPartsData?.length} parents + ${childPartsData?.length} children)`);

        return { success: true, partIds, partData: allParts };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
