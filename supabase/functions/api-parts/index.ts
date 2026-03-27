import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";
import { canCreateParts } from "@shared/plan-limits.ts";
import type { HandlerContext } from "@shared/handler.ts";
import { createSuccessResponse, BadRequestError, PaymentRequiredError } from "@shared/validation/errorHandler.ts";

// Custom POST handler with plan limits and nested operations
async function handleCreate(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId } = ctx;
  const body = await req.json();

  const quantity = body.quantity || 1;
  const quota = await canCreateParts(supabase, tenantId, quantity);
  if (!quota.allowed) {
    throw new PaymentRequiredError("part", quota.current || 0, quota.limit || 0);
  }

  if (!body.part_number) throw new BadRequestError("part_number is required");
  if (!body.job_id) throw new BadRequestError("job_id is required");

  const { operations, ...partData } = body;

  const { data: part, error } = await supabase
    .from('parts')
    .insert({ ...partData, tenant_id: tenantId, status: partData.status || 'not_started' })
    .select()
    .single();

  if (error) throw new Error(`Failed to create part: ${error.message}`);

  const createdOps = [];
  if (operations && Array.isArray(operations)) {
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const { data: created, error: opErr } = await supabase
        .from('operations')
        .insert({ ...op, part_id: part.id, tenant_id: tenantId, sequence: op.sequence || (i + 1), status: 'not_started' })
        .select()
        .single();
      if (!opErr && created) createdOps.push(created);
    }
  }

  return createSuccessResponse({ part: { ...part, operations: createdOps } }, 201);
}

serveApi(
  createCrudHandler({
    table: 'parts',
    selectFields: `
      id, part_number, material, quantity, status, file_paths, notes,
      drawing_no, cnc_program_name, is_bullet_card,
      created_at, updated_at,
      job:jobs!job_id (id, job_number, customer)
    `,
    searchFields: ['part_number', 'material'],
    allowedFilters: ['job_id', 'status', 'material'],
    fuzzyFilters: ['part_number', 'material'],
    sortableFields: ['part_number', 'created_at', 'status'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: true,
    customHandlers: {
      post: handleCreate,
    },
  })
);
