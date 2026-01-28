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

  // Get Shipping Status Tool
  {
    name: "get_shipping_status",
    description:
      "Get shipping status for jobs. Shows which jobs are ready to ship, scheduled, or in transit.",
    inputSchema: {
      type: "object",
      properties: {
        customer: {
          type: "string",
          description: "Filter by customer name",
        },
        status: {
          type: "string",
          enum: ["draft", "planned", "loading", "in_transit", "delivered", "cancelled"],
          description: "Filter by shipment status",
        },
        job_id: {
          type: "string",
          description: "Get shipping for specific job",
        },
        job_number: {
          type: "string",
          description: "Get shipping for specific job number",
        },
        scheduled_date: {
          type: "string",
          description: "Filter by scheduled date (YYYY-MM-DD)",
        },
        include_jobs: {
          type: "boolean",
          description: "Include job details in shipments (default: true)",
        },
        limit: {
          type: "number",
          description: "Maximum shipments to return (default: 50)",
        },
      },
    },
  },

  // Create or Update Shipment Tool
  {
    name: "manage_shipment",
    description:
      "Create a new shipment or update an existing one. Add/remove jobs from shipments.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "update", "add_jobs", "remove_jobs", "update_status"],
          description: "Action to perform",
        },
        shipment_id: {
          type: "string",
          description: "Shipment ID (required for update actions)",
        },
        shipment: {
          type: "object",
          description: "Shipment data (for create/update)",
          properties: {
            name: { type: "string", description: "Shipment name" },
            scheduled_date: { type: "string", description: "Scheduled date (YYYY-MM-DD)" },
            scheduled_time: { type: "string", description: "Scheduled time (HH:MM)" },
            destination_name: { type: "string" },
            destination_address: { type: "string" },
            destination_city: { type: "string" },
            destination_country: { type: "string" },
            driver_name: { type: "string" },
            driver_phone: { type: "string" },
            vehicle_type: {
              type: "string",
              enum: ["truck", "van", "car", "bike", "freight", "air", "sea", "rail", "other"],
            },
            notes: { type: "string" },
          },
        },
        job_ids: {
          type: "array",
          items: { type: "string" },
          description: "Job IDs to add/remove",
        },
        job_numbers: {
          type: "array",
          items: { type: "string" },
          description: "Job numbers to add/remove (alternative to job_ids)",
        },
        new_status: {
          type: "string",
          enum: ["draft", "planned", "loading", "in_transit", "delivered", "cancelled"],
          description: "New status (for update_status action)",
        },
      },
      required: ["action"],
    },
  },

  // Get Jobs Ready for Shipping Tool
  {
    name: "get_jobs_ready_for_shipping",
    description:
      "Find completed jobs that are ready to be shipped. Useful for shipping planning.",
    inputSchema: {
      type: "object",
      properties: {
        customer: {
          type: "string",
          description: "Filter by customer name",
        },
        exclude_scheduled: {
          type: "boolean",
          description: "Exclude jobs already in a shipment (default: true)",
        },
        due_before: {
          type: "string",
          description: "Only jobs with due date before this (YYYY-MM-DD)",
        },
        include_partial: {
          type: "boolean",
          description: "Include jobs with partial completion (default: false)",
        },
        min_completion_percentage: {
          type: "number",
          description: "Minimum job completion % to include (default: 100)",
        },
        limit: {
          type: "number",
          description: "Maximum jobs to return (default: 50)",
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

  // Shipping Planner Tool
  {
    name: "plan_shipping",
    description:
      "Plan shipping by finding parts due soon, consolidation opportunities by customer, and suggest reschedules. Essential for shipping planners.",
    inputSchema: {
      type: "object",
      properties: {
        due_within_days: {
          type: "number",
          description: "Find parts/jobs due within this many days (default: 7)",
        },
        customer: {
          type: "string",
          description: "Focus on specific customer",
        },
        group_by_customer: {
          type: "boolean",
          description: "Group results by customer for consolidation (default: true)",
        },
        include_near_complete: {
          type: "boolean",
          description: "Include jobs >80% complete that could be expedited (default: true)",
        },
        min_completion_for_expedite: {
          type: "number",
          description: "Minimum completion % to consider for expediting (default: 80)",
        },
        show_consolidation_opportunities: {
          type: "boolean",
          description: "Show which jobs could ship together (default: true)",
        },
      },
    },
  },

  // Find Consolidation Opportunities Tool
  {
    name: "find_shipping_consolidation",
    description:
      "Find jobs that could be consolidated into the same shipment. Groups by customer, destination, and timing.",
    inputSchema: {
      type: "object",
      properties: {
        customer: {
          type: "string",
          description: "Focus on specific customer",
        },
        destination_city: {
          type: "string",
          description: "Filter by destination city",
        },
        date_range: {
          type: "object",
          description: "Due date range to consider",
          properties: {
            start: { type: "string", description: "Start date (YYYY-MM-DD)" },
            end: { type: "string", description: "End date (YYYY-MM-DD)" },
          },
        },
        include_in_progress: {
          type: "boolean",
          description: "Include in-progress jobs that might complete soon (default: true)",
        },
        max_days_spread: {
          type: "number",
          description: "Max days between due dates to consider consolidatable (default: 5)",
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
    const { scope, updates, filter } = args as {
      scope: {
        customer?: string;
        job_id?: string;
        job_number?: string;
        part_ids?: string[];
      };
      updates: {
        is_bullet_card?: boolean;
        status?: string;
        notes?: string;
        current_cell_id?: string;
      };
      filter?: {
        status?: string;
        exclude_completed?: boolean;
      };
    };

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
    const { scope, schedule, filter } = args as {
      scope: {
        job_id?: string;
        job_number?: string;
        part_id?: string;
        cell_id?: string;
        customer?: string;
        operation_ids?: string[];
      };
      schedule: {
        planned_start?: string;
        planned_end?: string;
        shift_days?: number;
        shift_hours?: number;
      };
      filter?: {
        status?: string;
        exclude_completed?: boolean;
        exclude_in_progress?: boolean;
      };
    };

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

        await supabase.from("operations").update(opUpdate).eq("id", op.id);
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
    const { job_id, job_number, set_bullet_card, priority, notes } = args as {
      job_id?: string;
      job_number?: string;
      set_bullet_card?: boolean;
      priority?: string;
      notes?: string;
    };

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
        const { data: currentJob } = await supabase
          .from("jobs")
          .select("notes")
          .eq("id", job.id)
          .single();
        jobUpdate.notes = currentJob?.notes
          ? `${currentJob.notes}\n[PRIORITY] ${notes}`
          : `[PRIORITY] ${notes}`;
      }

      await supabase.from("jobs").update(jobUpdate).eq("id", job.id);
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
    const { customer, status, include_completed, limit } = args as {
      customer: string;
      status?: string;
      include_completed?: boolean;
      limit?: number;
    };

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
    const { scope, completion_percentage, notes } = args as {
      scope: {
        job_id?: string;
        part_id?: string;
        cell_id?: string;
        operation_ids?: string[];
      };
      completion_percentage?: number;
      notes?: string;
    };

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
    const { job_id, job_number, include_operations, include_issues } = args as {
      job_id?: string;
      job_number?: string;
      include_operations?: boolean;
      include_issues?: boolean;
    };

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
            pending: issues.filter((i: any) => i.status === "pending").length,
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
    const { resource_type, location, status, only_available, include_usage } = args as {
      resource_type?: string;
      location?: string;
      status?: string;
      only_available?: boolean;
      include_usage?: boolean;
    };

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
    const { resource_id, resource_name, operation_ids, scope, quantity, notes } = args as {
      resource_id?: string;
      resource_name?: string;
      operation_ids?: string[];
      scope?: {
        job_id?: string;
        job_number?: string;
        part_id?: string;
        cell_id?: string;
      };
      quantity?: number;
      notes?: string;
    };

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
 * Get Shipping Status Handler
 */
const getShippingStatus: ToolHandler = async (args, supabase) => {
  try {
    const { customer, status, job_id, job_number, scheduled_date, include_jobs, limit } = args as {
      customer?: string;
      status?: string;
      job_id?: string;
      job_number?: string;
      scheduled_date?: string;
      include_jobs?: boolean;
      limit?: number;
    };

    const shouldIncludeJobs = include_jobs ?? true;

    let query = supabase
      .from("shipments")
      .select(shouldIncludeJobs ? `
        *,
        shipment_jobs (
          job_id,
          jobs (
            id,
            job_number,
            customer,
            status
          )
        )
      ` : "*")
      .order("scheduled_date", { ascending: true })
      .limit(limit || 50);

    if (status) {
      query = query.eq("status", status);
    }
    if (scheduled_date) {
      query = query.eq("scheduled_date", scheduled_date);
    }

    // For job-specific queries, we need to filter differently
    if (job_id || job_number) {
      // First find shipments containing this job
      let jobQuery = supabase.from("shipment_jobs").select("shipment_id, jobs!inner(id, job_number)");
      if (job_id) {
        jobQuery = jobQuery.eq("job_id", job_id);
      } else if (job_number) {
        jobQuery = jobQuery.eq("jobs.job_number", job_number);
      }

      const { data: shipmentJobs } = await jobQuery;
      if (shipmentJobs && shipmentJobs.length > 0) {
        const shipmentIds = [...new Set(shipmentJobs.map((sj: any) => sj.shipment_id))];
        query = query.in("id", shipmentIds);
      } else {
        return structuredResponse({ total: 0, shipments: [] }, "No shipments found for this job");
      }
    }

    if (customer) {
      // Filter by customer in shipment_jobs
      const { data: customerJobs } = await supabase
        .from("shipment_jobs")
        .select("shipment_id, jobs!inner(customer)")
        .ilike("jobs.customer", `%${customer}%`);

      if (customerJobs && customerJobs.length > 0) {
        const shipmentIds = [...new Set(customerJobs.map((sj: any) => sj.shipment_id))];
        query = query.in("id", shipmentIds);
      }
    }

    const { data: shipments, error } = await query;
    if (error) throw error;

    // Summary by status
    // Note: Cast to any[] due to complex nested select causing type parser issues
    const byStatus = new Map<string, number>();
    for (const s of (shipments || []) as any[]) {
      byStatus.set(s.status, (byStatus.get(s.status) || 0) + 1);
    }

    return structuredResponse(
      {
        total: (shipments as any[])?.length || 0,
        by_status: Object.fromEntries(byStatus),
        shipments: (shipments || []) as any[],
      },
      `Found ${(shipments as any[])?.length || 0} shipments`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Manage Shipment Handler
 */
const manageShipment: ToolHandler = async (args, supabase) => {
  try {
    const { action, shipment_id, shipment, job_ids, job_numbers, new_status } = args as {
      action: string;
      shipment_id?: string;
      shipment?: any;
      job_ids?: string[];
      job_numbers?: string[];
      new_status?: string;
    };

    const now = new Date().toISOString();

    // Resolve job_numbers to job_ids if needed
    let resolvedJobIds = job_ids || [];
    if (job_numbers && job_numbers.length > 0) {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id")
        .in("job_number", job_numbers)
        .is("deleted_at", null);
      if (jobs) {
        resolvedJobIds = [...resolvedJobIds, ...jobs.map((j: any) => j.id)];
      }
    }

    switch (action) {
      case "create": {
        // Generate shipment number
        const { data: shipmentNumber } = await supabase.rpc("generate_shipment_number", {});

        const { data: created, error } = await supabase
          .from("shipments")
          .insert({
            shipment_number: shipmentNumber || `SHP-${Date.now()}`,
            name: shipment?.name,
            scheduled_date: shipment?.scheduled_date,
            scheduled_time: shipment?.scheduled_time,
            destination_name: shipment?.destination_name,
            destination_address: shipment?.destination_address,
            destination_city: shipment?.destination_city,
            destination_country: shipment?.destination_country,
            driver_name: shipment?.driver_name,
            driver_phone: shipment?.driver_phone,
            vehicle_type: shipment?.vehicle_type,
            notes: shipment?.notes,
            status: "draft",
          })
          .select()
          .single();

        if (error) throw error;

        // Add jobs if specified
        if (resolvedJobIds.length > 0) {
          await supabase.from("shipment_jobs").insert(
            resolvedJobIds.map((jid) => ({
              shipment_id: created.id,
              job_id: jid,
            })),
          );
        }

        return structuredResponse(
          { action: "created", shipment: created, jobs_added: resolvedJobIds.length },
          `Created shipment ${created.shipment_number}`,
        );
      }

      case "update": {
        if (!shipment_id) return errorResponse(new Error("shipment_id required for update"));

        const { data: updated, error } = await supabase
          .from("shipments")
          .update({
            ...shipment,
            updated_at: now,
          })
          .eq("id", shipment_id)
          .select()
          .single();

        if (error) throw error;
        return structuredResponse({ action: "updated", shipment: updated }, "Shipment updated");
      }

      case "add_jobs": {
        if (!shipment_id) return errorResponse(new Error("shipment_id required"));
        if (resolvedJobIds.length === 0) return errorResponse(new Error("No jobs specified"));

        await supabase.from("shipment_jobs").upsert(
          resolvedJobIds.map((jid) => ({
            shipment_id,
            job_id: jid,
          })),
          { onConflict: "shipment_id,job_id" },
        );

        return structuredResponse({ action: "add_jobs", shipment_id, jobs_added: resolvedJobIds.length }, `Added ${resolvedJobIds.length} jobs to shipment`);
      }

      case "remove_jobs": {
        if (!shipment_id) return errorResponse(new Error("shipment_id required"));
        if (resolvedJobIds.length === 0) return errorResponse(new Error("No jobs specified"));

        await supabase.from("shipment_jobs").delete().eq("shipment_id", shipment_id).in("job_id", resolvedJobIds);

        return structuredResponse({ action: "remove_jobs", shipment_id, jobs_removed: resolvedJobIds.length }, `Removed ${resolvedJobIds.length} jobs from shipment`);
      }

      case "update_status": {
        if (!shipment_id) return errorResponse(new Error("shipment_id required"));
        if (!new_status) return errorResponse(new Error("new_status required"));

        const statusUpdate: any = { status: new_status, updated_at: now };
        if (new_status === "in_transit") statusUpdate.actual_departure = now;
        if (new_status === "delivered") statusUpdate.actual_arrival = now;

        const { data: updated, error } = await supabase.from("shipments").update(statusUpdate).eq("id", shipment_id).select().single();

        if (error) throw error;
        return structuredResponse({ action: "update_status", shipment: updated }, `Shipment status updated to ${new_status}`);
      }

      default:
        return errorResponse(new Error(`Unknown action: ${action}`));
    }
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Get Jobs Ready for Shipping Handler
 */
const getJobsReadyForShipping: ToolHandler = async (args, supabase) => {
  try {
    const { customer, exclude_scheduled, due_before, include_partial, min_completion_percentage, limit } = args as {
      customer?: string;
      exclude_scheduled?: boolean;
      due_before?: string;
      include_partial?: boolean;
      min_completion_percentage?: number;
      limit?: number;
    };

    // Get completed jobs
    let query = supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        customer,
        due_date,
        status,
        total_weight_kg,
        total_volume_m3,
        package_count,
        delivery_address,
        delivery_city,
        parts (
          id,
          status
        )
      `)
      .is("deleted_at", null)
      .order("due_date")
      .limit(limit || 50);

    if (!include_partial) {
      query = query.eq("status", "completed");
    }
    if (customer) {
      query = query.ilike("customer", `%${customer}%`);
    }
    if (due_before) {
      query = query.lte("due_date", due_before);
    }

    const { data: jobs, error } = await query;
    if (error) throw error;

    // Calculate completion percentage for each job
    let enrichedJobs = (jobs || []).map((job: any) => {
      const totalParts = job.parts?.length || 0;
      const completedParts = job.parts?.filter((p: any) => p.status === "completed").length || 0;
      const completion = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;
      return {
        id: job.id,
        job_number: job.job_number,
        customer: job.customer,
        due_date: job.due_date,
        status: job.status,
        completion_percentage: completion,
        total_parts: totalParts,
        completed_parts: completedParts,
        total_weight_kg: job.total_weight_kg,
        total_volume_m3: job.total_volume_m3,
        package_count: job.package_count,
        delivery_address: job.delivery_address,
        delivery_city: job.delivery_city,
      };
    });

    // Filter by completion percentage
    const minCompletion = min_completion_percentage ?? 100;
    enrichedJobs = enrichedJobs.filter((j: any) => j.completion_percentage >= minCompletion);

    // Exclude already scheduled if requested
    const shouldExcludeScheduled = exclude_scheduled ?? true;
    if (shouldExcludeScheduled && enrichedJobs.length > 0) {
      const { data: scheduled } = await supabase
        .from("shipment_jobs")
        .select("job_id, shipments!inner(status)")
        .in("job_id", enrichedJobs.map((j: any) => j.id))
        .neq("shipments.status", "cancelled");

      if (scheduled) {
        const scheduledIds = new Set(scheduled.map((s: any) => s.job_id));
        enrichedJobs = enrichedJobs.filter((j: any) => !scheduledIds.has(j.id));
      }
    }

    return structuredResponse(
      {
        total: enrichedJobs.length,
        jobs: enrichedJobs,
      },
      `Found ${enrichedJobs.length} jobs ready for shipping`,
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
    const { cell_id, cell_name, include_all, date_range } = args as {
      cell_id?: string;
      cell_name?: string;
      include_all?: boolean;
      date_range?: { start?: string; end?: string };
    };

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
 * Plan Shipping Handler
 * Find parts due soon, consolidation opportunities, and suggest actions
 */
const planShipping: ToolHandler = async (args, supabase) => {
  try {
    const {
      due_within_days,
      customer,
      group_by_customer,
      include_near_complete,
      min_completion_for_expedite,
      show_consolidation_opportunities,
    } = args as {
      due_within_days?: number;
      customer?: string;
      group_by_customer?: boolean;
      include_near_complete?: boolean;
      min_completion_for_expedite?: number;
      show_consolidation_opportunities?: boolean;
    };

    const days = due_within_days ?? 7;
    const minCompletion = min_completion_for_expedite ?? 80;
    const shouldGroupByCustomer = group_by_customer ?? true;
    const shouldIncludeNearComplete = include_near_complete ?? true;
    const shouldShowConsolidation = show_consolidation_opportunities ?? true;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    // Fetch jobs with parts and due dates
    let query = supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        customer,
        due_date,
        status,
        delivery_city,
        delivery_address,
        parts (
          id,
          part_number,
          status
        )
      `)
      .is("deleted_at", null)
      .lte("due_date", cutoffStr)
      .order("due_date");

    if (customer) {
      query = query.ilike("customer", `%${customer}%`);
    }

    const { data: jobs, error } = await query;
    if (error) throw error;

    // Enrich with completion data
    const enrichedJobs = (jobs || []).map((job: any) => {
      const totalParts = job.parts?.length || 0;
      const completedParts = job.parts?.filter((p: any) => p.status === "completed").length || 0;
      const completion = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;
      return {
        id: job.id,
        job_number: job.job_number,
        customer: job.customer,
        due_date: job.due_date,
        status: job.status,
        delivery_city: job.delivery_city,
        completion_percentage: completion,
        total_parts: totalParts,
        completed_parts: completedParts,
        ready_to_ship: completion === 100,
        can_expedite: shouldIncludeNearComplete && completion >= minCompletion && completion < 100,
      };
    });

    // Separate into categories
    const readyToShip = enrichedJobs.filter((j: any) => j.ready_to_ship);
    const canExpedite = enrichedJobs.filter((j: any) => j.can_expedite);
    const notReady = enrichedJobs.filter((j: any) => !j.ready_to_ship && !j.can_expedite);

    // Group by customer for consolidation
    let consolidationGroups: any[] = [];
    if (shouldShowConsolidation && shouldGroupByCustomer) {
      const customerMap = new Map<string, any[]>();
      for (const job of [...readyToShip, ...canExpedite]) {
        const key = job.customer?.toLowerCase() || "unknown";
        const existing = customerMap.get(key) || [];
        existing.push(job);
        customerMap.set(key, existing);
      }

      consolidationGroups = Array.from(customerMap.entries())
        .filter(([_, jobs]) => jobs.length > 1)
        .map(([customerName, customerJobs]) => ({
          customer: customerName,
          jobs_count: customerJobs.length,
          all_ready: customerJobs.every((j: any) => j.ready_to_ship),
          jobs: customerJobs.map((j: any) => ({
            job_number: j.job_number,
            due_date: j.due_date,
            completion: j.completion_percentage,
            ready: j.ready_to_ship,
          })),
          recommendation: customerJobs.every((j: any) => j.ready_to_ship)
            ? "Ship together now"
            : `Wait for ${customerJobs.filter((j: any) => !j.ready_to_ship).length} job(s) to complete for consolidation`,
        }));
    }

    return structuredResponse(
      {
        summary: {
          due_within_days: days,
          total_jobs: enrichedJobs.length,
          ready_to_ship: readyToShip.length,
          can_expedite: canExpedite.length,
          not_ready: notReady.length,
          consolidation_opportunities: consolidationGroups.length,
        },
        ready_to_ship: readyToShip,
        can_expedite: canExpedite,
        not_ready: notReady,
        consolidation_opportunities: consolidationGroups,
      },
      `Found ${readyToShip.length} ready, ${canExpedite.length} can expedite, ${consolidationGroups.length} consolidation opportunities`,
    );
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Find Shipping Consolidation Handler
 * Group jobs that could ship together by customer/destination
 */
const findShippingConsolidation: ToolHandler = async (args, supabase) => {
  try {
    const { customer, destination_city, date_range, include_in_progress, max_days_spread } = args as {
      customer?: string;
      destination_city?: string;
      date_range?: { start?: string; end?: string };
      include_in_progress?: boolean;
      max_days_spread?: number;
    };

    const shouldIncludeInProgress = include_in_progress ?? true;
    const maxSpread = max_days_spread ?? 5;

    // Build query
    let query = supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        customer,
        due_date,
        status,
        delivery_city,
        delivery_address,
        total_weight_kg,
        parts (id, status)
      `)
      .is("deleted_at", null)
      .order("customer")
      .order("due_date");

    if (customer) {
      query = query.ilike("customer", `%${customer}%`);
    }
    if (destination_city) {
      query = query.ilike("delivery_city", `%${destination_city}%`);
    }
    if (date_range?.start) {
      query = query.gte("due_date", date_range.start);
    }
    if (date_range?.end) {
      query = query.lte("due_date", date_range.end);
    }

    const { data: jobs, error } = await query;
    if (error) throw error;

    // Enrich with completion
    const enrichedJobs = (jobs || []).map((job: any) => {
      const totalParts = job.parts?.length || 0;
      const completedParts = job.parts?.filter((p: any) => p.status === "completed").length || 0;
      const completion = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;
      return {
        id: job.id,
        job_number: job.job_number,
        customer: job.customer,
        due_date: job.due_date,
        delivery_city: job.delivery_city,
        status: job.status,
        completion_percentage: completion,
        total_weight_kg: job.total_weight_kg,
        is_ready: completion === 100,
        is_in_progress: job.status === "in_progress" && completion < 100,
      };
    });

    // Filter based on status
    const eligibleJobs = enrichedJobs.filter((j: any) => {
      if (j.is_ready) return true;
      if (shouldIncludeInProgress && j.is_in_progress) return true;
      return false;
    });

    // Group by customer + city
    const groups = new Map<string, any[]>();
    for (const job of eligibleJobs) {
      const key = `${(job.customer || "").toLowerCase()}|${(job.delivery_city || "").toLowerCase()}`;
      const existing = groups.get(key) || [];
      existing.push(job);
      groups.set(key, existing);
    }

    // Build consolidation recommendations
    const consolidations = Array.from(groups.entries())
      .filter(([_, groupJobs]) => groupJobs.length > 1)
      .map(([key, groupJobs]) => {
        const [customerKey, cityKey] = key.split("|");
        const dueDates = groupJobs.map((j: any) => new Date(j.due_date).getTime());
        const minDate = new Date(Math.min(...dueDates));
        const maxDate = new Date(Math.max(...dueDates));
        const daySpread = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

        const allReady = groupJobs.every((j: any) => j.is_ready);
        const totalWeight = groupJobs.reduce((sum: number, j: any) => sum + (j.total_weight_kg || 0), 0);

        return {
          customer: groupJobs[0].customer,
          delivery_city: groupJobs[0].delivery_city || "Unknown",
          jobs_count: groupJobs.length,
          date_range: {
            earliest: minDate.toISOString().split("T")[0],
            latest: maxDate.toISOString().split("T")[0],
            days_spread: daySpread,
          },
          all_ready: allReady,
          ready_count: groupJobs.filter((j: any) => j.is_ready).length,
          total_weight_kg: totalWeight,
          consolidatable: daySpread <= maxSpread,
          jobs: groupJobs.map((j: any) => ({
            job_number: j.job_number,
            due_date: j.due_date,
            completion: j.completion_percentage,
            ready: j.is_ready,
          })),
          recommendation: allReady
            ? `Ship all ${groupJobs.length} jobs together to ${groupJobs[0].delivery_city || "destination"}`
            : daySpread <= maxSpread
              ? `Wait for ${groupJobs.filter((j: any) => !j.is_ready).length} job(s) to complete - within ${maxSpread}-day window`
              : `Date spread too wide (${daySpread} days) - consider shipping in batches`,
        };
      })
      .sort((a, b) => b.jobs_count - a.jobs_count);

    return structuredResponse(
      {
        total_eligible_jobs: eligibleJobs.length,
        consolidation_groups: consolidations.length,
        groups: consolidations,
        single_job_shipments: eligibleJobs.length - consolidations.reduce((sum, g) => sum + g.jobs_count, 0),
      },
      `Found ${consolidations.length} consolidation opportunities across ${eligibleJobs.length} jobs`,
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
    const { due_within_days, customer, include_blocking_ops, status_filter, sort_by, limit } = args as {
      due_within_days?: number;
      customer?: string;
      include_blocking_ops?: boolean;
      status_filter?: string[];
      sort_by?: string;
      limit?: number;
    };

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
      const pendingOps = ops.filter((o: any) => o.status === "not_started" || o.status === "pending");

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
    const { job_id, job_number, part_id, target_date, consider_capacity, consolidate_with_customer } = args as {
      job_id?: string;
      job_number?: string;
      part_id?: string;
      target_date?: string;
      consider_capacity?: boolean;
      consolidate_with_customer?: boolean;
    };

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
  ["get_shipping_status", getShippingStatus],
  ["manage_shipment", manageShipment],
  ["get_jobs_ready_for_shipping", getJobsReadyForShipping],
  ["get_cell_capacity", getCellCapacity],
  ["plan_shipping", planShipping],
  ["find_shipping_consolidation", findShippingConsolidation],
  ["get_parts_due_soon", getPartsDueSoon],
  ["suggest_reschedule", suggestReschedule],
]);

export const agentBatchModule: ToolModule = {
  tools,
  handlers,
};
