import { supabase } from "@/integrations/supabase/client";
import { MockDataResult, GeneratorContext } from "./types";
import { OperationData } from "./operations";
import { getRelativeISO } from "./utils";

export async function seedExecutionData(
    ctx: GeneratorContext,
    ops: OperationData[],
    operatorIds: string[],
    scrapReasonData: any[] = []
): Promise<MockDataResult> {
    try {
        const tenantId = ctx.tenantId;

        // --- Time Entries ---
        if (ctx.options.includeTimeEntries && ops.length > 0 && operatorIds.length > 0) {
            const timeEntries: any[] = [];
            const workableOps = ops.filter(op => op.status === "completed" || op.status === "in_progress");

            for (const op of workableOps) {
                // Random ops get time entries
                const numOperators = Math.random() > 0.8 ? 2 : 1;
                const selectedOps = operatorIds.sort(() => .5 - Math.random()).slice(0, numOperators);

                selectedOps.forEach(opId => {
                    // Generate realistic times based on status
                    // Completed: definite start/end in past
                    // In Progress: definite start, maybe open end
                    const isCompleted = op.status === "completed";
                    const duration = 30 + Math.floor(Math.random() * 120);

                    // Start time relative to now:
                    // completed: -30 to -1 days
                    // in_progress: -2 days to now
                    const offsetDays = isCompleted ? -1 * (1 + Math.floor(Math.random() * 30)) : -1 * Math.floor(Math.random() * 2);

                    const start = new Date(ctx.now);
                    start.setDate(start.getDate() + offsetDays);
                    start.setHours(8 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0);

                    const end = new Date(start);
                    end.setMinutes(end.getMinutes() + duration);

                    timeEntries.push({
                        tenant_id: tenantId,
                        operation_id: op.id,
                        operator_id: opId,
                        start_time: start.toISOString(),
                        end_time: (isCompleted || Math.random() > 0.5) ? end.toISOString() : null, // 50% active if in progress
                        duration: (isCompleted || Math.random() > 0.5) ? duration : null,
                        time_type: "productive",
                        notes: numOperators > 1 ? "Teamwork" : null
                    });
                });
            }

            if (timeEntries.length > 0) {
                const { error } = await supabase.from("time_entries").insert(timeEntries);
                if (error) console.warn("Time entries error:", error);
                else console.log(`✓ Created ${timeEntries.length} time entries`);
            }
        }

        // --- Quantities ---
        if (ctx.options.includeQuantityRecords && ops.length > 0) {
            const qtyRecords: any[] = [];
            const completedOps = ops.filter(op => op.status === "completed");

            for (const op of completedOps) {
                // 10% chance of scrap
                const hasScrap = Math.random() > 0.9;
                const totalQty = 5 + Math.floor(Math.random() * 10);
                const scrapQty = hasScrap ? 1 + Math.floor(Math.random() * 2) : 0;
                const goodQty = totalQty - scrapQty;

                let scrapReasonId = null;
                if (hasScrap && scrapReasonData.length > 0) {
                    scrapReasonId = scrapReasonData[Math.floor(Math.random() * scrapReasonData.length)].id;
                }

                qtyRecords.push({
                    tenant_id: tenantId,
                    operation_id: op.id,
                    quantity_produced: totalQty,
                    quantity_good: goodQty,
                    quantity_scrap: scrapQty,
                    quantity_rework: 0,
                    scrap_reason_id: scrapReasonId,
                    recorded_by: operatorIds.length > 0 ? operatorIds[0] : null,
                    recorded_at: getRelativeISO(ctx.now, -1),
                    material_lot: `LOT-${Math.floor(Math.random() * 10000)}`
                });
            }

            if (qtyRecords.length > 0) {
                const { error } = await supabase.from("operation_quantities").insert(qtyRecords);
                if (error) console.warn("Quantities error:", error);
                else console.log(`✓ Created ${qtyRecords.length} quantity records`);
            }
        }

        // --- Issues ---
        // Skip issue creation when no operators are available (created_by is required)
        if (ctx.options.includeIssues && ops.length > 0 && operatorIds.length > 0) {
            const issues: any[] = [];
            // Create a few random issues
            const issueOps = ops.sort(() => .5 - Math.random()).slice(0, 3);

            const templates = [
                { sev: "low", desc: "Minor scratch on surface", status: "open" },
                { sev: "medium", desc: "Dimension deviation +0.1mm", status: "in_review" },
                { sev: "high", desc: "Material crack detected", status: "resolved", res: "Material replaced" }
            ];

            issueOps.forEach((op, idx) => {
                const tmpl = templates[idx % templates.length];
                issues.push({
                    tenant_id: tenantId,
                    operation_id: op.id,
                    created_by: operatorIds[0],
                    severity: tmpl.sev,
                    description: tmpl.desc,
                    status: tmpl.status,
                    resolution_notes: tmpl.res || null,
                    created_at: getRelativeISO(ctx.now, -2)
                });
            });

            if (issues.length > 0) {
                const { error } = await supabase.from("issues").insert(issues);
                if (error) console.warn("Issues error:", error);
                else console.log(`✓ Created ${issues.length} NCRs/Issues`);
            }
        }

        return { success: true };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
