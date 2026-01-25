/**
 * Search Types
 *
 * Centralized type definitions for the global search functionality.
 * Follows Interface Segregation Principle - small, focused interfaces.
 */

export type SearchResultType =
  | "job"
  | "part"
  | "operation"
  | "user"
  | "issue"
  | "resource"
  | "material";

/**
 * A single search result item
 * Note: subtitle and description can be null - UI layer should provide localized fallbacks
 */
export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  /** Subtitle text - null values should be handled by UI with localized fallback */
  subtitle: string | null;
  description?: string | null;
  path: string;
  status?: string;
  /** Active state for entities that have it (users, resources, materials) */
  active?: boolean;
  metadata?: SearchResultMetadata;
}

/**
 * Optional metadata attached to search results
 */
export interface SearchResultMetadata {
  jobNumber?: string;
  partNumber?: string;
  customer?: string;
  material?: string;
  operationName?: string;
  cellName?: string;
  assignedTo?: string;
  dueDate?: string;
  email?: string;
  role?: string;
  resourceType?: string;
  location?: string;
  identifier?: string;
  color?: string;
}

/**
 * Filters for search queries
 */
export interface SearchFilters {
  types?: SearchResultType[];
  statuses?: string[];
  limit?: number;
}

/**
 * Configuration for an entity search
 */
export interface EntitySearchConfig<T = unknown> {
  /** The Supabase table name */
  tableName: string;
  /** The result type identifier */
  type: SearchResultType;
  /** Fields to select from the table */
  selectFields: string;
  /** Columns to search with ilike */
  searchColumns: string[];
  /** Path for the search result link */
  resultPath: string;
  /** Transform raw data to SearchResult */
  mapResult: (item: T) => SearchResult;
}

/**
 * Function signature for entity search
 */
export type EntitySearchFn = (
  query: string,
  tenantId: string,
  limit?: number
) => Promise<SearchResult[]>;
