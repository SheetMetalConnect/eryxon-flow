/**
 * Validation utilities using Zod
 * Provides runtime type checking for tool inputs
 */

import { z } from 'zod';

// Common validation schemas
export const schemas = {
  id: z.string().uuid('Invalid UUID format'),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),

  // Status enums
  jobStatus: z.enum(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled']),
  operationStatus: z.enum(['not_started', 'in_progress', 'paused', 'completed', 'cancelled']),
  issueStatus: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  issueSeverity: z.enum(['low', 'medium', 'high', 'critical']),
  batchStatus: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked']),

  // Common filters
  dateRange: z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
  }).optional(),

  // Pagination
  pagination: z.object({
    limit: z.number().int().min(1).max(1000).default(50),
    offset: z.number().int().min(0).default(0),
  }),
};

/**
 * Validate tool arguments against a schema
 * Throws if validation fails with detailed error message
 */
export function validateArgs<T>(
  args: unknown,
  schema: z.ZodType<T>
): T {
  try {
    return schema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Validation failed: ${messages.join(', ')}`);
    }
    throw error;
  }
}

/**
 * Safe validation that returns result with success flag
 */
export function safeValidateArgs<T>(
  args: unknown,
  schema: z.ZodType<T>
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(args);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const messages = result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
  return { success: false, error: messages.join(', ') };
}

// Tool-specific schemas
export const toolSchemas = {
  fetchJobs: z.object({
    status: schemas.jobStatus.optional(),
    customer: z.string().optional(),
    limit: schemas.limit,
    offset: schemas.offset,
  }),

  createJob: z.object({
    job_number: z.string().min(1, 'Job number required'),
    customer: z.string().min(1, 'Customer required'),
    description: z.string().optional(),
    due_date: z.string().datetime().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  }),

  updateJob: z.object({
    id: schemas.id,
    status: schemas.jobStatus.optional(),
    description: z.string().optional(),
    due_date: z.string().datetime().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  }),

  fetchOperations: z.object({
    status: schemas.operationStatus.optional(),
    job_id: schemas.id.optional(),
    cell_id: schemas.id.optional(),
    limit: schemas.limit,
    offset: schemas.offset,
  }),

  updateOperation: z.object({
    id: schemas.id,
    status: schemas.operationStatus.optional(),
    quantity_completed: z.number().int().min(0).optional(),
    quantity_scrap: z.number().int().min(0).optional(),
  }),

  fetchIssues: z.object({
    status: schemas.issueStatus.optional(),
    severity: schemas.issueSeverity.optional(),
    operation_id: schemas.id.optional(),
    limit: schemas.limit,
    offset: schemas.offset,
  }),

  createNCR: z.object({
    operation_id: schemas.id,
    title: z.string().min(1, 'Title required'),
    description: z.string().optional(),
    severity: schemas.issueSeverity,
    ncr_category: z.enum(['material', 'process', 'equipment', 'design', 'supplier', 'documentation', 'other']),
    affected_quantity: z.number().int().min(0).optional(),
    disposition: z.enum(['use_as_is', 'rework', 'repair', 'scrap', 'return_to_supplier']).optional(),
    root_cause: z.string().optional(),
    corrective_action: z.string().optional(),
    preventive_action: z.string().optional(),
  }),

  reportScrap: z.object({
    operation_id: schemas.id,
    quantity_scrap: z.number().int().min(1, 'Scrap quantity must be at least 1'),
    scrap_reason_id: schemas.id.optional(),
    notes: z.string().optional(),
  }),
};
