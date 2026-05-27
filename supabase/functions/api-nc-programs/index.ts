import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";
import { NcProgramValidator } from "@shared/validation/validators/NcProgramValidator.ts";

serveApi(
  createCrudHandler({
    table: 'nc_programs',
    selectFields: `
      id, program_name, description, file_path, file_size, content_hash, mime_type,
      program_type, post_processor, machine_type, estimated_cycle_time_seconds,
      version, previous_version_id, status,
      part_id, operation_id,
      notes, metadata,
      created_at, updated_at,
      part:parts!part_id (id, part_number),
      operation:operations!operation_id (id, operation_name)
    `,
    searchFields: ['program_name', 'description', 'post_processor'],
    allowedFilters: ['status', 'program_type', 'part_id', 'operation_id', 'version'],
    fuzzyFilters: ['program_name', 'description'],
    sortableFields: ['program_name', 'version', 'created_at', 'status', 'program_type'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: true,
    validator: NcProgramValidator,
    enableSync: true,
    syncIdField: 'external_id',
  })
);
