import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Values = Record<string, unknown> | Record<string, unknown>[];

// The service-role key bypasses RLS, so every query from a tool is pinned to
// one tenant here: selects/deletes/updates get a tenant filter, writes get the
// tenant stamped into the payload.
export function createTenantScopedClient(client: SupabaseClient, tenantId: string): SupabaseClient {
  const stamp = (values: Values) =>
    Array.isArray(values) ? values.map((v) => ({ ...v, tenant_id: tenantId })) : { ...values, tenant_id: tenantId };
  return new Proxy(client, {
    get(target, prop, receiver) {
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
              return (...args: unknown[]) => original.apply(builder, args).eq("tenant_id", tenantId);
            }
            if (name === "update") {
              return (values: Values, ...rest: unknown[]) => original.call(builder, stamp(values), ...rest).eq("tenant_id", tenantId);
            }
            if (name === "insert" || name === "upsert") {
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
  if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
    process.exit(1);
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return process.env.TENANT_ID ? createTenantScopedClient(client, process.env.TENANT_ID) : client;
}
