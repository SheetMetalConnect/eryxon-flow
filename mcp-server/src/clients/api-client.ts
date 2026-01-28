/**
 * REST API client for cloud SaaS deployments
 * Uses tenant-scoped API keys to access Edge Functions
 */

import type { UnifiedClient, QueryResult, CountResult, SelectOptions } from "../types/client.js";

export class RestApiClient implements UnifiedClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(apiBaseUrl: string, apiKey: string, timeout: number = 30000) {
    // Normalize base URL
    this.baseUrl = apiBaseUrl.replace(/\/+$/, '');
    if (!this.baseUrl.includes('/functions/v1')) {
      this.baseUrl = `${this.baseUrl}/functions/v1`;
    }
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  getMode(): 'direct' | 'api' {
    return 'api';
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<QueryResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

      // Handle empty responses (204 No Content, etc.)
      const text = await response.text();

      if (!response.ok) {
        let errorData: any = { error: response.statusText };
        if (text && text.trim()) {
          try {
            errorData = JSON.parse(text);
          } catch {
            // Keep default errorData
          }
        }
        return {
          data: null,
          error: new Error(errorData.error?.message || errorData.error || 'API request failed'),
        };
      }

      // Handle empty success responses (204, empty body)
      if (!text || !text.trim()) {
        return { data: null, error: null };
      }

      let result: any;
      try {
        result = JSON.parse(text);
      } catch {
        // Non-JSON response treated as direct data
        return { data: text, error: null };
      }

      // Handle standard API response format { success, data }
      if ('success' in result) {
        if (result.success) {
          return { data: result.data, error: null };
        } else {
          // Preserve server error messages (handle both string and object formats)
          const errorMessage = typeof result.error === 'string'
            ? result.error
            : result.error?.message || 'Unknown error';
          return {
            data: null,
            error: new Error(errorMessage),
          };
        }
      }

      // Direct data response
      return { data: result, error: null };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return { data: null, error: new Error(`Request timeout after ${this.timeout}ms`) };
      }
      return { data: null, error: error as Error };
    }
  }

  private buildQueryString(options: SelectOptions = {}): string {
    const params = new URLSearchParams();

    if (options.select) {
      params.append('select', options.select);
    }

    // Filters
    if (options.eq) {
      for (const [key, value] of Object.entries(options.eq)) {
        params.append(key, String(value));
      }
    }
    if (options.neq) {
      for (const [key, value] of Object.entries(options.neq)) {
        params.append(`${key}.neq`, String(value));
      }
    }
    if (options.gt) {
      for (const [key, value] of Object.entries(options.gt)) {
        params.append(`${key}.gt`, String(value));
      }
    }
    if (options.gte) {
      for (const [key, value] of Object.entries(options.gte)) {
        params.append(`${key}.gte`, String(value));
      }
    }
    if (options.lt) {
      for (const [key, value] of Object.entries(options.lt)) {
        params.append(`${key}.lt`, String(value));
      }
    }
    if (options.lte) {
      for (const [key, value] of Object.entries(options.lte)) {
        params.append(`${key}.lte`, String(value));
      }
    }
    if (options.like) {
      for (const [key, value] of Object.entries(options.like)) {
        params.append(`${key}.like`, String(value));
      }
    }
    if (options.ilike) {
      for (const [key, value] of Object.entries(options.ilike)) {
        params.append(`${key}.ilike`, String(value));
      }
    }
    if (options.in) {
      for (const [key, values] of Object.entries(options.in)) {
        params.append(`${key}.in`, values.join(','));
      }
    }
    if (options.is) {
      for (const [key, value] of Object.entries(options.is)) {
        params.append(`${key}.is`, String(value));
      }
    }

    // Ordering
    if (options.order) {
      const direction = options.order.ascending === false ? 'desc' : 'asc';
      params.append('order', `${options.order.column}.${direction}`);
    }

    // Pagination
    if (options.limit !== undefined) {
      params.append('limit', String(options.limit));
    }
    if (options.offset !== undefined) {
      params.append('offset', String(options.offset));
    }

    // Single record flag
    if (options.single) {
      params.append('single', 'true');
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  private getApiEndpoint(table: string): string {
    // Map table names to API endpoints
    const endpointMap: Record<string, string> = {
      jobs: '/api-jobs',
      parts: '/api-parts',
      operations: '/api-operations',
      operation_batches: '/api-batches',
      substeps: '/api-substeps',
      issues: '/api-issues',
      time_entries: '/api-time-entries',
      materials: '/api-materials',
      resources: '/api-resources',
      api_keys: '/api-key-generate',
      webhooks: '/api-webhooks',
      webhook_logs: '/api-webhook-logs',
      cells: '/api-cells',
      stages: '/api-stages',
      scrap_reasons: '/api-scrap-reasons',
      assignments: '/api-assignments',
      templates: '/api-templates',
    };

    return endpointMap[table] || `/api-${table}`;
  }

  async select(table: string, options: SelectOptions = {}): Promise<QueryResult> {
    const endpoint = this.getApiEndpoint(table);
    const queryString = this.buildQueryString(options);
    const result = await this.request(`${endpoint}${queryString}`, {
      method: 'GET',
    });

    // Transform response when single=true (match Supabase .single() behavior)
    if (options.single && result.data) {
      if (Array.isArray(result.data)) {
        // Return first item or null if array is empty
        return { data: result.data[0] || null, error: result.error };
      }
      // Already a single object (API might support single natively)
      return result;
    }

    return result;
  }

  async insert(table: string, data: any | any[]): Promise<QueryResult> {
    const endpoint = this.getApiEndpoint(table);
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(Array.isArray(data) ? data : [data]),
    });
  }

  async update(table: string, id: string, data: any): Promise<QueryResult> {
    const endpoint = this.getApiEndpoint(table);
    const encodedId = encodeURIComponent(id);
    return this.request(`${endpoint}?id=${encodedId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(table: string, id: string): Promise<QueryResult> {
    const endpoint = this.getApiEndpoint(table);
    const encodedId = encodeURIComponent(id);
    return this.request(`${endpoint}?id=${encodedId}`, {
      method: 'DELETE',
    });
  }

  async upsert(table: string, data: any | any[]): Promise<QueryResult> {
    // Most APIs don't have dedicated upsert endpoints
    // Try POST with upsert flag or fallback to insert
    const endpoint = this.getApiEndpoint(table);
    return this.request(`${endpoint}?upsert=true`, {
      method: 'POST',
      body: JSON.stringify(Array.isArray(data) ? data : [data]),
    });
  }

  async rpc(functionName: string, params: any = {}): Promise<QueryResult> {
    // RPC calls map to specialized endpoints
    // For lifecycle operations
    if (functionName === 'start_operation' || functionName === 'pause_operation' ||
        functionName === 'complete_operation' || functionName === 'resume_operation') {
      return this.request('/api-operation-lifecycle', {
        method: 'POST',
        body: JSON.stringify({ function: functionName, ...params }),
      });
    }

    if (functionName === 'start_job' || functionName === 'stop_job' ||
        functionName === 'complete_job' || functionName === 'resume_job') {
      return this.request('/api-job-lifecycle', {
        method: 'POST',
        body: JSON.stringify({ function: functionName, ...params }),
      });
    }

    // Generic RPC fallback (may not be supported)
    return {
      data: null,
      error: new Error(`RPC function '${functionName}' not supported via REST API`),
    };
  }

  async count(table: string, options: SelectOptions = {}): Promise<CountResult> {
    const endpoint = this.getApiEndpoint(table);
    const queryString = this.buildQueryString({ ...options, select: 'count' });
    const result = await this.request(`${endpoint}${queryString}`, {
      method: 'GET',
    });

    if (result.error) {
      return { count: null, error: result.error };
    }

    // Extract count from API response structure { [table]: [...], pagination: { total, offset, limit } }
    const count = result.data?.pagination?.total
      ?? (Array.isArray(result.data?.[table]) ? result.data[table].length : 0);
    return { count, error: null };
  }
}
