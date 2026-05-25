/**
 * Direct Supabase client for self-hosted deployments
 * Uses service role key for direct database access
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { UnifiedClient, QueryResult, CountResult, SelectOptions } from "../types/client.js";

/**
 * Wrap a service-role SupabaseClient so that every `.from(table)` call is
 * automatically constrained to a single tenant. The MCP server uses the
 * service-role key, which bypasses RLS, so without this the only tenant
 * boundary (the DirectSupabaseClient methods) is lost the moment a tool
 * handler calls `supabase.from()` directly. This re-applies that boundary:
 *   - select / delete  → chained `.eq('tenant_id', tenantId)`
 *   - update           → chained `.eq('tenant_id', tenantId)`
 *   - insert / upsert   → `tenant_id` stamped into the payload
 * Only used when TENANT_ID is configured; otherwise the raw client is returned.
 */
export function createTenantScopedClient(
  client: SupabaseClient,
  tenantId: string
): SupabaseClient {
  const stamp = (values: any) =>
    Array.isArray(values)
      ? values.map((v) => ({ ...v, tenant_id: tenantId }))
      : { ...values, tenant_id: tenantId };

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (table: string) => {
          const builder = (target as any).from(table);
          return new Proxy(builder, {
            get(b, p) {
              const orig = (b as any)[p];
              if (typeof orig !== "function") return orig;
              if (p === "select" || p === "delete") {
                return (...args: any[]) => orig.apply(b, args).eq("tenant_id", tenantId);
              }
              if (p === "update") {
                return (values: any, ...rest: any[]) =>
                  orig.call(b, values, ...rest).eq("tenant_id", tenantId);
              }
              if (p === "insert" || p === "upsert") {
                return (values: any, ...rest: any[]) => orig.call(b, stamp(values), ...rest);
              }
              return orig.bind(b);
            },
          });
        };
      }
      const val = (target as any)[prop];
      return typeof val === "function" ? val.bind(target) : val;
    },
  }) as SupabaseClient;
}

export class DirectSupabaseClient implements UnifiedClient {
  private client: SupabaseClient;
  private enforcedTenantId: string | undefined;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.client = createClient(supabaseUrl, supabaseServiceKey);
    // Optional tenant scoping for direct mode (set TENANT_ID env var to enforce)
    this.enforcedTenantId = process.env.TENANT_ID;
  }

  getMode(): 'direct' {
    return 'direct';
  }

  async select(table: string, options: SelectOptions = {}): Promise<QueryResult> {
    try {
      let query = this.client.from(table).select(options.select || '*');

      // Enforce tenant scoping if configured
      if (this.enforcedTenantId) {
        query = query.eq('tenant_id', this.enforcedTenantId);
      }

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
      // Enforce tenant scoping if configured
      const insertData = this.enforcedTenantId
        ? (Array.isArray(data)
            ? data.map(d => ({ ...d, tenant_id: this.enforcedTenantId }))
            : { ...data, tenant_id: this.enforcedTenantId })
        : data;
      const { data: result, error } = await this.client
        .from(table)
        .insert(insertData)
        .select();
      return { data: result, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async update(table: string, id: string, data: any): Promise<QueryResult> {
    try {
      let query = this.client
        .from(table)
        .update(data)
        .eq('id', id);
      if (this.enforcedTenantId) query = query.eq('tenant_id', this.enforcedTenantId);
      const { data: result, error } = await query.select();
      return { data: result, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async delete(table: string, id: string): Promise<QueryResult> {
    try {
      let query = this.client
        .from(table)
        .delete()
        .eq('id', id);
      if (this.enforcedTenantId) query = query.eq('tenant_id', this.enforcedTenantId);
      const { data, error } = await query;
      return { data, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async upsert(table: string, data: any | any[]): Promise<QueryResult> {
    try {
      const upsertData = this.enforcedTenantId
        ? (Array.isArray(data)
            ? data.map(d => ({ ...d, tenant_id: this.enforcedTenantId }))
            : { ...data, tenant_id: this.enforcedTenantId })
        : data;
      const { data: result, error } = await this.client
        .from(table)
        .upsert(upsertData)
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

      // Enforce tenant scoping if configured
      if (this.enforcedTenantId) {
        query = query.eq('tenant_id', this.enforcedTenantId);
      }

      // Apply all filters (same as select)
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

  /**
   * Get a SupabaseClient for tool handlers that call `.from()` directly.
   * When TENANT_ID is set, returns a tenant-scoped wrapper so service-role
   * queries stay constrained to that tenant; otherwise returns the raw client.
   */
  getScopedClient(): SupabaseClient {
    return this.enforcedTenantId
      ? createTenantScopedClient(this.client, this.enforcedTenantId)
      : this.client;
  }
}
