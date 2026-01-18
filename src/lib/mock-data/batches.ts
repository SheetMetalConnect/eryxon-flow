import { supabase } from "@/integrations/supabase/client";
import { MockDataResult, GeneratorContext } from "./types";
import { OperationData } from "./operations";
import { getRelativeISO } from "./utils";

export async function seedBatches(
    ctx: GeneratorContext,
    ops: OperationData[],
    profiles: any[] = [] // operators or admins to assign as creators
): Promise<MockDataResult> {
    try {
        if (!ctx.options.includeBatches || ops.length === 0) {
            return { success: true };
        }

        const tenantId = ctx.tenantId;
        const userId = profiles.length > 0 ? profiles[0].id : null;

        // Group operations by cell to create realistic batches
        // We only batch operations in the same cell
        const opsByCell: Record<string, OperationData[]> = {};
        ops.forEach(op => {
            if (!opsByCell[op.cell_id]) opsByCell[op.cell_id] = [];
            opsByCell[op.cell_id].push(op);
        });

        const batches: any[] = [];
        const batchOps: any[] = [];

        // Create a "Laser Nesting" batch
        // Find all laser operations (assuming we can identify them by some heuristic or just pick a cell)
        // For this mock, we'll just pick the cell with the most operations and call it our "Nesting Cell"
        const cellIds = Object.keys(opsByCell);
        for (const cellId of cellIds) {
            const cellOps = opsByCell[cellId];
            if (cellOps.length < 2) continue; // Need at least 2 for a batch

            // Create 1 or 2 batches per cell
            const batchCount = Math.floor(Math.random() * 2) + 1;

            for (let i = 0; i < batchCount; i++) {
                // Pick 2-5 ops for this batch
                const opsToBatch = cellOps.slice(i * 2, i * 2 + 3); // Simple slicing strategy
                if (opsToBatch.length < 2) continue;

                const isCompleted = opsToBatch.every(o => o.status === 'completed');
                // Generate distinct batch number
                const batchNum = `BATCH-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

                const batch = {
                    tenant_id: tenantId,
                    batch_number: batchNum,
                    batch_type: "laser_nesting", // valid enum: laser_nesting, tube_batch, saw_batch, finishing_batch, general
                    status: isCompleted ? "completed" : "in_progress",
                    cell_id: cellId,
                    material: "Mixed", // Could be specific if we tracked it
                    created_by: userId,
                    created_at: getRelativeISO(ctx.now, -5),
                    updated_at: getRelativeISO(ctx.now, -1),
                };

                const { data: createdBatch, error: batchError } = await supabase
                    .from("operation_batches" as any)
                    .insert(batch)
                    .select("id")
                    .single();

                if (batchError) {
                    console.warn("Failed to create batch:", batchError);
                    continue;
                }

                if (createdBatch) {
                    // Link operations
                    opsToBatch.forEach((op, idx) => {
                        batchOps.push({
                            tenant_id: tenantId,
                            batch_id: createdBatch.id,
                            operation_id: op.id,
                            sequence_in_batch: idx + 1,
                            quantity_in_batch: 1 // Simplified
                        });
                    });
                    batches.push(createdBatch);
                }
            }
        }

        if (batchOps.length > 0) {
            const { error: linkError } = await supabase.from("batch_operations" as any).insert(batchOps);
            if (linkError) throw linkError;
            console.log(`✓ Created ${batches.length} batches containing ${batchOps.length} operations`);
        }

        return { success: true };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
