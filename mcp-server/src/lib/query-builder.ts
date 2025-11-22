/**
 * Query Builder
 * Reusable Supabase query building utilities
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { QueryFilters } from "../types/tools.js";

/**
 * Build a fetch query with filters
 */
export function buildFetchQuery(
  db: SupabaseClient,
  table: string,
  filters: QueryFilters = {},
  select: string = "*"
) {
  const { status, limit = 50, ...otherFilters } = filters;

  let query = db.from(table).select(select);

  // Apply status filter if provided
  if (status) {
    query = query.eq("status", status);
  }

  // Apply other filters
  Object.entries(otherFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  });

  // Apply limit and ordering
  query = query.limit(limit).order("created_at", { ascending: false });

  return query;
}

/**
 * Build an update query
 */
export function buildUpdateQuery(
  db: SupabaseClient,
  table: string,
  id: string,
  updates: Record<string, any>
) {
  // Remove id from updates if present
  const { id: _, ...cleanUpdates } = updates;

  // Add updated_at timestamp
  const updatesWithTimestamp = {
    ...cleanUpdates,
    updated_at: new Date().toISOString(),
  };

  return db
    .from(table)
    .update(updatesWithTimestamp)
    .eq("id", id)
    .select()
    .single();
}

/**
 * Build a create query
 */
export function buildCreateQuery(
  db: SupabaseClient,
  table: string,
  data: Record<string, any>
) {
  return db.from(table).insert(data).select().single();
}

/**
 * Execute query with error handling
 */
export async function executeQuery<T>(query: any): Promise<T> {
  const { data, error } = await query;

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return data as T;
}

/**
 * Build a query with joins
 */
export function buildQueryWithJoins(
  db: SupabaseClient,
  table: string,
  joins: string[],
  filters: QueryFilters = {}
) {
  const selectClause = joins.length > 0 ? `*, ${joins.join(", ")}` : "*";
  return buildFetchQuery(db, table, filters, selectClause);
}
