/**
 * Global Search Hook
 *
 * Provides unified search across all entity types.
 * Refactored to use the modular search factory for maintainability.
 *
 * KISS: Simple interface, delegates complexity to search module
 * SRP: Only orchestrates searches, doesn't implement them
 */

import { useState, useCallback, useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import { logger } from '@/lib/logger';
import {
  searchConfigs,
  createSearchFunctions,
  type SearchResult,
  type SearchResultType,
  type SearchFilters,
} from "@/lib/search";

export type { SearchResult, SearchResultType, SearchFilters };

/**
 * Hook for global search across all entity types
 *
 * @returns Search function, loading state, and error state
 *
 * @example
 * const { search, loading, error } = useGlobalSearch();
 * const results = await search('query', { types: ['job', 'part'] });
 */
export function useGlobalSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const profile = useProfile();

  const searchFunctions = useMemo(
    () => createSearchFunctions(searchConfigs),
    []
  );

  const allTypes: SearchResultType[] = [
    "job",
    "part",
    "operation",
    "user",
    "issue",
    "resource",
    "material",
  ];

  /**
   * Execute search across specified entity types
   */
  const search = useCallback(
    async (query: string, filters?: SearchFilters): Promise<SearchResult[]> => {
      const tenantId = profile?.tenant_id;

      if (!query.trim() || !tenantId) {
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const limit = filters?.limit || 10;
        const types = filters?.types || allTypes;

        const searchPromises = types
          .filter((type) => type in searchFunctions)
          .map((type) => searchFunctions[type](query, tenantId, limit));

        const results = await Promise.all(searchPromises);
        const flatResults = results.flat();

        if (filters?.statuses && filters.statuses.length > 0) {
          return flatResults.filter(
            (result) =>
              result.status && filters.statuses!.includes(result.status)
          );
        }

        return flatResults;
      } catch (err) {
        const searchError =
          err instanceof Error ? err : new Error("Search failed");
        setError(searchError);
        logger.error('useGlobalSearch', 'Search error', searchError);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [profile?.tenant_id, searchFunctions]
  );

  return {
    search,
    loading,
    error,
  };
}
