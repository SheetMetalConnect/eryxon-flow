/**
 * Agent Batch Operations Module
 *
 * Optimized tools for AI agents to perform batch operations on
 * jobs, parts, and operations. Supports scoping by customer, job,
 * or explicit IDs.
 *
 * Use Cases:
 * - Set bullet card on all parts of a customer/job
 * - Batch reschedule operations
 * - Bulk status updates
 * - Customer-scoped queries
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { schemas, validateArgs } from "../utils/validation.js";
import { structuredResponse, errorResponse } from "../utils/response.js";
import { databaseError } from "../utils/errors.js";

// ============================================================================
// Validation Schemas
// ============================================================================

const batchScopeSchema = z.object({
  customer: z.string().optional(),
  job_id: schemas.id.optional(),
  job_number: z.string().optional(),
  part_ids: z.array(schemas.id).optional(),
});

const rescheduleScopeSchema = z.object({
  job_id: schemas.id.optional(),
  job_number: z.string().optional(),
  part_id: schemas.id.optional(),
  cell_id: schemas.id.optional(),
  customer: z.string().optional(),
  operation_ids: z.array(schemas.id).optional(),
});

const partUpdatesSchema = z.object({
  is_bullet_card: z.boolean().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']).optional(),
  notes: z.string().optional(),
  current_cell_id: schemas.id.optional(),
});

const scheduleSchema = z.object({
  planned_start: z.string().datetime().optional(),
  planned_end: z.string().datetime().optional(),
  shift_days: z.number().optional(),
  shift_hours: z.number().optional(),
});

const partFilterSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']).optional(),
  exclude_completed: z.boolean().optional().default(true),
  due_before: z.string().optional(),
});

const operationFilterSchema = z.object({
  status: schemas.operationStatus.optional(),
  exclude_completed: z.boolean().optional().default(true),
  exclude_in_progress: z.boolean().optional(),
});

// Tool-specific schemas
const batchUpdatePartsSchema = z.object({
  scope: batchScopeSchema,
  updates: partUpdatesSchema,
  filter: partFilterSchema.optional(),
});

const batchRescheduleSchema = z.object({
  scope: rescheduleScopeSchema,
  schedule: scheduleSchema,
  filter: operationFilterSchema.optional(),
});

const prioritizeJobSchema = z.object({
  job_id: schemas.id.optional(),
  job_number: z.string().optional(),
  set_bullet_card: z.boolean().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  notes: z.string().optional(),
});

const fetchPartsByCustomerSchema = z.object({
  customer: z.string().min(1),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']).optional(),
  include_completed: z.boolean().optional(),
  limit: schemas.limit,
});

const batchCompleteSchema = z.object({
  scope: z.object({
    job_id: schemas.id.optional(),
    part_id: schemas.id.optional(),
    cell_id: schemas.id.optional(),
    operation_ids: z.array(schemas.id).optional(),
  }),
  completion_percentage: z.number().optional(),
  notes: z.string().optional(),
});

const jobOverviewSchema = z.object({
  job_id: schemas.id.optional(),
  job_number: z.string().optional(),
  include_operations: z.boolean().optional().default(true),
  include_parts: z.boolean().optional().default(true),
  include_issues: z.boolean().optional().default(false),
});

const resourceAvailabilitySchema = z.object({
  resource_type: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['available', 'in_use', 'maintenance', 'unavailable']).optional(),
  only_available: z.boolean().optional(),
  include_usage: z.boolean().optional(),
});

const assignResourceSchema = z.object({
  resource_id: schemas.id.optional(),
  resource_name: z.string().optional(),
  operation_ids: z.array(schemas.id).optional(),
  scope: z.object({
    job_id: schemas.id.optional(),
    job_number: z.string().optional(),
    part_id: schemas.id.optional(),
    cell_id: schemas.id.optional(),
  }).optional(),
  quantity: z.number().optional(),
  notes: z.string().optional(),
});


const cellCapacitySchema = z.object({
  cell_id: schemas.id.optional(),
  cell_name: z.string().optional(),
  include_all: z.boolean().optional(),
  date_range: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
});


const partsDueSoonSchema = z.object({
  due_within_days: z.number().optional(),
  customer: z.string().optional(),
  include_blocking_ops: z.boolean().optional(),
  status_filter: z.array(z.string()).optional(),
  sort_by: z.enum(['due_date', 'completion_percentage', 'customer']).optional(),
  limit: schemas.limit,
});

const suggestRescheduleSchema = z.object({
  job_id: schemas.id.optional(),
  job_number: z.string().optional(),
  part_id: schemas.id.optional(),
  target_date: z.string().optional(),
  consider_capacity: z.boolean().optional(),
  consolidate_with_customer: z.boolean().optional(),
});

// ============================================================================
// Tool Definitions
// ============================================================================

const tools: Tool[] = [
  // Batch Update Parts Tool
  {
    name: "batch_update_parts",
    description:
      "Update multiple parts within a SINGLE ORDER (job). Use job_id or job_number to scope. For bullet cards, use prioritize_job instead. DO NOT use customer scope for bullet cards.",
    inputSchema: {
      type: "object",
      properties: {
        scope: {
          type: "object",
          description: "Define which parts to update - must specify a job",
          properties: {
            job_id: {
              type: "string",
              description: "Update parts in this job (UUID) - REQUIRED for bullet card updates",
            },
            job_number: {
              type: "string",
              description: "Update parts in job with this job_number",
            },
            part_ids: {
              type: "array",
              items: { type: "string" },
              description: "Explicit list of part IDs to update (within a job)",
            },
          },
        },
        updates: {
          type: "object",
          description: "Fields to update on matching parts",
          properties: {
            is_bullet_card: {
              type: "boolean",
              description: "QRM bullet card flag - use prioritize_job tool instead for this",
            },
            status: {
              type: "string",
              enum: ["not_started", "in_progress", "completed", "on_hold"],
              description: "New status for parts",
            },
            notes: {
              type: "string",
              description: "Append notes to parts",
            },
            current_cell_id: {
              type: "string",
              description: "Move parts to this cell/stage (UUID)",
            },
          },
        },
        filter: {
          type: "object",
          description: "Filter which parts within the job to update",
          properties: {
            status: {
              type: "string",
              enum: ["not_started", "in_progress", "completed", "on_hold"],
              description: "Only update parts with this status",
            },
            exclude_completed: {
              type: "boolean",
              description: "Exclude completed parts (default: true)",
            },
            due_before: {
              type: "string",
              description: "Only parts from jobs due before this date (YYYY-MM-DD)",
            },
          },
        },
      },
      required: ["scope", "updates"],
    },
  },

  // Batch Reschedule Operations Tool
  {
    name: "batch_reschedule_operations",
    description:
      "Reschedule multiple operations at once. Scope by job, part, cell, or explicit IDs. Updates planned_start and planned_end times.",
    inputSchema: {
      type: "object",
      properties: {
        scope: {
          type: "object",
          description: "Define which operations to reschedule",
          properties: {
            job_id: {
              type: "string",
              description: "Reschedule all operations for this job",
            },
            job_number: {
              type: "string",
              description: "Reschedule all operations for job with this number",
            },
            part_id: {
              type: "string",
              description: "Reschedule all operations for this part",
            },
            cell_id: {
              type: "string",
              description: "Reschedule all operations at this cell/stage",
            },
            customer: {
              type: "string",
              description: "Reschedule all operations for this customer",
            },
            operation_ids: {
              type: "array",
              items: { type: "string" },
              description: "Explicit list of operation IDs to reschedule",
            },
          },
        },
        schedule: {
          type: "object",
          description: "New schedule values",
          properties: {
            planned_start: {
              type: "string",
              description: "New planned start date/time (ISO 8601)",
            },
            planned_end: {
              type: "string",
              description: "New planned end date/time (ISO 8601)",
            },
            shift_days: {
              type: "number",
              description: "Shift all dates by this many days (positive = later)",
            },
            shift_hours: {
              type: "number",
              description: "Shift all dates by this many hours",
            },
          },
        },
        filter: {
          type: "object",
          description: "Additional filters",
          properties: {
            status: {
              type: "string",
              enum: ["not_started", "in_progress", "on_hold"],
              description: "Only reschedule operations with this status",
            },
            exclude_completed: {
              type: "boolean",
              description: "Exclude completed operations (default: true)",
            },
            exclude_in_progress: {
              type: "boolean",
              description: "Exclude in-progress operations",
            },
          },
        },
      },
      required: ["scope", "schedule"],
    },
  },

  // Prioritize Job Tool
  {
    name: "prioritize_job",
    description:
      "Mark a job as high priority. Sets bullet card on all its parts and optionally updates job priority. Use for rush orders.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "Job ID (UUID) to prioritize",
        },
        job_number: {
          type: "string",
          description: "Job number to prioritize (alternative to job_id)",
        },
        set_bullet_card: {
          type: "boolean",
          description: "Set bullet card flag on all parts (default: true)",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "New priority level for the job",
        },
        notes: {
          type: "string",
          description: "Add priority notes to the job",
        },
      },
    },
  },

  // Fetch Parts by Customer Tool
  {
    name: "fetch_parts_by_customer",
    description:
      "Fetch all parts for a specific customer. Includes job context and operation progress.",
    inputSchema: {
      type: "object",
      properties: {
        customer: {
          type: "string",
          description: "Customer name to search for (case-insensitive partial match)",
        },
        status: {
          type: "string",
          enum: ["not_started", "in_progress", "completed", "on_hold"],
          description: "Filter by part status",
        },
        include_completed: {
          type: "boolean",
          description: "Include completed parts (default: false)",
        },
        limit: {
          type: "number",
          description: "Maximum parts to return (default: 100)",
        },
      },
      required: ["customer"],
    },
  },

  // Batch Complete Operations Tool
  {
    name: "batch_complete_operations",
    description:
      "Complete multiple operations at once. Scope by job, part, or explicit IDs.",
    inputSchema: {
      type: "object",
      properties: {
        scope: {
          type: "object",
          description: "Define which operations to complete",
          properties: {
            job_id: {
              type: "string",
              description: "Complete all operations for this job",
            },
            part_id: {
              type: "string",
              description: "Complete all operations for this part",
            },
            cell_id: {
              type: "string",
              description: "Complete all operations at this cell",
            },
            operation_ids: {
              type: "array",
              items: { type: "string" },
              description: "Explicit list of operation IDs to complete",
            },
          },
        },
        completion_percentage: {
          type: "number",
          description: "Set completion percentage (default: 100)",
        },
        notes: {
          type: "string",
          description: "Completion notes",
        },
      },
      required: ["scope"],
    },
  },

  // Get Job Overview Tool
  {
    name: "get_job_overview",
    description:
      "Get comprehensive overview of a job including all parts, operations, and progress. Useful for agents to understand full job context.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "Job ID (UUID)",
        },
        job_number: {
          type: "string",
          description: "Job number (alternative to job_id)",
        },
        include_operations: {
          type: "boolean",
          description: "Include operation details for each part (default: true)",
        },
        include_issues: {
          type: "boolean",
          description: "Include issue summary (default: true)",
        },
      },
    },
  },

  // Check Resource Availability Tool
  {
    name: "check_resource_availability",
    description:
      "Check availability of resources (machines, tools, fixtures). Filter by type, status, or location. Shows which resources are in use.",
    inputSchema: {
      type: "object",
      properties: {
        resource_type: {
          type: "string",
          description: "Filter by resource type (machine, tool, fixture, etc.)",
        },
        location: {
          type: "string",
          description: "Filter by location",
        },
        status: {
          type: "string",
          enum: ["available", "in_use", "maintenance", "unavailable"],
          description: "Filter by status",
        },
        only_available: {
          type: "boolean",
          description: "Only show available resources (default: false)",
        },
        include_usage: {
          type: "boolean",
          description: "Include current operation usage details (default: true)",
        },
      },
    },
  },

  // Assign Resource to Operations Tool
  {
    name: "assign_resource_to_operations",
    description:
      "Assign a resource to one or more operations. Useful for scheduling machines/tools.",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID to assign",
        },
        resource_name: {
          type: "string",
          description: "Resource name (alternative to resource_id)",
        },
        operation_ids: {
          type: "array",
          items: { type: "string" },
          description: "Operations to assign the resource to",
        },
        scope: {
          type: "object",
          description: "Scope operations by job/part instead of explicit IDs",
          properties: {
            job_id: { type: "string" },
            job_number: { type: "string" },
            part_id: { type: "string" },
            cell_id: { type: "string", description: "Only operations at this cell" },
          },
        },
        quantity: {
          type: "number",
          description: "Quantity of resource needed (default: 1)",
        },
        notes: {
          type: "string",
          description: "Assignment notes",
        },
      },
    },
  },

  // Get Cell Capacity Tool
  {
    name: "get_cell_capacity",
    description:
      "Get capacity information for cells/work centers. Shows current WIP, capacity, and upcoming workload.",
    inputSchema: {
      type: "object",
      properties: {
        cell_id: {
          type: "string",
          description: "Specific cell ID to check",
        },
        cell_name: {
          type: "string",
          description: "Specific cell name to check",
        },
        include_all: {
          type: "boolean",
          description: "Get capacity for all cells (default: true if no cell specified)",
        },
        date_range: {
          type: "object",
          description: "Check capacity for date range",
          properties: {
            start: { type: "string", description: "Start date (YYYY-MM-DD)" },
            end: { type: "string", description: "End date (YYYY-MM-DD)" },
          },
        },
      },
    },
  },

  // Get Parts Due Soon Tool
  {
    name: "get_parts_due_soon",
    description:
      "Find parts that are due soon, showing completion status and what's blocking them. Critical for planning.",
    inputSchema: {
      type: "object",
      properties: {
        due_within_days: {
          type: "number",
          description: "Parts due within this many days (default: 7)",
        },
        customer: {
          type: "string",
          description: "Filter by customer",
        },
        include_blocking_ops: {
          type: "boolean",
          description: "Show which operations are blocking completion (default: true)",
        },
        status_filter: {
          type: "array",
          items: { type: "string" },
          description: "Filter by status (default: not_started, in_progress)",
        },
        sort_by: {
          type: "string",
          enum: ["due_date", "completion_percentage", "customer"],
          description: "Sort results by (default: due_date)",
        },
        limit: {
          type: "number",
          description: "Max results (default: 50)",
        },
      },
    },
  },

  // Suggest Reschedule Tool
  {
    name: "suggest_reschedule",
    description:
      "Analyze a job/part and suggest reschedule options based on capacity and shipping needs.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "Job to analyze",
        },
        job_number: {
          type: "string",
          description: "Job number (alternative to job_id)",
        },
        part_id: {
          type: "string",
          description: "Specific part to analyze",
        },
        target_date: {
          type: "string",
          description: "Desired completion date (YYYY-MM-DD)",
        },
        consider_capacity: {
          type: "boolean",
          description: "Check cell capacity when suggesting (default: true)",
        },
        consolidate_with_customer: {
          type: "boolean",
          description: "Look for other customer jobs to consolidate (default: true)",
        },
      },
    },
  },
];

// ============================================================================
// Handler Implementations
// ============================================================================

/**
 * Batch Update Parts Handler
 */
const batchUpdateParts: ToolHandler = async (args, supabase) => {
  try {
    const { scope, updates, filter } = validateArgs(args, batchUpdatePartsSchema);

    // Validate scope
    if (!scope.customer && !scope.job_id && !scope.job_number && !scope.part_ids) {
      return errorResponse(new Error("Must specify at least one scope: customer, job_id, job_number, or part_ids"));
    }

    // Build query to find matching parts
    let partIds: string[] = [];

    if (scope.part_ids && scope.part_ids.length > 0) {
      partIds = scope.part_ids;
    } else {
      let query = supabase.from("parts").select("id, jobs!inner(customer, job_number)");

      if (scope.customer) {
        query = query.ilike("jobs.customer", `%${scope.customer}%`);
      }
      if (scope.job_id) {
        query = query.eq("job_id", scope.job_id);
      }
      if (scope.job_number) {
        query = query.eq("jobs.job_number", scope.job_number);
      }

      // Apply filters
      const excludeCompleted = filter?.exclude_completed ?? true;
      if (excludeCompleted) {
        query = query.neq("status", "completed");
      }
      if (filter?.status) {
        query = query.eq("status", filter.status);
      }
      if (filter?.due_before) {
        query = query.lte("due_date", filter.due_before);
      }

      query = query.is("deleted_at", null);

      const { data, error } = await query;
      if (error) throw error;

      partIds = (data || []).map((p: any) => p.id);
    }

    if (partIds.length === 0) {
      return structuredResponse({ updated: 0, message: "No matching parts found" });
    }

    // Perform update
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (updates.is_bullet_card !== undefined) updatePayload.is_bullet_card = updates.is_bullet_card;
    if (updates.status) updatePayload.status = updates.status;
    if (updates.current_cell_id) updatePayload.current_cell_id = updates.current_cell_id;
    if (updates.notes) updatePayload.notes = updates.notes;

    const { data: updated, error: updateError } = await supabase
      .from("parts")
      .update(updatePayload)
      .in("id", partIds)
      .select("id, part_number, is_bullet_card, status");

    if (updateError) throw updateError;

    return structuredResponse(
      {
        updated: updated?.length || 0,
        parts: updated,
        updates_applied: Object.keys(updatePayload).filter((k) => k !== "updated_at"),
      },
      `Updated ${updated?.length || 0} parts`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Batch Reschedule Operations Handler
 */
const batchRescheduleOperations: ToolHandler = async (args, supabase) => {
  try {
    const { scope, schedule, filter } = validateArgs(args, batchRescheduleSchema);

    // Validate scope
    const hasScope = scope.job_id || scope.job_number || scope.part_id || scope.cell_id || scope.customer || scope.operation_ids;
    if (!hasScope) {
      return errorResponse(new Error("Must specify at least one scope"));
    }

    // Build query to find matching operations
    let operationIds: string[] = [];

    if (scope.operation_ids && scope.operation_ids.length > 0) {
      operationIds = scope.operation_ids;
    } else {
      let query = supabase
        .from("operations")
        .select("id, planned_start, planned_end, parts!inner(id, job_id, jobs!inner(id, customer, job_number))");

      if (scope.job_id) {
        query = query.eq("parts.job_id", scope.job_id);
      }
      if (scope.job_number) {
        query = query.eq("parts.jobs.job_number", scope.job_number);
      }
      if (scope.part_id) {
        query = query.eq("part_id", scope.part_id);
      }
      if (scope.cell_id) {
        query = query.eq("cell_id", scope.cell_id);
      }
      if (scope.customer) {
        query = query.ilike("parts.jobs.customer", `%${scope.customer}%`);
      }

      // Apply filters
      const excludeCompleted = filter?.exclude_completed ?? true;
      if (excludeCompleted) {
        query = query.neq("status", "completed");
      }
      if (filter?.exclude_in_progress) {
        query = query.neq("status", "in_progress");
      }
      if (filter?.status) {
        query = query.eq("status", filter.status);
      }

      query = query.is("deleted_at", null);

      const { data, error } = await query;
      if (error) throw error;

      operationIds = (data || []).map((o: any) => o.id);
    }

    if (operationIds.length === 0) {
      return structuredResponse({ updated: 0, message: "No matching operations found" });
    }

    // Calculate updates
    const now = new Date().toISOString();
    const updatePayload: any = { updated_at: now };

    if (schedule.planned_start) {
      updatePayload.planned_start = schedule.planned_start;
    }
    if (schedule.planned_end) {
      updatePayload.planned_end = schedule.planned_end;
    }

    // If shift_days or shift_hours specified, we need to update each operation individually
    if (schedule.shift_days !== undefined || schedule.shift_hours !== undefined) {
      // Fetch current dates
      const { data: ops, error: fetchError } = await supabase
        .from("operations")
        .select("id, planned_start, planned_end")
        .in("id", operationIds);

      if (fetchError) throw fetchError;

      const shiftMs = ((schedule.shift_days || 0) * 24 * 60 * 60 * 1000) + ((schedule.shift_hours || 0) * 60 * 60 * 1000);

      let updatedCount = 0;
      for (const op of ops || []) {
        const opUpdate: any = { updated_at: now };
        if (op.planned_start) {
          opUpdate.planned_start = new Date(new Date(op.planned_start).getTime() + shiftMs).toISOString();
        }
        if (op.planned_end) {
          opUpdate.planned_end = new Date(new Date(op.planned_end).getTime() + shiftMs).toISOString();
        }

        const { error: updateError } = await supabase.from("operations").update(opUpdate).eq("id", op.id);
        if (updateError) throw updateError;
        updatedCount++;
      }

      return structuredResponse(
        {
          updated: updatedCount,
          shift_applied: {
            days: schedule.shift_days || 0,
            hours: schedule.shift_hours || 0,
          },
        },
        `Rescheduled ${updatedCount} operations`,
      );
    }

    // Direct date update
    const { data: updated, error: updateError } = await supabase
      .from("operations")
      .update(updatePayload)
      .in("id", operationIds)
      .select("id, operation_name, planned_start, planned_end");

    if (updateError) throw updateError;

    return structuredResponse(
      {
        updated: updated?.length || 0,
        operations: updated,
      },
      `Rescheduled ${updated?.length || 0} operations`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Prioritize Job Handler
 */
const prioritizeJob: ToolHandler = async (args, supabase) => {
  try {
    const { job_id, job_number, set_bullet_card, priority, notes } = validateArgs(args, prioritizeJobSchema);

    if (!job_id && !job_number) {
      return errorResponse(new Error("Must specify job_id or job_number"));
    }

    // Find job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, job_number, customer")
      .eq(job_id ? "id" : "job_number", job_id || job_number)
      .is("deleted_at", null)
      .single();
    if (jobError) throw jobError;
    if (!job) return errorResponse(new Error("Job not found"));

    const now = new Date().toISOString();
    const results: any = { job_id: job.id, job_number: job.job_number };

    // Update job if priority or notes specified
    if (priority || notes) {
      const jobUpdate: any = { updated_at: now };
      if (priority) jobUpdate.priority = priority;
      if (notes) {
        // Append notes
        const { data: currentJob, error: notesFetchError } = await supabase
          .from("jobs")
          .select("notes")
          .eq("id", job.id)
          .single();
        if (notesFetchError) throw notesFetchError;
        jobUpdate.notes = currentJob?.notes
          ? `${currentJob.notes}\n[PRIORITY] ${notes}`
          : `[PRIORITY] ${notes}`;
      }

      const { error: jobUpdateError } = await supabase.from("jobs").update(jobUpdate).eq("id", job.id);
      if (jobUpdateError) throw jobUpdateError;
      results.job_updated = true;
      if (priority) results.new_priority = priority;
    }

    // Set bullet card on all parts
    const shouldSetBulletCard = set_bullet_card ?? true;
    if (shouldSetBulletCard) {
      const { data: updated, error: partError } = await supabase
        .from("parts")
        .update({ is_bullet_card: true, updated_at: now })
        .eq("job_id", job.id)
        .neq("status", "completed")
        .is("deleted_at", null)
        .select("id");

      if (partError) throw partError;

      results.parts_updated = updated?.length || 0;
      results.bullet_card_set = true;
    }

    return structuredResponse(results, `Job ${job.job_number} prioritized`);
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Fetch Parts by Customer Handler
 */
const fetchPartsByCustomer: ToolHandler = async (args, supabase) => {
  try {
    const { customer, status, include_completed, limit } = validateArgs(args, fetchPartsByCustomerSchema);

    let query = supabase
      .from("parts")
      .select(`
        id,
        part_number,
        material,
        quantity,
        status,
        is_bullet_card,
        created_at,
        jobs!inner (
          id,
          job_number,
          customer,
          due_date,
          status
        ),
        operations (
          id,
          operation_name,
          status,
          sequence
        )
      `)
      .ilike("jobs.customer", `%${customer}%`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit || 100);

    if (status) {
      query = query.eq("status", status);
    }
    if (!include_completed) {
      query = query.neq("status", "completed");
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group by job for better agent readability
    // Note: jobs is an object (not array) due to !inner join
    const jobsMap = new Map<string, any>();
    for (const part of (data || []) as any[]) {
      const jobId = part.jobs?.id;
      if (!jobId) continue;
      if (!jobsMap.has(jobId)) {
        jobsMap.set(jobId, {
          ...part.jobs,
          parts: [],
        });
      }
      jobsMap.get(jobId).parts.push({
        id: part.id,
        part_number: part.part_number,
        material: part.material,
        quantity: part.quantity,
        status: part.status,
        is_bullet_card: part.is_bullet_card,
        operations_count: part.operations?.length || 0,
        operations_completed: part.operations?.filter((o: any) => o.status === "completed").length || 0,
      });
    }

    return structuredResponse(
      {
        customer_search: customer,
        total_parts: data?.length || 0,
        total_jobs: jobsMap.size,
        jobs: Array.from(jobsMap.values()),
      },
      `Found ${data?.length || 0} parts across ${jobsMap.size} jobs for customer "${customer}"`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Batch Complete Operations Handler
 */
const batchCompleteOperations: ToolHandler = async (args, supabase) => {
  try {
    const { scope, completion_percentage, notes } = validateArgs(args, batchCompleteSchema);

    const hasScope = scope.job_id || scope.part_id || scope.cell_id || scope.operation_ids;
    if (!hasScope) {
      return errorResponse(new Error("Must specify at least one scope"));
    }

    // Find operations
    let operationIds: string[] = [];

    if (scope.operation_ids && scope.operation_ids.length > 0) {
      operationIds = scope.operation_ids;
    } else {
      let query = supabase
        .from("operations")
        .select("id, parts!inner(job_id)")
        .in("status", ["not_started", "in_progress", "on_hold"])
        .is("deleted_at", null);

      if (scope.job_id) {
        query = query.eq("parts.job_id", scope.job_id);
      }
      if (scope.part_id) {
        query = query.eq("part_id", scope.part_id);
      }
      if (scope.cell_id) {
        query = query.eq("cell_id", scope.cell_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      operationIds = (data || []).map((o: any) => o.id);
    }

    if (operationIds.length === 0) {
      return structuredResponse({ completed: 0, message: "No pending operations found" });
    }

    const now = new Date().toISOString();
    const updatePayload: any = {
      status: "completed",
      completed_at: now,
      completion_percentage: completion_percentage ?? 100,
      updated_at: now,
    };
    if (notes) updatePayload.notes = notes;

    const { data: completed, error: updateError } = await supabase
      .from("operations")
      .update(updatePayload)
      .in("id", operationIds)
      .select("id, operation_name");

    if (updateError) throw updateError;

    return structuredResponse(
      {
        completed: completed?.length || 0,
        operations: completed,
      },
      `Completed ${completed?.length || 0} operations`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Get Job Overview Handler
 */
const getJobOverview: ToolHandler = async (args, supabase) => {
  try {
    const { job_id, job_number, include_operations, include_issues } = validateArgs(args, jobOverviewSchema);

    if (!job_id && !job_number) {
      return errorResponse(new Error("Must specify job_id or job_number"));
    }

    // Fetch job with parts
    let jobQuery = supabase
      .from("jobs")
      .select(`
        *,
        parts (
          id,
          part_number,
          material,
          quantity,
          status,
          is_bullet_card,
          current_cell_id
        )
      `)
      .is("deleted_at", null);

    if (job_id) {
      jobQuery = jobQuery.eq("id", job_id);
    } else {
      jobQuery = jobQuery.eq("job_number", job_number);
    }

    const { data: job, error: jobError } = await jobQuery.single();
    if (jobError) throw jobError;
    if (!job) return errorResponse(new Error("Job not found"));

    // Fetch operations if requested
    const shouldIncludeOps = include_operations ?? true;
    let operationsData: any[] = [];
    if (shouldIncludeOps && job.parts?.length > 0) {
      const partIds = job.parts.map((p: any) => p.id);
      const { data: ops, error: opsError } = await supabase
        .from("operations")
        .select("id, part_id, operation_name, sequence, status, estimated_time, actual_time, cell_id, planned_start, planned_end")
        .in("part_id", partIds)
        .is("deleted_at", null)
        .order("sequence");

      if (!opsError) {
        operationsData = ops || [];
      }
    }

    // Fetch issues if requested
    const shouldIncludeIssues = include_issues ?? true;
    let issuesData: any = null;
    if (shouldIncludeIssues && job.parts?.length > 0) {
      const partIds = job.parts.map((p: any) => p.id);
      const { data: opIds } = await supabase
        .from("operations")
        .select("id")
        .in("part_id", partIds)
        .is("deleted_at", null);

      if (opIds && opIds.length > 0) {
        const { data: issues } = await supabase
          .from("issues")
          .select("id, severity, status")
          .in("operation_id", opIds.map((o: any) => o.id));

        if (issues) {
          issuesData = {
            total: issues.length,
            by_severity: {
              critical: issues.filter((i: any) => i.severity === "critical").length,
              high: issues.filter((i: any) => i.severity === "high").length,
              medium: issues.filter((i: any) => i.severity === "medium").length,
              low: issues.filter((i: any) => i.severity === "low").length,
            },
            open: issues.filter((i: any) => i.status === "open").length,
          };
        }
      }
    }

    // Build overview with progress calculations
    const partsWithOps = job.parts?.map((part: any) => {
      const partOps = operationsData.filter((o: any) => o.part_id === part.id);
      return {
        ...part,
        operations: shouldIncludeOps ? partOps : undefined,
        progress: {
          total_operations: partOps.length,
          completed: partOps.filter((o: any) => o.status === "completed").length,
          in_progress: partOps.filter((o: any) => o.status === "in_progress").length,
          percentage: partOps.length > 0
            ? Math.round((partOps.filter((o: any) => o.status === "completed").length / partOps.length) * 100)
            : 0,
        },
      };
    }) || [];

    // Calculate job-level progress
    const totalOps = operationsData.length;
    const completedOps = operationsData.filter((o: any) => o.status === "completed").length;

    return structuredResponse(
      {
        job: {
          id: job.id,
          job_number: job.job_number,
          customer: job.customer,
          status: job.status,
          due_date: job.due_date,
          notes: job.notes,
          created_at: job.created_at,
        },
        progress: {
          total_parts: job.parts?.length || 0,
          parts_completed: job.parts?.filter((p: any) => p.status === "completed").length || 0,
          total_operations: totalOps,
          operations_completed: completedOps,
          overall_percentage: totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0,
        },
        bullet_cards: job.parts?.filter((p: any) => p.is_bullet_card).length || 0,
        parts: partsWithOps,
        issues: issuesData,
      },
      `Overview for job ${job.job_number}`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Check Resource Availability Handler
 */
const checkResourceAvailability: ToolHandler = async (args, supabase) => {
  try {
    const { resource_type, location, status, only_available, include_usage } = validateArgs(args, resourceAvailabilitySchema);

    let query = supabase
      .from("resources")
      .select("*")
      .eq("active", true)
      .is("deleted_at", null)
      .order("name");

    if (resource_type) {
      query = query.eq("type", resource_type);
    }
    if (location) {
      query = query.ilike("location", `%${location}%`);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (only_available) {
      query = query.eq("status", "available");
    }

    const { data: resources, error } = await query;
    if (error) throw error;

    // Get current usage if requested
    const shouldIncludeUsage = include_usage ?? true;
    const usageMap = new Map<string, any[]>();

    if (shouldIncludeUsage && resources && resources.length > 0) {
      const resourceIds = resources.map((r: any) => r.id);
      const { data: usage } = await supabase
        .from("operation_resources")
        .select(`
          resource_id,
          quantity,
          operations!inner (
            id,
            operation_name,
            status,
            parts!inner (
              part_number,
              jobs!inner (job_number, customer)
            )
          )
        `)
        .in("resource_id", resourceIds)
        .in("operations.status", ["in_progress", "not_started"]);

      if (usage) {
        // Note: operations, parts, jobs are objects due to !inner joins
        for (const u of usage as any[]) {
          const existing = usageMap.get(u.resource_id) || [];
          existing.push({
            operation_id: u.operations?.id,
            operation_name: u.operations?.operation_name,
            status: u.operations?.status,
            quantity: u.quantity,
            job_number: u.operations?.parts?.jobs?.job_number,
            customer: u.operations?.parts?.jobs?.customer,
          });
          usageMap.set(u.resource_id, existing);
        }
      }
    }

    const enrichedResources = (resources || []).map((r: any) => ({
      ...r,
      current_usage: usageMap.get(r.id) || [],
      is_available: r.status === "available" && (usageMap.get(r.id)?.length || 0) === 0,
    }));

    // Summary by type
    const byType = new Map<string, { total: number; available: number }>();
    for (const r of enrichedResources) {
      const current = byType.get(r.type) || { total: 0, available: 0 };
      current.total++;
      if (r.is_available) current.available++;
      byType.set(r.type, current);
    }

    return structuredResponse(
      {
        total: enrichedResources.length,
        available: enrichedResources.filter((r: any) => r.is_available).length,
        by_type: Object.fromEntries(byType),
        resources: enrichedResources,
      },
      `Found ${enrichedResources.length} resources`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Assign Resource to Operations Handler
 */
const assignResourceToOperations: ToolHandler = async (args, supabase) => {
  try {
    const { resource_id, resource_name, operation_ids, scope, quantity, notes } = validateArgs(args, assignResourceSchema);

    // Find resource
    let resourceQuery = supabase.from("resources").select("id, name").eq("active", true).is("deleted_at", null);
    if (resource_id) {
      resourceQuery = resourceQuery.eq("id", resource_id);
    } else if (resource_name) {
      resourceQuery = resourceQuery.ilike("name", `%${resource_name}%`);
    } else {
      return errorResponse(new Error("Must specify resource_id or resource_name"));
    }

    const { data: resources, error: resError } = await resourceQuery;
    if (resError) throw resError;
    if (!resources || resources.length === 0) {
      return errorResponse(new Error("Resource not found"));
    }
    const resource = resources[0];

    // Find operations
    let opIds: string[] = [];
    if (operation_ids && operation_ids.length > 0) {
      opIds = operation_ids;
    } else if (scope) {
      let opQuery = supabase
        .from("operations")
        .select("id, parts!inner(job_id, jobs!inner(job_number))")
        .is("deleted_at", null)
        .neq("status", "completed");

      if (scope.job_id) {
        opQuery = opQuery.eq("parts.job_id", scope.job_id);
      }
      if (scope.job_number) {
        opQuery = opQuery.eq("parts.jobs.job_number", scope.job_number);
      }
      if (scope.part_id) {
        opQuery = opQuery.eq("part_id", scope.part_id);
      }
      if (scope.cell_id) {
        opQuery = opQuery.eq("cell_id", scope.cell_id);
      }

      const { data: ops, error: opError } = await opQuery;
      if (opError) throw opError;
      opIds = (ops || []).map((o: any) => o.id);
    }

    if (opIds.length === 0) {
      return structuredResponse({ assigned: 0, message: "No operations found" });
    }

    // Create assignments
    const assignments = opIds.map((opId) => ({
      resource_id: resource.id,
      operation_id: opId,
      quantity: quantity || 1,
      notes: notes,
    }));

    // Upsert (avoid duplicates)
    const { data: created, error: assignError } = await supabase
      .from("operation_resources")
      .upsert(assignments, { onConflict: "operation_id,resource_id" })
      .select("id, operation_id");

    if (assignError) throw assignError;

    return structuredResponse(
      {
        resource: { id: resource.id, name: resource.name },
        assigned: created?.length || 0,
        operations: opIds,
      },
      `Assigned ${resource.name} to ${created?.length || 0} operations`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Get Cell Capacity Handler
 */
const getCellCapacity: ToolHandler = async (args, supabase) => {
  try {
    const { cell_id, cell_name, include_all, date_range } = validateArgs(args, cellCapacitySchema);

    // Fetch cells
    let cellQuery = supabase
      .from("cells")
      .select("*")
      .eq("active", true)
      .is("deleted_at", null)
      .order("sequence");

    if (cell_id) {
      cellQuery = cellQuery.eq("id", cell_id);
    } else if (cell_name) {
      cellQuery = cellQuery.ilike("name", `%${cell_name}%`);
    } else if (!include_all && include_all !== undefined) {
      // If include_all is explicitly false and no cell specified, return error
      return errorResponse(new Error("Specify cell_id, cell_name, or set include_all: true"));
    }

    const { data: cells, error } = await cellQuery;
    if (error) throw error;

    if (!cells || cells.length === 0) {
      return structuredResponse({ cells: [] }, "No cells found");
    }

    // Get WIP counts and operations for each cell
    const cellIds = cells.map((c: any) => c.id);

    // Current WIP (in-progress + not_started operations)
    let opsQuery = supabase
      .from("operations")
      .select("id, cell_id, status, estimated_time, planned_start, planned_end")
      .in("cell_id", cellIds)
      .in("status", ["not_started", "in_progress"])
      .is("deleted_at", null);

    if (date_range?.start && date_range?.end) {
      opsQuery = opsQuery.gte("planned_start", date_range.start).lte("planned_end", date_range.end);
    }

    const { data: operations } = await opsQuery;

    // Group by cell
    const opsByCell = new Map<string, any[]>();
    for (const op of operations || []) {
      const existing = opsByCell.get(op.cell_id) || [];
      existing.push(op);
      opsByCell.set(op.cell_id, existing);
    }

    const enrichedCells = cells.map((cell: any) => {
      const cellOps = opsByCell.get(cell.id) || [];
      const wipCount = cellOps.length;
      const totalEstimatedHours = cellOps.reduce((sum: number, op: any) => sum + (op.estimated_time || 0), 0);
      const inProgressCount = cellOps.filter((op: any) => op.status === "in_progress").length;
      const queuedCount = cellOps.filter((op: any) => op.status === "not_started").length;

      return {
        id: cell.id,
        name: cell.name,
        color: cell.color,
        capacity: {
          wip_limit: cell.wip_limit,
          wip_current: wipCount,
          wip_available: cell.wip_limit ? Math.max(0, cell.wip_limit - wipCount) : null,
          at_capacity: cell.wip_limit ? wipCount >= cell.wip_limit : false,
          capacity_hours_per_day: cell.capacity_hours_per_day,
          total_queued_hours: totalEstimatedHours,
        },
        operations: {
          total: wipCount,
          in_progress: inProgressCount,
          queued: queuedCount,
        },
        warnings: {
          over_wip_limit: cell.wip_limit && wipCount > cell.wip_limit,
          near_capacity: cell.wip_warning_threshold && wipCount >= cell.wip_warning_threshold,
        },
      };
    });

    // Summary
    const summary = {
      total_cells: enrichedCells.length,
      at_capacity: enrichedCells.filter((c: any) => c.capacity.at_capacity).length,
      with_warnings: enrichedCells.filter((c: any) => c.warnings.over_wip_limit || c.warnings.near_capacity).length,
      total_wip: enrichedCells.reduce((sum: number, c: any) => sum + c.operations.total, 0),
    };

    return structuredResponse(
      {
        summary,
        cells: enrichedCells,
      },
      `Capacity info for ${enrichedCells.length} cells`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Get Parts Due Soon Handler
 * Find parts due soon with completion status and blocking operations
 */
const getPartsDueSoon: ToolHandler = async (args, supabase) => {
  try {
    const { due_within_days, customer, include_blocking_ops, status_filter, sort_by, limit } = validateArgs(args, partsDueSoonSchema);

    const days = due_within_days ?? 7;
    const shouldIncludeBlocking = include_blocking_ops ?? true;
    const statusesToInclude = status_filter || ["not_started", "in_progress"];
    const maxResults = limit ?? 50;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    // Fetch parts with job due dates
    let query = supabase
      .from("parts")
      .select(`
        id,
        part_number,
        quantity,
        status,
        is_bullet_card,
        jobs!inner (
          id,
          job_number,
          customer,
          due_date,
          status
        ),
        operations (
          id,
          operation_name,
          sequence,
          status,
          cell_id,
          estimated_time
        )
      `)
      .is("deleted_at", null)
      .in("status", statusesToInclude)
      .lte("jobs.due_date", cutoffStr)
      .limit(maxResults);

    if (customer) {
      query = query.ilike("jobs.customer", `%${customer}%`);
    }

    const { data: parts, error } = await query;
    if (error) throw error;

    // Enrich with blocking info
    const enrichedParts = (parts || []).map((part: any) => {
      const ops = part.operations || [];
      const totalOps = ops.length;
      const completedOps = ops.filter((o: any) => o.status === "completed").length;
      const inProgressOps = ops.filter((o: any) => o.status === "in_progress");
      const pendingOps = ops.filter((o: any) => o.status === "not_started");

      // Find next blocking operation (first non-completed in sequence)
      const sortedOps = [...ops].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
      const nextBlockingOp = sortedOps.find((o: any) => o.status !== "completed");

      const result: any = {
        id: part.id,
        part_number: part.part_number,
        quantity: part.quantity,
        status: part.status,
        is_bullet_card: part.is_bullet_card,
        job_number: part.jobs.job_number,
        customer: part.jobs.customer,
        due_date: part.jobs.due_date,
        days_until_due: Math.ceil(
          (new Date(part.jobs.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
        progress: {
          total_operations: totalOps,
          completed: completedOps,
          in_progress: inProgressOps.length,
          pending: pendingOps.length,
          percentage: totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0,
        },
      };

      if (shouldIncludeBlocking && nextBlockingOp) {
        result.blocking_operation = {
          id: nextBlockingOp.id,
          name: nextBlockingOp.operation_name,
          sequence: nextBlockingOp.sequence,
          status: nextBlockingOp.status,
          estimated_time: nextBlockingOp.estimated_time,
        };
      }

      return result;
    });

    // Sort results
    const sortedParts = [...enrichedParts].sort((a, b) => {
      switch (sort_by) {
        case "completion_percentage":
          return b.progress.percentage - a.progress.percentage;
        case "customer":
          return (a.customer || "").localeCompare(b.customer || "");
        case "due_date":
        default:
          return a.days_until_due - b.days_until_due;
      }
    });

    // Summary
    const overdue = sortedParts.filter((p) => p.days_until_due < 0);
    const dueSoon = sortedParts.filter((p) => p.days_until_due >= 0 && p.days_until_due <= 3);
    const bulletCards = sortedParts.filter((p) => p.is_bullet_card);

    return structuredResponse(
      {
        summary: {
          total_parts: sortedParts.length,
          overdue: overdue.length,
          due_within_3_days: dueSoon.length,
          bullet_cards: bulletCards.length,
          due_within_days: days,
        },
        parts: sortedParts,
        alerts: {
          overdue_parts: overdue.map((p) => ({
            part_number: p.part_number,
            job_number: p.job_number,
            days_overdue: Math.abs(p.days_until_due),
            completion: p.progress.percentage,
          })),
        },
      },
      `Found ${sortedParts.length} parts due within ${days} days (${overdue.length} overdue)`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Suggest Reschedule Handler
 * Analyze job/part and suggest reschedule options based on capacity
 */
const suggestReschedule: ToolHandler = async (args, supabase) => {
  try {
    const { job_id, job_number, part_id, target_date, consider_capacity, consolidate_with_customer } = validateArgs(args, suggestRescheduleSchema);

    const shouldConsiderCapacity = consider_capacity ?? true;
    const shouldConsolidate = consolidate_with_customer ?? true;

    // Find job
    let job: any = null;
    if (job_id || job_number) {
      let jobQuery = supabase.from("jobs").select("*, parts(id, part_number, status)").is("deleted_at", null);
      if (job_id) {
        jobQuery = jobQuery.eq("id", job_id);
      } else {
        jobQuery = jobQuery.eq("job_number", job_number);
      }
      const { data, error } = await jobQuery.single();
      if (error) throw error;
      job = data;
    } else if (part_id) {
      const { data: part, error: partError } = await supabase
        .from("parts")
        .select("*, jobs(*)")
        .eq("id", part_id)
        .single();
      if (partError) throw partError;
      job = part.jobs;
    }

    if (!job) {
      return errorResponse(new Error("Must specify job_id, job_number, or part_id"));
    }

    // Get operations for capacity analysis
    const partIds = part_id ? [part_id] : (job.parts || []).map((p: any) => p.id);
    const { data: operations } = await supabase
      .from("operations")
      .select("id, cell_id, status, estimated_time, planned_start, planned_end")
      .in("part_id", partIds)
      .neq("status", "completed")
      .is("deleted_at", null);

    // Analyze capacity if requested
    let capacityAnalysis: any = null;
    if (shouldConsiderCapacity && operations && operations.length > 0) {
      const cellIds = [...new Set(operations.map((o: any) => o.cell_id).filter(Boolean))];

      if (cellIds.length > 0) {
        const { data: cells } = await supabase.from("cells").select("id, name, wip_limit").in("id", cellIds);

        // Get current WIP for each cell
        const { data: wipCounts } = await supabase
          .from("operations")
          .select("cell_id")
          .in("cell_id", cellIds)
          .in("status", ["in_progress", "not_started"]);

        const wipByCell = new Map<string, number>();
        for (const op of wipCounts || []) {
          wipByCell.set(op.cell_id, (wipByCell.get(op.cell_id) || 0) + 1);
        }

        capacityAnalysis = (cells || []).map((cell: any) => ({
          cell_name: cell.name,
          wip_limit: cell.wip_limit,
          current_wip: wipByCell.get(cell.id) || 0,
          available_capacity: cell.wip_limit ? cell.wip_limit - (wipByCell.get(cell.id) || 0) : null,
          bottleneck: cell.wip_limit && (wipByCell.get(cell.id) || 0) >= cell.wip_limit,
        }));
      }
    }

    // Find consolidation opportunities
    let consolidationOptions: any[] = [];
    if (shouldConsolidate && job.customer) {
      const { data: customerJobs } = await supabase
        .from("jobs")
        .select("id, job_number, due_date, status")
        .ilike("customer", job.customer)
        .neq("id", job.id)
        .is("deleted_at", null)
        .neq("status", "completed")
        .order("due_date")
        .limit(5);

      consolidationOptions = (customerJobs || []).map((cj: any) => ({
        job_number: cj.job_number,
        due_date: cj.due_date,
        status: cj.status,
        days_difference: Math.ceil(
          (new Date(cj.due_date).getTime() - new Date(job.due_date).getTime()) / (1000 * 60 * 60 * 24),
        ),
      }));
    }

    // Generate suggestions
    const suggestions: any[] = [];
    const currentDue = new Date(job.due_date);
    const targetDt = target_date ? new Date(target_date) : null;

    // Check if there are bottlenecks
    const bottlenecks = capacityAnalysis?.filter((c: any) => c.bottleneck) || [];
    if (bottlenecks.length > 0) {
      suggestions.push({
        type: "capacity_constraint",
        message: `${bottlenecks.length} cell(s) at capacity: ${bottlenecks.map((b: any) => b.cell_name).join(", ")}`,
        recommendation: "Consider shifting to lower-demand time slots or prioritizing this job",
      });
    }

    // Check for consolidation
    const nearbyJobs = consolidationOptions.filter((cj: any) => Math.abs(cj.days_difference) <= 5);
    if (nearbyJobs.length > 0) {
      suggestions.push({
        type: "consolidation_opportunity",
        message: `${nearbyJobs.length} other ${job.customer} job(s) due within 5 days`,
        recommendation: `Consider aligning with ${nearbyJobs[0].job_number} (due ${nearbyJobs[0].due_date})`,
        nearby_jobs: nearbyJobs,
      });
    }

    // Target date feasibility
    if (targetDt) {
      const daysDiff = Math.ceil((targetDt.getTime() - currentDue.getTime()) / (1000 * 60 * 60 * 24));
      const remainingOps = operations?.length || 0;
      const totalEstTime = operations?.reduce((sum: number, o: any) => sum + (o.estimated_time || 0), 0) || 0;

      suggestions.push({
        type: "target_date_analysis",
        current_due: job.due_date,
        target_date: target_date,
        days_change: daysDiff,
        remaining_operations: remainingOps,
        estimated_hours_remaining: totalEstTime,
        feasibility: daysDiff > 0 ? "likely_feasible" : totalEstTime < Math.abs(daysDiff) * 8 ? "challenging" : "unlikely",
      });
    }

    return structuredResponse(
      {
        job: {
          id: job.id,
          job_number: job.job_number,
          customer: job.customer,
          current_due_date: job.due_date,
          status: job.status,
        },
        remaining_operations: operations?.length || 0,
        capacity_analysis: capacityAnalysis,
        consolidation_options: consolidationOptions,
        suggestions,
      },
      `Reschedule analysis for job ${job.job_number}`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

// ============================================================================
// Module Export
// ============================================================================

const handlers = new Map<string, ToolHandler>([
  ["batch_update_parts", batchUpdateParts],
  ["batch_reschedule_operations", batchRescheduleOperations],
  ["prioritize_job", prioritizeJob],
  ["fetch_parts_by_customer", fetchPartsByCustomer],
  ["batch_complete_operations", batchCompleteOperations],
  ["get_job_overview", getJobOverview],
  ["check_resource_availability", checkResourceAvailability],
  ["assign_resource_to_operations", assignResourceToOperations],
  ["get_cell_capacity", getCellCapacity],
  ["get_parts_due_soon", getPartsDueSoon],
  ["suggest_reschedule", suggestReschedule],
]);

export const agentBatchModule: ToolModule = {
  tools,
  handlers,
};
