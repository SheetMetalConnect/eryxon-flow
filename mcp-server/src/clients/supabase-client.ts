/**
 * Direct Supabase client for self-hosted deployments
 * Uses service role key for direct database access
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { UnifiedClient, QueryResult, CountResult, SelectOptions } from "../types/client.js";

export class DirectSupabaseClient implements UnifiedClient {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.client = createClient(supabaseUrl, supabaseServiceKey);
  }

  getMode(): 'direct' | 'api' {
    return 'direct';
  }

  async select(table: string, options: SelectOptions = {}): Promise<QueryResult> {
    try {
      let query = this.client.from(table).select(options.select || '*');

      // Apply filters
      if (options.eq) {
        for (const [key, value] of Object.entries(options.eq)) {
          query = query.eq(key, value);
        }
      }
      if (options.neq) {
        for (const [key, value] of Object.entries(options.neq)) {
          query = query.neq(key, value);
        }
      }
      if (options.gt) {
        for (const [key, value] of Object.entries(options.gt)) {
          query = query.gt(key, value);
        }
      }
      if (options.gte) {
        for (const [key, value] of Object.entries(options.gte)) {
          query = query.gte(key, value);
        }
      }
      if (options.lt) {
        for (const [key, value] of Object.entries(options.lt)) {
          query = query.lt(key, value);
        }
      }
      if (options.lte) {
        for (const [key, value] of Object.entries(options.lte)) {
          query = query.lte(key, value);
        }
      }
      if (options.like) {
        for (const [key, value] of Object.entries(options.like)) {
          query = query.like(key, value);
        }
      }
      if (options.ilike) {
        for (const [key, value] of Object.entries(options.ilike)) {
          query = query.ilike(key, value);
        }
      }
      if (options.is) {
        for (const [key, value] of Object.entries(options.is)) {
          query = query.is(key, value);
        }
      }
      if (options.in) {
        for (const [key, values] of Object.entries(options.in)) {
          query = query.in(key, values);
        }
      }

      // Apply ordering
      if (options.order) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending ?? true
        });
      }

      // Apply pagination
      if (options.limit !== undefined) {
        query = query.limit(options.limit);
      }
      if (options.offset !== undefined) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 1000) - 1
        );
      }

      // Single vs multiple
      if (options.single) {
        const { data, error } = await query.single();
        return { data, error };
      }

      const { data, error } = await query;
      return { data, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async insert(table: string, data: any | any[]): Promise<QueryResult> {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select();
      return { data: result, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async update(table: string, id: string, data: any): Promise<QueryResult> {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .update(data)
        .eq('id', id)
        .select();
      return { data: result, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async delete(table: string, id: string): Promise<QueryResult> {
    try {
      const { data, error } = await this.client
        .from(table)
        .delete()
        .eq('id', id);
      return { data, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async upsert(table: string, data: any | any[]): Promise<QueryResult> {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .upsert(data)
        .select();
      return { data: result, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async rpc(functionName: string, params: any = {}): Promise<QueryResult> {
    try {
      const { data, error } = await this.client.rpc(functionName, params);
      return { data, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async count(table: string, options: SelectOptions = {}): Promise<CountResult> {
    try {
      let query = this.client.from(table).select('*', { count: 'exact', head: true });

      // Apply filters (same as select)
      if (options.eq) {
        for (const [key, value] of Object.entries(options.eq)) {
          query = query.eq(key, value);
        }
      }
      // ... (other filters if needed for count)

      const { count, error } = await query;
      return { count, error };
    } catch (error) {
      return { count: null, error: error as Error };
    }
  }

  /**
   * Get the underlying Supabase client for advanced operations
   * Only available in direct mode
   */
  getSupabaseClient(): SupabaseClient {
    return this.client;
  }
}
