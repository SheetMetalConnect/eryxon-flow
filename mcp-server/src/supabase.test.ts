import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createTenantScopedClient } from "./supabase.js";

describe("tenant-scoped client", () => {
  it("pins updates to the tenant and stamps the payload", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createClient("http://localhost:54321", "test-key", {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
    });
    await createTenantScopedClient(client, "tenant-a").from("jobs").update({ tenant_id: "tenant-b", notes: "updated" }).eq("id", "job");
    const [input, init] = transport.mock.calls[0];
    expect(new URL(String(input)).searchParams.get("tenant_id")).toBe("eq.tenant-a");
    expect(JSON.parse(String(init?.body))).toEqual({ tenant_id: "tenant-a", notes: "updated" });
  });

  it("filters selects by tenant", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response("[]", { headers: { "Content-Type": "application/json" } }));
    const client = createClient("http://localhost:54321", "test-key", {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
    });
    await createTenantScopedClient(client, "tenant-a").from("parts").select("id").eq("status", "completed");
    expect(new URL(String(transport.mock.calls[0][0])).searchParams.get("tenant_id")).toBe("eq.tenant-a");
  });
});
