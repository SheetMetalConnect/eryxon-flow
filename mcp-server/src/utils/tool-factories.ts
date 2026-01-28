/**
 * Tool factory functions to eliminate code duplication
 * Creates standardized tool handlers for common CRUD operations
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolHandler, ToolResult } from "../types/index.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { validateArgs } from "./validation.js";
import { paginatedResponse, structuredResponse, errorResponse } from "./response.js";
import { databaseError, notFoundError, invalidStateTransition } from "./errors.js";
import { schemas } from "./validation.js";

interface FetchToolConfig {
  tableName: string;
  description: string;
  filterFields?: Record<string, z.ZodType>;
  selectFields?: string;
  orderBy?: { column: string; ascending?: boolean };
  includeDeleted?: boolean;
}

interface UpdateToolConfig {
  tableName: string;
  description: string;
  updateSchema: z.ZodType;
  resourceName: string;
}

interface StatusTransitionConfig {
  tableName: string;
  description: string;
  newStatus: string;
  timestampField?: string;
  additionalFields?: Record<string, any>;
  validTransitions?: Record<string, string[]>; // currentStatus -> allowedNextStates
}

/**
 * Create a fetch tool with pagination and filters
 */
export function createFetchTool(config: FetchToolConfig): { tool: Tool; handler: ToolHandler } {
  const schema = z.object({
    limit: schemas.limit,
    offset: schemas.offset,
    ...config.filterFields,
  });

  const tool: Tool = {
    name: `fetch_${config.tableName}`,
    description: config.description,
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum number of records to return (1-1000, default: 50)" },
        offset: { type: "number", description: "Number of records to skip (default: 0)" },
        ...Object.keys(config.filterFields || {}).reduce((acc, key) => {
          acc[key] = { type: "string", description: `Filter by ${key}` };
          return acc;
        }, {} as Record<string, any>),
      },
    },
  };

  const handler: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient): Promise<ToolResult> => {
    try {
      const validated = validateArgs(args, schema);
      const { limit, offset, ...filters } = validated;

      // Build query
      let query = supabase
        .from(config.tableName)
        .select(config.selectFields || '*', { count: 'exact' });

      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) {
          query = query.eq(key, value);
        }
      }

      // Filter out soft-deleted
      if (!config.includeDeleted) {
        query = query.is('deleted_at', null);
      }

      // Apply ordering
      if (config.orderBy) {
        query = query.order(config.orderBy.column, { ascending: config.orderBy.ascending ?? false });
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw databaseError(`Failed to fetch ${config.tableName}`, error as Error);
      }

      const total = count || 0;
      const hasMore = offset + limit < total;

      return paginatedResponse(data || [], {
        offset,
        limit,
        total,
        has_more: hasMore,
      });
    } catch (error) {
      return errorResponse(error);
    }
  };

  return { tool, handler };
}

/**
 * Create an update tool
 */
export function createUpdateTool(config: UpdateToolConfig): { tool: Tool; handler: ToolHandler } {
  const tool: Tool = {
    name: `update_${config.tableName.replace(/s$/, '')}`,
    description: config.description,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID of the record to update" },
        // Schema properties would be dynamically generated
      },
      required: ["id"],
    },
  };

  const handler: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient): Promise<ToolResult> => {
    try {
      const validated = validateArgs(args, config.updateSchema);
      const { id, ...updates } = validated as any;

      const { data, error } = await supabase
        .from(config.tableName)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw notFoundError(config.resourceName, id);
        }
        throw databaseError(`Failed to update ${config.resourceName}`, error as Error);
      }

      return structuredResponse(data, `${config.resourceName} updated successfully`);
    } catch (error) {
      return errorResponse(error);
    }
  };

  return { tool, handler };
}

/**
 * Create a status transition tool
 */
export function createStatusTransitionTool(config: StatusTransitionConfig): { tool: Tool; handler: ToolHandler } {
  const actionName = config.newStatus.replace(/_/g, ' ');

  const tool: Tool = {
    name: `${config.newStatus}_${config.tableName.replace(/s$/, '')}`,
    description: config.description,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID of the record" },
      },
      required: ["id"],
    },
  };

  const handler: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient): Promise<ToolResult> => {
    try {
      const { id } = validateArgs(args, z.object({ id: schemas.id }));

      // Validate state transition if configured
      if (config.validTransitions) {
        const { data: current } = await supabase
          .from(config.tableName)
          .select('status')
          .eq('id', id)
          .single();

        if (current) {
          const allowedStates = config.validTransitions[current.status] || [];
          if (!allowedStates.includes(config.newStatus)) {
            throw invalidStateTransition(config.tableName, current.status, config.newStatus);
          }
        }
      }

      const updates: Record<string, any> = {
        status: config.newStatus,
        updated_at: new Date().toISOString(),
        ...config.additionalFields,
      };

      if (config.timestampField) {
        updates[config.timestampField] = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from(config.tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw notFoundError(config.tableName, id);
        }
        throw databaseError(`Failed to ${actionName}`, error as Error);
      }

      return structuredResponse(data, `${config.tableName} ${actionName} successfully`);
    } catch (error) {
      return errorResponse(error);
    }
  };

  return { tool, handler };
}

/**
 * Create a simple create tool
 */
export function createCreateTool(
  tableName: string,
  description: string,
  schema: z.ZodType
): { tool: Tool; handler: ToolHandler } {
  const tool: Tool = {
    name: `create_${tableName.replace(/s$/, '')}`,
    description,
    inputSchema: {
      type: "object",
      properties: {}, // Would be dynamically generated from schema
    },
  };

  const handler: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient): Promise<ToolResult> => {
    try {
      const validated = validateArgs(args, schema);

      const { data, error } = await supabase
        .from(tableName)
        .insert(validated)
        .select()
        .single();

      if (error) {
        throw databaseError(`Failed to create ${tableName}`, error as Error);
      }

      return structuredResponse(data, `${tableName} created successfully`);
    } catch (error) {
      return errorResponse(error);
    }
  };

  return { tool, handler };
}
