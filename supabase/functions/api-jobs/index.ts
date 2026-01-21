import { serveApi } from "../_shared/handler.ts";
import { createCrudHandler } from "../_shared/crud-builder.ts";
import { canCreateJob } from "../_shared/plan-limits.ts";
import { JobValidator } from "../_shared/validation/validators/JobValidator.ts";
import type { HandlerContext } from "../_shared/handler.ts";
import { PaymentRequiredError, ValidationException, createSuccessResponse } from "../_shared/validation/errorHandler.ts";

// Custom POST handler with plan limits check
async function handleCreateWithLimits(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, plan } = ctx;

  // Check plan limits before creating
  const canCreate = await canCreateJob(supabase, tenantId, plan);
  if (!canCreate.allowed) {
    throw new PaymentRequiredError(
      "job",  // limitType
      canCreate.current || 0,
      canCreate.limit || 0
    );
  }

  // Parse and validate body
  const body = await req.json();

  if (JobValidator) {
    const validator = new JobValidator();
    const validation = await validator.validate(body, { tenantId, supabase });
    if (!validation.valid) {
      throw new ValidationException(validation);
    }
  }

  // Create the job
  const dataToInsert = {
    ...body,
    tenant_id: tenantId,
  };

  const { data, error } = await supabase
    .from('jobs')
    .insert(dataToInsert)
    .select(`
      id,
      job_number,
      customer,
      due_date,
      due_date_override,
      status,
      priority,
      notes,
      metadata,
      created_at,
      updated_at,
      parts (
        id,
        part_number,
        material,
        quantity,
        status
      )
    `)
    .single();

  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }

  // Maintain original response format for backward compatibility
  return createSuccessResponse({ job: data }, 201);
}

// Configure CRUD handler for jobs with validation and sync
export default serveApi(
  createCrudHandler({
    table: 'jobs',
    selectFields: `
      id,
      job_number,
      customer,
      due_date,
      due_date_override,
      status,
      priority,
      notes,
      metadata,
      created_at,
      updated_at,
      parts (
        id,
        part_number,
        material,
        quantity,
        status
      )
    `,
    searchFields: ['job_number', 'customer'],
    allowedFilters: ['status', 'customer', 'priority'],
    sortableFields: ['job_number', 'customer', 'due_date', 'created_at', 'status', 'priority'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: true,
    validator: JobValidator,
    enableSync: true,
    syncIdField: 'external_id',
    customHandlers: {
      post: handleCreateWithLimits,
    },
  })
);
