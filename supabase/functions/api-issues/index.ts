import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";
import { IssueValidator } from "@shared/validation/validators/IssueValidator.ts";

// Configure CRUD handler for issues
export default serveApi(
  createCrudHandler({
    table: 'issues',
    selectFields: `
      id,
      title,
      description,
      severity,
      status,
      reported_by,
      assigned_to,
      resolved_at,
      resolution_notes,
      created_at,
      updated_at,
      job_id,
      part_id,
      operation_id,
      job:jobs (
        id,
        job_number,
        customer
      ),
      part:parts (
        id,
        part_number
      ),
      operation:operations (
        id,
        operation_name
      ),
      reporter:profiles!issues_reported_by_fkey (
        id,
        full_name,
        username
      ),
      assignee:profiles!issues_assigned_to_fkey (
        id,
        full_name,
        username
      )
    `,
    searchFields: ['title', 'description'],
    allowedFilters: ['severity', 'status', 'reported_by', 'assigned_to', 'job_id', 'part_id', 'operation_id'],
    sortableFields: ['created_at', 'severity', 'status', 'resolved_at'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: false,
    validator: IssueValidator,
  })
);
