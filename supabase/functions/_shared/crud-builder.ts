/**
 * Generic CRUD Handler Builder
 *
 * Eliminates repetitive CRUD boilerplate by providing configurable handlers
 * for standard database operations. Handles pagination, filtering, validation,
 * soft deletes, and more.
 *
 * Usage:
 * ```ts
 * import { serveApi } from "../_shared/handler.ts";
 * import { createCrudHandler } from "../_shared/crud-builder.ts";
 *
 * export default serveApi(createCrudHandler({
 *   table: 'jobs',
 *   selectFields: '*, parts(id, part_number)',
 *   searchFields: ['job_number', 'customer'],
 *   allowedFilters: ['status', 'customer'],
 *   sortableFields: ['created_at', 'job_number'],
 *   validator: JobValidator,
 * }));
 * ```
 */

import type { HandlerContext } from "./handler.ts";
import {
  createSuccessResponse,
  NotFoundError,
  BadRequestError,
  ValidationException,
} from "./validation/errorHandler.ts";

export interface CrudConfig {
  /** Database table name */
  table: string;

  /** Fields to select (default: '*') */
  selectFields?: string;

  /** Fields that can be searched with text search (default: []) */
  searchFields?: string[];

  /** URL params that can be used as filters (default: []) */
  allowedFilters?: string[];

  /** Fields that can be used for sorting (default: ['created_at']) */
  sortableFields?: string[];

  /** Default sort field and direction (default: { field: 'created_at', direction: 'desc' }) */
  defaultSort?: { field: string; direction: 'asc' | 'desc' };

  /** Enable soft delete handling (checks for deleted_at IS NULL) (default: true) */
  softDelete?: boolean;

  /** Validator class for POST/PATCH validation (optional) */
  validator?: any;

  /** Custom handlers to override default behavior */
  customHandlers?: {
    get?: (req: Request, ctx: HandlerContext) => Promise<Response>;
    post?: (req: Request, ctx: HandlerContext) => Promise<Response>;
    patch?: (req: Request, ctx: HandlerContext) => Promise<Response>;
    delete?: (req: Request, ctx: HandlerContext) => Promise<Response>;
  };

  /** Custom query modifications for GET requests */
  queryModifier?: (query: any, ctx: HandlerContext) => any;

  /** Enable sync endpoints (PUT /sync, POST /bulk-sync) */
  enableSync?: boolean;

  /** External ID field for sync operations (default: 'external_id') */
  syncIdField?: string;
}

/**
 * Create a complete CRUD handler from configuration
 */
export function createCrudHandler(config: CrudConfig) {
  const {
    table,
    selectFields = '*',
    searchFields = [],
    allowedFilters = [],
    sortableFields = ['created_at'],
    defaultSort = { field: 'created_at', direction: 'desc' as const },
    softDelete = true,
    validator,
    customHandlers = {},
    queryModifier,
    enableSync = false,
    syncIdField = 'external_id',
  } = config;

  return async (req: Request, ctx: HandlerContext): Promise<Response> => {
    const { supabase, tenantId, url, lastSegment } = ctx;

    // Handle sync endpoints if enabled
    if (enableSync) {
      if (lastSegment === 'sync' && req.method === 'PUT') {
        return handleSync(req, ctx, table, syncIdField, validator);
      }
      if (lastSegment === 'bulk-sync' && req.method === 'POST') {
        return handleBulkSync(req, ctx, table, syncIdField, validator);
      }
    }

    // Route to appropriate handler
    switch (req.method) {
      case 'GET':
        if (customHandlers.get) {
          return customHandlers.get(req, ctx);
        }
        return handleGet(req, ctx, {
          table,
          selectFields,
          searchFields,
          allowedFilters,
          sortableFields,
          defaultSort,
          softDelete,
          queryModifier,
        });

      case 'POST':
        if (customHandlers.post) {
          return customHandlers.post(req, ctx);
        }
        return handlePost(req, ctx, table, validator, softDelete);

      case 'PATCH':
      case 'PUT':
        if (customHandlers.patch) {
          return customHandlers.patch(req, ctx);
        }
        return handlePatch(req, ctx, table, validator, softDelete);

      case 'DELETE':
        if (customHandlers.delete) {
          return customHandlers.delete(req, ctx);
        }
        return handleDelete(req, ctx, table, softDelete);

      default:
        throw new BadRequestError(`Method ${req.method} not allowed`);
    }
  };
}

/**
 * Handle GET requests - list or single item
 */
async function handleGet(
  req: Request,
  ctx: HandlerContext,
  config: {
    table: string;
    selectFields: string;
    searchFields: string[];
    allowedFilters: string[];
    sortableFields: string[];
    defaultSort: { field: string; direction: 'asc' | 'desc' };
    softDelete: boolean;
    queryModifier?: (query: any, ctx: HandlerContext) => any;
  }
): Promise<Response> {
  const { supabase, tenantId, url } = ctx;
  const {
    table,
    selectFields,
    searchFields,
    allowedFilters,
    sortableFields,
    defaultSort,
    softDelete,
    queryModifier,
  } = config;

  // Get single item by ID
  const id = url.searchParams.get('id');
  if (id) {
    let query = supabase
      .from(table)
      .select(selectFields)
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (softDelete) {
      query = query.is('deleted_at', null);
    }

    if (queryModifier) {
      query = queryModifier(query, ctx);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch ${table}: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundError(table, id);
    }

    return createSuccessResponse({ [table.replace(/s$/, '')]: data });
  }

  // List items with pagination and filters
  let query = supabase
    .from(table)
    .select(selectFields, { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (softDelete) {
    query = query.is('deleted_at', null);
  }

  // Apply filters
  for (const filter of allowedFilters) {
    const value = url.searchParams.get(filter);
    if (value !== null) {
      query = query.eq(filter, value);
    }
  }

  // Apply text search
  const search = url.searchParams.get('search');
  if (search && searchFields.length > 0) {
    const searchConditions = searchFields
      .map((field) => `${field}.ilike.%${search}%`)
      .join(',');
    query = query.or(searchConditions);
  }

  // Apply sorting
  const sortField = url.searchParams.get('sort') || defaultSort.field;
  const sortDirection = url.searchParams.get('order') as 'asc' | 'desc' || defaultSort.direction;

  if (sortableFields.includes(sortField)) {
    query = query.order(sortField, { ascending: sortDirection === 'asc' });
  } else {
    query = query.order(defaultSort.field, { ascending: defaultSort.direction === 'asc' });
  }

  // Apply custom query modifications
  if (queryModifier) {
    query = queryModifier(query, ctx);
  }

  // Pagination
  let limit = parseInt(url.searchParams.get('limit') || '100');
  if (limit < 1) limit = 1;
  if (limit > 1000) limit = 1000;

  const offset = parseInt(url.searchParams.get('offset') || '0');

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch ${table}: ${error.message}`);
  }

  return createSuccessResponse({
    [table]: data || [],
    pagination: {
      total: count || 0,
      offset,
      limit,
    },
  });
}

/**
 * Handle POST requests - create item
 */
async function handlePost(
  req: Request,
  ctx: HandlerContext,
  table: string,
  validator: any,
  softDelete: boolean
): Promise<Response> {
  const { supabase, tenantId } = ctx;

  const body = await req.json();

  // Validate if validator provided
  if (validator) {
    const validation = await validator.validate(body, { tenantId, supabase });
    if (!validation.isValid) {
      throw new ValidationException(validation.errors);
    }
  }

  // Add tenant_id
  const dataToInsert = {
    ...body,
    tenant_id: tenantId,
  };

  const { data, error } = await supabase
    .from(table)
    .insert(dataToInsert)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create ${table}: ${error.message}`);
  }

  return createSuccessResponse({ [table.replace(/s$/, '')]: data }, 201);
}

/**
 * Handle PATCH/PUT requests - update item
 */
async function handlePatch(
  req: Request,
  ctx: HandlerContext,
  table: string,
  validator: any,
  softDelete: boolean
): Promise<Response> {
  const { supabase, tenantId, url } = ctx;

  const id = url.searchParams.get('id');
  if (!id) {
    throw new BadRequestError('ID parameter is required for updates');
  }

  const body = await req.json();

  // Validate if validator provided
  if (validator) {
    const validation = await validator.validateUpdate(body, { tenantId, supabase, id });
    if (!validation.isValid) {
      throw new ValidationException(validation.errors);
    }
  }

  // Remove fields that shouldn't be updated
  const { tenant_id, id: bodyId, created_at, ...updateData } = body;

  let query = supabase
    .from(table)
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (softDelete) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query.select().single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError(table, id);
    }
    throw new Error(`Failed to update ${table}: ${error.message}`);
  }

  return createSuccessResponse({ [table.replace(/s$/, '')]: data });
}

/**
 * Handle DELETE requests - delete item (soft or hard)
 */
async function handleDelete(
  req: Request,
  ctx: HandlerContext,
  table: string,
  softDelete: boolean
): Promise<Response> {
  const { supabase, tenantId, url } = ctx;

  const id = url.searchParams.get('id');
  if (!id) {
    throw new BadRequestError('ID parameter is required for deletion');
  }

  if (softDelete) {
    // Soft delete - set deleted_at timestamp
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(table, id);
      }
      throw new Error(`Failed to delete ${table}: ${error.message}`);
    }
  } else {
    // Hard delete
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(table, id);
      }
      throw new Error(`Failed to delete ${table}: ${error.message}`);
    }
  }

  return createSuccessResponse({ message: 'Deleted successfully' });
}

/**
 * Handle sync endpoint - upsert by external_id
 */
async function handleSync(
  req: Request,
  ctx: HandlerContext,
  table: string,
  syncIdField: string,
  validator: any
): Promise<Response> {
  const { supabase, tenantId } = ctx;

  const body = await req.json();

  if (!body[syncIdField]) {
    throw new BadRequestError(`${syncIdField} is required for sync operations`);
  }

  // Validate if validator provided
  if (validator) {
    const validation = await validator.validate(body, { tenantId, supabase });
    if (!validation.isValid) {
      throw new ValidationException(validation.errors);
    }
  }

  // Check if record exists
  const { data: existing } = await supabase
    .from(table)
    .select('id')
    .eq(syncIdField, body[syncIdField])
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const dataToUpsert = {
    ...body,
    tenant_id: tenantId,
  };

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from(table)
      .update(dataToUpsert)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to sync ${table}: ${error.message}`);
    }

    return createSuccessResponse({ [table.replace(/s$/, '')]: data, action: 'updated' });
  } else {
    // Insert new
    const { data, error } = await supabase
      .from(table)
      .insert(dataToUpsert)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to sync ${table}: ${error.message}`);
    }

    return createSuccessResponse({ [table.replace(/s$/, '')]: data, action: 'created' }, 201);
  }
}

/**
 * Handle bulk sync endpoint - upsert multiple records
 */
async function handleBulkSync(
  req: Request,
  ctx: HandlerContext,
  table: string,
  syncIdField: string,
  validator: any
): Promise<Response> {
  const { supabase, tenantId } = ctx;

  const body = await req.json();

  if (!Array.isArray(body.items)) {
    throw new BadRequestError('Request body must contain an "items" array');
  }

  const results = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [] as any[],
  };

  for (const item of body.items) {
    try {
      if (!item[syncIdField]) {
        results.failed++;
        results.errors.push({
          item,
          error: `${syncIdField} is required`,
        });
        continue;
      }

      // Validate if validator provided
      if (validator) {
        const validation = await validator.validate(item, { tenantId, supabase });
        if (!validation.isValid) {
          results.failed++;
          results.errors.push({
            item,
            error: validation.errors,
          });
          continue;
        }
      }

      // Check if record exists
      const { data: existing } = await supabase
        .from(table)
        .select('id')
        .eq(syncIdField, item[syncIdField])
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const dataToUpsert = {
        ...item,
        tenant_id: tenantId,
      };

      if (existing) {
        await supabase
          .from(table)
          .update(dataToUpsert)
          .eq('id', existing.id);
        results.updated++;
      } else {
        await supabase
          .from(table)
          .insert(dataToUpsert);
        results.created++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        item,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return createSuccessResponse({
    results,
    total: body.items.length,
  });
}
