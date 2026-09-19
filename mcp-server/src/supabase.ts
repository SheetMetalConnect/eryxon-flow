import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Values = Record<string, unknown> | Record<string, unknown>[];

const INDIRECT_TENANT_TABLES = new Set([
  "operation_quantity_scrap_reasons",
  "operation_resources",
  "substep_template_items",
]);
const TENANT_ARGUMENTS = new Set(["tenant_id", "p_tenant_id", "tenant_id_param"]);

// The service-role key bypasses RLS. Tables with a tenant column are scoped here;
// handlers for join tables in INDIRECT_TENANT_TABLES must validate their parent
// records before reading or writing them.
export function createTenantScopedClient(client: SupabaseClient, tenantId: string): SupabaseClient {
  const stamp = (values: Values) =>
    Array.isArray(values) ? values.map((v) => ({ ...v, tenant_id: tenantId })) : { ...values, tenant_id: tenantId };
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "rpc") {
        return (fn: string, args: Record<string, unknown> = {}, options?: Record<string, unknown>) => {
          for (const [name, value] of Object.entries(args)) {
            if (TENANT_ARGUMENTS.has(name) && value !== tenantId) {
              throw new Error(`RPC ${fn} cannot target a different tenant`);
            }
          }
          return target.rpc(fn, args, options);
        };
      }
      if (prop !== "from") {
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      }
      return (table: string) =>
        new Proxy(target.from(table), {
          get(builder, name) {
            const original = Reflect.get(builder, name);
            if (typeof original !== "function") return original;
            if (name === "select" || name === "delete") {
              if (table === "tenants") return (...args: unknown[]) => original.apply(builder, args).eq("id", tenantId);
              if (INDIRECT_TENANT_TABLES.has(table)) return original.bind(builder);
              return (...args: unknown[]) => original.apply(builder, args).eq("tenant_id", tenantId);
            }
            if (name === "update") {
              if (table === "tenants") {
                return (values: Values, ...rest: unknown[]) => original.call(builder, values, ...rest).eq("id", tenantId);
              }
              if (INDIRECT_TENANT_TABLES.has(table)) return original.bind(builder);
              return (values: Values, ...rest: unknown[]) => original.call(builder, stamp(values), ...rest).eq("tenant_id", tenantId);
            }
            if (name === "insert" || name === "upsert") {
              if (table === "tenants") throw new Error("Tenant creation is not available through MCP");
              if (INDIRECT_TENANT_TABLES.has(table)) return original.bind(builder);
              return (values: Values, ...rest: unknown[]) => original.call(builder, stamp(values), ...rest);
            }
            return original.bind(builder);
          },
        });
    },
  });
}

export function connect(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const tenantId = process.env.TENANT_ID;
  if (!url || !key || !tenantId) {
    console.error("SUPABASE_URL, SUPABASE_SERVICE_KEY and TENANT_ID are required");
    process.exit(1);
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return createTenantScopedClient(client, tenantId);
}
