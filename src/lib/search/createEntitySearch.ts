/**
 * Entity Search Factory
 *
 * Creates search functions from configuration objects.
 * Eliminates code duplication across entity search implementations.
 *
 * Single Responsibility: Only handles search execution
 * Open/Closed: New entities added via config, not code changes
 */

import { supabase } from "@/integrations/supabase/client";
import type { EntitySearchConfig, SearchResult } from "./types";

/**
 * Creates a search function for a given entity configuration
 *
 * @param config - The entity search configuration
 * @returns A function that executes the search
 */
export function createEntitySearch<T>(
  config: EntitySearchConfig<T>
): (query: string, tenantId: string, limit?: number) => Promise<SearchResult[]> {
  return async (
    query: string,
    tenantId: string,
    limit = 10
  ): Promise<SearchResult[]> => {
    if (!tenantId || !query.trim()) {
      return [];
    }

    try {
      // Build the ilike filter for search columns
      const searchFilter = config.searchColumns
        .map((col) => `${col}.ilike.%${query}%`)
        .join(",");

      const { data, error } = await supabase
        .from(config.tableName)
        .select(config.selectFields)
        .eq("tenant_id", tenantId)
        .or(searchFilter)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error(`Error searching ${config.tableName}:`, error);
        return [];
      }

      return (data || []).map((item) => config.mapResult(item as T));
    } catch (err) {
      console.error(`Search error for ${config.tableName}:`, err);
      return [];
    }
  };
}

/**
 * Creates all entity search functions from configs
 *
 * @param configs - Map of search configurations
 * @returns Map of search functions by type
 */
export function createSearchFunctions<
  T extends Record<string, EntitySearchConfig>,
>(
  configs: T
): Record<keyof T, (query: string, tenantId: string, limit?: number) => Promise<SearchResult[]>> {
  const searchFunctions = {} as Record<
    keyof T,
    (query: string, tenantId: string, limit?: number) => Promise<SearchResult[]>
  >;

  for (const [key, config] of Object.entries(configs)) {
    searchFunctions[key as keyof T] = createEntitySearch(config);
  }

  return searchFunctions;
}
