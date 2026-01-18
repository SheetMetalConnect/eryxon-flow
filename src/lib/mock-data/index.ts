import { supabase } from "@/integrations/supabase/client";
import { MockDataResult, MockDataOptions, GeneratorContext } from "./types";
import { ensureTenantRequest } from "./tenants";
import { seedCells } from "./cells";
import { seedCalendar } from "./calendar";
import { seedOperators, seedResources } from "./resources";
import { seedJobs } from "./jobs";
import { seedParts } from "./parts";
import { seedOperations } from "./operations";
import { seedExecutionData } from "./execution";
import { seedBatches } from "./batches";

const DEFAULT_OPTIONS: MockDataOptions = {
    includeCells: true,
    includeJobs: true,
    includeParts: true,
    includeOperations: true,
    includeResources: true,
    includeOperators: true,
    includeTimeEntries: true,
    includeQuantityRecords: true,
    includeIssues: true,
    includeCalendar: true,
    includeBatches: true,
};

export async function generateMockData(
    tenantId: string,
    options: MockDataOptions = DEFAULT_OPTIONS
): Promise<MockDataResult> {
    console.log(`🚀 Starting modular seed data generation for ${tenantId}...`);

    // 1. Context Setup
    const ctx: GeneratorContext = {
        tenantId,
        options,
        now: new Date()
    };

    // 2. Tenant Validation
    const tenantResult = await ensureTenantRequest(tenantId);
    if (!tenantResult.success) return tenantResult;

    // 3. Core Reference Data (Cells, Calendar, Resources, Operators)
    const [cellRes, calendarRes, resourceRes, operatorRes] = await Promise.all([
        seedCells(ctx),
        seedCalendar(ctx),
        seedResources(ctx),
        seedOperators(ctx)
    ]);

    if (!cellRes.success) return cellRes;
    if (!calendarRes.success) return calendarRes;
    if (!resourceRes.success) return resourceRes;
    if (!operatorRes.success) return operatorRes;

    const cellIdMap = cellRes.cellIds ? cellRes.cellIdMap || {} : {};
    const resourceData = resourceRes.resourceData || [];
    const scrapReasonData = resourceRes.scrapReasonData || [];
    const operatorIds = operatorRes.operatorIds || [];

    // 4. Jobs
    const jobRes = await seedJobs(ctx);
    if (!jobRes.success) return jobRes;
    const jobIdMap = jobRes.jobIdMap || {};

    // 5. Parts (Dependent on Jobs)
    const partRes = await seedParts(ctx, jobIdMap);
    if (!partRes.success) return partRes;
    const partData = partRes.partData || [];

    // 6. Operations (Dependent on Parts & Cells)
    const opRes = await seedOperations(ctx, partData, cellIdMap, resourceData);
    if (!opRes.success) return opRes;
    const operationData = opRes.operationData || [];

    // 7. Execution Data (Dependent on Operations & Operators & Scrap Reasons)
    const execRes = await seedExecutionData(ctx, operationData, operatorIds, scrapReasonData);
    if (!execRes.success) return execRes;

    // 8. Batches (Dependent on Operations & Operators)
    const batchRes = await seedBatches(ctx, operationData, operatorRes.profiles || []);
    if (!batchRes.success) return batchRes;

    // 9. Enable Demo Mode Flag
    const { error: demoModeError } = await supabase.rpc("enable_demo_mode", {
        p_tenant_id: tenantId,
        p_user_id: null,
    });

    if (demoModeError) console.warn("Could not set demo mode flag:", demoModeError);
    else console.log("✓ Demo mode flag enabled");

    console.log("✅ Modular mock data generation completed successfully!");
    return { success: true };
}
