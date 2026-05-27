import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";
import { DncTransferJobValidator } from "@shared/validation/validators/DncTransferJobValidator.ts";
import type { HandlerContext } from "@shared/handler.ts";
import { createSuccessResponse, BadRequestError } from "@shared/validation/errorHandler.ts";
import { dispatchEvent } from "@shared/events.ts";

async function handleCreate(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId } = ctx;
  const body = await req.json();

  if (!body.nc_program_id) {
    throw new BadRequestError("nc_program_id is required");
  }

  const validator = new DncTransferJobValidator();
  const validation = await validator.validate(body, { tenantId, supabase });
  if (!validation.valid) {
    return createSuccessResponse({ error: validation.errors }, 422);
  }

  const { data: transfer, error } = await supabase
    .from('dnc_transfer_jobs')
    .insert({
      ...body,
      tenant_id: tenantId,
      status: body.status || 'pending',
      retry_count: 0,
      max_retries: body.max_retries || 3,
    })
    .select(`
      id, nc_program_id, target_machine_id, target_cell_id, destination_path,
      operation_id, status, transfer_protocol, transfer_config,
      started_at, completed_at, error_message, retry_count, max_retries,
      notes, metadata, created_at, updated_at,
      nc_program:nc_programs!nc_program_id (id, program_name, program_type, version)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to create DNC transfer job: ${error.message}`);
  }

  dispatchEvent(tenantId, "dnc.transfer.created", {
    transfer_id: transfer.id,
    nc_program_id: transfer.nc_program_id,
    status: transfer.status,
    target_machine_id: transfer.target_machine_id,
  });

  return createSuccessResponse({ dnc_transfer_job: transfer }, 201);
}

serveApi(
  createCrudHandler({
    table: 'dnc_transfer_jobs',
    selectFields: `
      id, nc_program_id, target_machine_id, target_cell_id, destination_path,
      operation_id, status, transfer_protocol, transfer_config,
      started_at, completed_at, error_message, retry_count, max_retries,
      requested_by, approved_by,
      notes, metadata, created_at, updated_at,
      nc_program:nc_programs!nc_program_id (id, program_name, program_type, version, file_path, content_hash),
      target_machine:resources!target_machine_id (id, name, identifier),
      target_cell:cells!target_cell_id (id, name),
      operation:operations!operation_id (id, operation_name)
    `,
    searchFields: ['notes'],
    allowedFilters: ['status', 'nc_program_id', 'target_machine_id', 'target_cell_id', 'transfer_protocol', 'operation_id'],
    sortableFields: ['created_at', 'status', 'started_at', 'completed_at', 'retry_count'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: false,
    validator: DncTransferJobValidator,
    customHandlers: {
      post: handleCreate,
    },
  })
);
