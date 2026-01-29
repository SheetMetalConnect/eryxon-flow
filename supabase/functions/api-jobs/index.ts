import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";
import { canCreateJob } from "@shared/plan-limits.ts";
import { JobValidator } from "@shared/validation/validators/JobValidator.ts";
import type { HandlerContext } from "@shared/handler.ts";
import { PaymentRequiredError, ValidationException, createSuccessResponse } from "@shared/validation/errorHandler.ts";

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

  // Extract nested data before creating job
  const { parts, ...jobData } = body;

  // Create the job
  const dataToInsert = {
    ...jobData,
    tenant_id: tenantId,
  };

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert(dataToInsert)
    .select()
    .single();

  if (jobError) {
    throw new Error(`Failed to create job: ${jobError.message}`);
  }

  // Create nested parts if provided
  const createdParts = [];
  const failedParts = [];
  const failedOperations = [];

  if (parts && Array.isArray(parts) && parts.length > 0) {
    for (const part of parts) {
      const { operations, ...partData } = part;

      // Create part
      const { data: createdPart, error: partError } = await supabase
        .from('parts')
        .insert({
          ...partData,
          job_id: job.id,
          tenant_id: tenantId,
          status: partData.status || 'not_started',
        })
        .select()
        .single();

      if (partError) {
        console.error('Failed to create part:', partError);
        failedParts.push({
          part: partData,
          error: partError.message,
        });
        continue; // Skip this part but continue with others
      }

      // Create nested operations if provided
      const createdOperations = [];
      if (operations && Array.isArray(operations) && operations.length > 0) {
        for (let i = 0; i < operations.length; i++) {
          const operation = operations[i];

          const { data: createdOp, error: opError } = await supabase
            .from('operations')
            .insert({
              ...operation,
              part_id: createdPart.id,
              tenant_id: tenantId,
              sequence: operation.sequence || (i + 1),
              status: operation.status || 'not_started',
            })
            .select()
            .single();

          if (opError) {
            console.error('Failed to create operation:', opError);
            failedOperations.push({
              operation,
              part_id: createdPart.id,
              error: opError.message,
            });
            continue;
          }

          createdOperations.push(createdOp);
        }
      }

      createdParts.push({
        ...createdPart,
        operations: createdOperations,
      });
    }
  }

  // Construct final response with nested data and warnings
  const responseData: any = {
    ...job,
    parts: createdParts,
  };

  // Add warnings if any parts or operations failed
  if (failedParts.length > 0 || failedOperations.length > 0) {
    responseData.warnings = {
      message: 'Job created but some nested resources failed',
      failed_parts: failedParts.length,
      failed_operations: failedOperations.length,
      details: {
        parts: failedParts,
        operations: failedOperations,
      },
    };
  }

  // Maintain original response format for backward compatibility
  return createSuccessResponse({ job: responseData }, 201);
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
    allowedFilters: ['status', 'customer', 'priority', 'job_number'],
    fuzzyFilters: ['customer', 'job_number'],
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
