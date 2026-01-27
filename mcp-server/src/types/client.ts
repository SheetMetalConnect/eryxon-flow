/**
 * Unified client interface for both direct Supabase and REST API modes
 */

export interface QueryResult<T = any> {
  data: T | null;
  error: Error | null;
}

export interface CountResult {
  count: number | null;
  error: Error | null;
}

/**
 * Unified client interface that works with both:
 * - Direct Supabase access (self-hosted)
 * - REST API (cloud SaaS)
 */
export interface UnifiedClient {
  // Core CRUD operations
  select(table: string, options?: SelectOptions): Promise<QueryResult>;
  insert(table: string, data: any | any[]): Promise<QueryResult>;
  update(table: string, id: string, data: any): Promise<QueryResult>;
  delete(table: string, id: string): Promise<QueryResult>;
  upsert(table: string, data: any | any[]): Promise<QueryResult>;

  // Specialized operations
  rpc(functionName: string, params?: any): Promise<QueryResult>;
  count(table: string, options?: SelectOptions): Promise<CountResult>;

  // Connection info
  getMode(): 'direct' | 'api';
}

export interface SelectOptions {
  select?: string;
  filters?: Record<string, any>;
  eq?: Record<string, any>;
  neq?: Record<string, any>;
  gt?: Record<string, any>;
  gte?: Record<string, any>;
  lt?: Record<string, any>;
  lte?: Record<string, any>;
  like?: Record<string, any>;
  ilike?: Record<string, any>;
  is?: Record<string, any>;
  in?: Record<string, Array<any>>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  single?: boolean;
}
