import { validateCrudWrite } from "./crud-write-policy.ts";
import type { ValidationContext, ValidationResult } from "./validation/types.ts";
import type { HandlerContext } from "./handler.ts";
import {
  createSuccessResponse,
  NotFoundError,
  BadRequestError,
  ValidationException,
} from "./validation/errorHandler.ts";

interface QueryResult<T> { data: T | null; error: { message: string } | null; count?: number | null }
interface CrudQuery extends PromiseLike<QueryResult<unknown[]>> {
  eq(column: string, value: unknown): CrudQuery;
  is(column: string, value: boolean | null): CrudQuery;
  in(column: string, values: readonly unknown[]): CrudQuery;
  gt(column: string, value: unknown): CrudQuery;
  gte(column: string, value: unknown): CrudQuery;
  lte(column: string, value: unknown): CrudQuery;
  ilike(column: string, pattern: string): CrudQuery;
  or(filters: string): CrudQuery;
  order(column: string, options?: { ascending?: boolean; foreignTable?: string }): CrudQuery;
  range(from: number, to: number): CrudQuery;
  maybeSingle(): PromiseLike<QueryResult<unknown>>;
}
type QueryModifier = (query: CrudQuery, ctx: HandlerContext) => { query: CrudQuery } | Promise<{ query: CrudQuery }>;
type ValidatorConstructor = new () => {
  validate(value: unknown, context: ValidationContext): ValidationResult | Promise<ValidationResult>;
  validatePartial?(value: unknown, context: ValidationContext): ValidationResult | Promise<ValidationResult>;
};

export interface CrudConfig {
  /** Database table name */
  table: string;

  /** Fields to select (default: '*') */
  selectFields?: string;

  /** Fields that can be searched with text search (default: []) */
  searchFields?: string[];

  /** URL params that can be used as filters (default: []) */
  allowedFilters?: string[];

  /** Filters that should use fuzzy matching (ilike) instead of exact match (eq). Useful for text fields like customer, job_number */
  fuzzyFilters?: string[];

  /** Fields that can be used for sorting (default: ['created_at']) */
  sortableFields?: string[];

  /** Default sort field and direction (default: { field: 'created_at', direction: 'desc' }) */
  defaultSort?: { field: string; direction: 'asc' | 'desc' };

  /** Enable soft delete handling (checks for deleted_at IS NULL) (default: true) */
  softDelete?: boolean;

  /** Validator class for POST/PATCH validation (optional) */
  validator?: ValidatorConstructor;

  /** Custom handlers to override default behavior */
  customHandlers?: {
    get?: (req: Request, ctx: HandlerContext) => Promise<Response>;
    post?: (req: Request, ctx: HandlerContext) => Promise<Response>;
    patch?: (req: Request, ctx: HandlerContext) => Promise<Response>;
    delete?: (req: Request, ctx: HandlerContext) => Promise<Response>;
  };

  /** Custom query modifications for GET requests */
  queryModifier?: QueryModifier;

  /** Skip automatic tenant_id filter (for tables without tenant_id column) */
  skipTenantFilter?: boolean;

  /** Enable sync endpoints (PUT /sync, POST /bulk-sync) */
  enableSync?: boolean;

  /** External ID field for sync operations (default: 'external_id') */
  syncIdField?: string;

  /** Entity key for response wrapping (default: singularized table name). Examples: 'job', 'part', 'operation' */
  entityKey?: string;

  /**
   * Optional hook fired after a successful POST create, with the created
   * record. Used to record a pilot-critical lifecycle event (ERY-46) into
   * `activity_log` with the request-correlated id. Best-effort: failures here
   * must not break the create response.
   */
  onCreated?: (ctx: HandlerContext, record: Record<string, unknown>) => Promise<void>;
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
    fuzzyFilters = [],
    sortableFields = ['created_at'],
    defaultSort = { field: 'created_at', direction: 'desc' as const },
    softDelete = true,
    validator,
    customHandlers = {},
    queryModifier,
    skipTenantFilter = false,
    enableSync = false,
    syncIdField = 'external_id',
    entityKey,
    onCreated,
  } = config;

  // Compute entity key for singular responses (default: naive singularization)
  const responseEntityKey = entityKey || table.replace(/s$/, '');

  return async (req: Request, ctx: HandlerContext): Promise<Response> => {
    const { supabase, tenantId, url, lastSegment } = ctx;

    // Handle sync endpoints if enabled
    if (enableSync) {
      if (lastSegment === 'sync' && req.method === 'PUT') {
        return handleSync(req, ctx, table, syncIdField, validator, softDelete, responseEntityKey);
      }
      if (lastSegment === 'bulk-sync' && req.method === 'POST') {
        return handleBulkSync(req, ctx, table, syncIdField, validator, softDelete, responseEntityKey);
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
          fuzzyFilters,
          sortableFields,
          defaultSort,
          softDelete,
          queryModifier,
          skipTenantFilter,
        });

      case 'POST':
        if (customHandlers.post) {
          return customHandlers.post(req, ctx);
        }
        return handlePost(req, ctx, table, validator, softDelete, responseEntityKey, onCreated);

      case 'PATCH':
      case 'PUT':
        if (customHandlers.patch) {
          return customHandlers.patch(req, ctx);
        }
        return handlePatch(req, ctx, table, validator, softDelete, responseEntityKey);

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
    fuzzyFilters?: string[];
    sortableFields: string[];
    defaultSort: { field: string; direction: 'asc' | 'desc' };
    softDelete: boolean;
    queryModifier?: QueryModifier;
    skipTenantFilter?: boolean;
  }
): Promise<Response> {
  const { supabase, tenantId, url } = ctx;
  const {
    table,
    selectFields,
    searchFields,
    allowedFilters,
    fuzzyFilters = [],
    sortableFields,
    defaultSort,
    softDelete,
    queryModifier,
    skipTenantFilter = false,
  } = config;

  // Get single item by ID
  const id = url.searchParams.get('id');
  if (id) {
    let query = supabase
      .from(table)
      .select(selectFields)
      .eq('id', id) as unknown as CrudQuery;

    if (!skipTenantFilter) {
      query = query.eq('tenant_id', tenantId);
    }

    if (softDelete) {
      query = query.is('deleted_at', null);
    }

    if (queryModifier) {
      ({ query } = await queryModifier(query, ctx));
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
    .select(selectFields, { count: 'exact' }) as unknown as CrudQuery;

  if (!skipTenantFilter) {
    query = query.eq('tenant_id', tenantId);
  }

  if (softDelete) {
    query = query.is('deleted_at', null);
  }

  // Apply filters
  for (const filter of allowedFilters) {
    const value = url.searchParams.get(filter);
    if (value !== null) {
      // Use fuzzy matching for text fields like customer, job_number
      if (fuzzyFilters.includes(filter)) {
        query = query.ilike(filter, `%${value}%`);
      } else {
        query = query.eq(filter, value);
      }
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
    ({ query } = await queryModifier(query, ctx));
  }

  // Pagination
  const requestedLimit = Number(url.searchParams.get('limit') ?? 100);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  if (!Number.isInteger(requestedLimit) || !Number.isInteger(offset) || offset < 0) {
    throw new BadRequestError('limit and offset must be integers; offset must be non-negative');
  }
  const limit = Math.min(1000, Math.max(1, requestedLimit));

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
  validator: ValidatorConstructor | undefined,
  softDelete: boolean,
  entityKey: string,
  onCreated?: (ctx: HandlerContext, record: Record<string, unknown>) => Promise<void>
): Promise<Response> {
  const { supabase, tenantId } = ctx;

  const body = await validateCrudWrite(table, await req.json(), tenantId, supabase);

  // Validate if validator provided
  if (validator) {
    const validatorInstance = new validator();
    const validation = await validatorInstance.validate(body, { tenantId });
    if (!validation.valid) {
      throw new ValidationException(validation);
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

  if (onCreated) {
    // Best-effort: a lifecycle-event persistence failure must not fail create.
    try {
      await onCreated(ctx, data);
    } catch (_hookError) {
      // recordPilotEvent already swallows + logs its own errors; this guard is
      // only for unexpected throws so the create response is never blocked.
    }
  }

  return createSuccessResponse({ [entityKey]: data }, 201);
}

/**
 * Handle PATCH/PUT requests - update item
 */
async function handlePatch(
  req: Request,
  ctx: HandlerContext,
  table: string,
  validator: ValidatorConstructor | undefined,
  softDelete: boolean,
  entityKey: string
): Promise<Response> {
  const { supabase, tenantId, url } = ctx;

  const id = url.searchParams.get('id');
  if (!id) {
    throw new BadRequestError('ID parameter is required for updates');
  }

  const body = await validateCrudWrite(table, await req.json(), tenantId, supabase);

  // Partial validation for PATCH: validate provided fields individually
  // (skip required-field enforcement, but enforce type/length constraints)
  if (validator) {
    const validatorInstance = new validator();
    if (typeof validatorInstance.validatePartial === 'function') {
      const validation = await validatorInstance.validatePartial(body, { tenantId });
      if (!validation.valid) {
        throw new ValidationException(validation);
      }
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

  return createSuccessResponse({ [entityKey]: data });
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
  validator: ValidatorConstructor | undefined,
  softDelete: boolean = false,
  entityKey: string
): Promise<Response> {
  const { supabase, tenantId } = ctx;

  const body = await validateCrudWrite(table, await req.json(), tenantId, supabase);

  if (!body[syncIdField]) {
    throw new BadRequestError(`${syncIdField} is required for sync operations`);
  }

  // Require external_source for proper scoping
  if (!body.external_source) {
    throw new BadRequestError('external_source is required for sync operations');
  }

  // Validate if validator provided
  if (validator) {
    const validatorInstance = new validator();
    const validation = await validatorInstance.validate(body, { tenantId });
    if (!validation.valid) {
      throw new ValidationException(validation);
    }
  }

  // Check if record exists (with external_source scoping and soft-delete protection)
  let query = supabase
    .from(table)
    .select('id')
    .eq(syncIdField, body[syncIdField])
    .eq('tenant_id', tenantId)
    .eq('external_source', body.external_source);

  // Exclude soft-deleted records
  if (softDelete) {
    query = query.is('deleted_at', null);
  }

  const { data: existing, error: lookupError } = await query.maybeSingle();
  if (lookupError) throw new Error(`Failed to look up ${table}: ${lookupError.message}`);

  // Generate sync hash for change detection
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(body));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const syncHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);

  const now = new Date().toISOString();
  const dataToUpsert = {
    ...body,
    tenant_id: tenantId,
    synced_at: now,
    sync_hash: syncHash,
  };

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from(table)
      .update({
        ...dataToUpsert,
        updated_at: now,
      })
      .eq('id', existing.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to sync ${table}: ${error.message}`);
    }

    return createSuccessResponse({ [entityKey]: data, action: 'updated' });
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

    return createSuccessResponse({ [entityKey]: data, action: 'created' }, 201);
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
  validator: ValidatorConstructor | undefined,
  softDelete: boolean = false,
  entityKey: string
): Promise<Response> {
  const { supabase, tenantId } = ctx;

  const body = await req.json();

  // Support both new format {items: [...]} and legacy format {jobs: [...], parts: [...], etc.}
  let items: unknown[];
  if (Array.isArray(body.items)) {
    items = body.items;
  } else if (Array.isArray(body[table])) {
    // Legacy format: {jobs: [...]} or {parts: [...]}
    items = body[table];
  } else {
    throw new BadRequestError(`Request body must contain either "items" array or "${table}" array`);
  }

  if (items.length > 1000) {
    throw new BadRequestError('Maximum 1000 items per bulk-sync request');
  }

  const results = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [] as Array<{ item: unknown; error: unknown }>,
  };

  for (const rawItem of items) {
    try {
      const item = await validateCrudWrite(table, rawItem, tenantId, supabase);
      if (!item[syncIdField]) {
        results.failed++;
        results.errors.push({
          item,
          error: `${syncIdField} is required`,
        });
        continue;
      }

      // Require external_source for proper scoping
      if (!item.external_source) {
        results.failed++;
        results.errors.push({
          item,
          error: 'external_source is required',
        });
        continue;
      }

      // Validate if validator provided
      if (validator) {
        const validatorInstance = new validator();
        const validation = await validatorInstance.validate(item, { tenantId });
        if (!validation.valid) {
          results.failed++;
          results.errors.push({
            item,
            error: validation.errors,
          });
          continue;
        }
      }

      // Check if record exists (with external_source scoping and soft-delete protection)
      let query = supabase
        .from(table)
        .select('id')
        .eq(syncIdField, item[syncIdField])
        .eq('tenant_id', tenantId)
        .eq('external_source', item.external_source);

      // Exclude soft-deleted records
      if (softDelete) {
        query = query.is('deleted_at', null);
      }

      const { data: existing, error: lookupError } = await query.maybeSingle();
  if (lookupError) throw new Error(`Failed to look up ${table}: ${lookupError.message}`);

      // Generate sync hash
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(item));
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const syncHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);

      const now = new Date().toISOString();
      const dataToUpsert = {
        ...item,
        tenant_id: tenantId,
        synced_at: now,
        sync_hash: syncHash,
      };

      if (existing) {
        const { error } = await supabase
          .from(table)
          .update({
            ...dataToUpsert,
            updated_at: now,
          })
          .eq('id', existing.id)
          .eq('tenant_id', tenantId);
        if (error) throw new Error(`Failed to sync ${table}: ${error.message}`);
        results.updated++;
      } else {
        const { error } = await supabase
          .from(table)
          .insert(dataToUpsert);
        if (error) throw new Error(`Failed to sync ${table}: ${error.message}`);
        results.created++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        item: rawItem,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return createSuccessResponse({
    results,
    total: items.length,
  });
}
