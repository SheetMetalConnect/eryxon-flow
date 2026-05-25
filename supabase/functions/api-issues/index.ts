import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";
import { IssueValidator } from "@shared/validation/validators/IssueValidator.ts";

// Configure CRUD handler for issues
serveApi(
  createCrudHandler({
    table: 'issues',
    selectFields: `
      id,
      title,
      description,
      severity,
      status,
      issue_type,
      ncr_category,
      disposition,
      affected_quantity,
      reported_by_id,
      created_by,
      root_cause,
      corrective_action,
      preventive_action,
      resolution_notes,
      verification_required,
      reviewed_at,
      reviewed_by,
      image_paths,
      created_at,
      updated_at,
      operation_id,
      operation:operations (
        id,
        operation_name
      ),
      reporter:profiles!reported_by_id (
        id,
        full_name,
        username
      )
    `,
    searchFields: ['title', 'description'],
    allowedFilters: ['severity', 'status', 'issue_type', 'ncr_category', 'reported_by_id', 'operation_id'],
    sortableFields: ['created_at', 'severity', 'status', 'updated_at'],
    defaultSort: { field: 'created_at', direction: 'desc' },
    softDelete: false,
    validator: IssueValidator,
    // Pilot-critical lifecycle event (ERY-46): persist issue creation into
    // activity_log with the request-correlated id so a pilot incident trace
    // links the edge log and the durable row.
    onCreated: (ctx, record) =>
      ctx.recordPilotEvent({
        level: "info",
        eventType: "issue.created",
        action: "issue.created",
        description: `Issue created: ${record?.title ?? record?.id ?? "unknown"}`,
        entityType: "issue",
        entityId: record?.id,
        entityName: record?.title,
        extra: { severity: record?.severity, issue_type: record?.issue_type },
      }),
  })
);
