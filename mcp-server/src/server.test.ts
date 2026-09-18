import { createClient } from "@supabase/supabase-js";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { buildServer, PROTOCOL_VERSION } from "./server.js";
import { allTools } from "./tools/index.js";
import { describeError, ToolError } from "./tool.js";

const ID = "8b5d3a2e-4c1f-4d9a-9b7e-2f6c1a0d5e33";
const ENVELOPE = {
  "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
  "io.modelcontextprotocol/clientCapabilities": { elicitation: { form: {} } },
  "io.modelcontextprotocol/clientInfo": { name: "test", version: "0" },
};

function handlerWith(fetchStub: typeof fetch) {
  const supabase = createClient("http://db.local", "key", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchStub } });
  return createMcpHandler(() => buildServer(supabase), { legacy: "reject", responseMode: "json" });
}
const okRows = (rows: unknown[] = []) => async () =>
  new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json", "content-range": `0-0/${rows.length}` } });

async function rpc(handler: ReturnType<typeof handlerWith>, method: string, params: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  const res = await handler.fetch(new Request("http://test.local/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": PROTOCOL_VERSION, "mcp-method": method, ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: { ...params, _meta: ENVELOPE } }),
  }));
  return { status: res.status, body: await res.json() };
}
const call = (handler: ReturnType<typeof handlerWith>, name: string, params: Record<string, unknown>) =>
  rpc(handler, "tools/call", { name, ...params }, { "mcp-name": name });

describe("protocol 2026-07-28", () => {
  it("negotiates only 2026-07-28 and stamps serverInfo on every result", async () => {
    const { status, body } = await rpc(handlerWith(okRows()), "server/discover");
    expect(status).toBe(200);
    expect(body.result.supportedVersions).toEqual([PROTOCOL_VERSION]);
    expect(body.result._meta["io.modelcontextprotocol/serverInfo"]).toEqual({ name: "eryxon-flow", version: "3.0.0" });
  });

  it("rejects the 2025 initialize handshake", async () => {
    const res = await handlerWith(okRows()).fetch(new Request("http://test.local/mcp", {
      method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "x", version: "0" } } }),
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe(-32022);
  });

  it("rejects a request whose Mcp-Method header is missing (-32020)", async () => {
    const res = await handlerWith(okRows()).fetch(new Request("http://test.local/mcp", {
      method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": PROTOCOL_VERSION },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: ENVELOPE } }),
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe(-32020);
  });

  it("lists every tool sorted by name with title, annotations, schemas and a shared cache hint", async () => {
    const { body } = await rpc(handlerWith(okRows()), "tools/list");
    const names = body.result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual([...names].sort());
    expect(names).toEqual(allTools.map((t) => t.name));
    for (const t of body.result.tools) {
      expect(t.title, t.name).toBeTruthy();
      expect(t.annotations.readOnlyHint, t.name).toBeTypeOf("boolean");
      expect(t.inputSchema.type).toBe("object");
      expect(t.outputSchema?.type, t.name).toBe("object");
      expect(t.name).toMatch(/^[a-z_]+$/);
    }
    expect(body.result.ttlMs).toBe(3_600_000);
    expect(body.result.cacheScope).toBe("public");
  });

  it("returns structuredContent on success", async () => {
    const { body } = await call(handlerWith(okRows([{ id: ID, name: "Laser" }])), "fetch_cells", { arguments: {} });
    expect(body.result.isError).toBeUndefined();
    expect(body.result.structuredContent.data).toEqual([{ id: ID, name: "Laser" }]);
  });

  it("returns a production rule refusal as an isError result with the rule text", async () => {
    const refusing: typeof fetch = async (url) => String(url).includes("/rpc/transition_operation")
      ? new Response(JSON.stringify({ code: "22023", message: "Previous operation must be completed first", details: null, hint: null }), { status: 400, headers: { "content-type": "application/json" } })
      : new Response(JSON.stringify({ tenant_id: ID }), { status: 200, headers: { "content-type": "application/json" } });
    const { body } = await call(handlerWith(refusing), "start_operation", { arguments: { id: ID } });
    expect(body.result.isError).toBe(true);
    expect(JSON.parse(body.result.content[0].text).error).toEqual({ code: "INVALID_STATE_TRANSITION", message: "Previous operation must be completed first" });
  });

  it("runs a delete as a multi-round-trip: asks for confirmation, then deletes on the sealed retry", async () => {
    const writes: string[] = [];
    const recording: typeof fetch = async (url, init) => {
      if (init?.method === "PATCH" || init?.method === "DELETE") writes.push(`${init.method} ${new URL(String(url)).pathname}`);
      return new Response(null, { status: 204 });
    };
    const handler = handlerWith(recording);
    const first = await call(handler, "delete_cell", { arguments: { id: ID } });
    expect(first.body.result.resultType).toBe("input_required");
    expect(first.body.result.inputRequests.confirm.method).toBe("elicitation/create");
    expect(writes).toEqual([]);
    const retry = await call(handler, "delete_cell", {
      arguments: { id: ID },
      inputResponses: { confirm: { action: "accept", content: { confirm: true } } },
      requestState: first.body.result.requestState,
    });
    expect(retry.body.result.structuredContent).toEqual({ id: ID, deleted: true });
    expect(writes).toEqual([`PATCH /rest/v1/cells`]);
  });

  it("rejects a tampered requestState before the handler runs", async () => {
    const handler = handlerWith(okRows());
    const first = await call(handler, "delete_cell", { arguments: { id: ID } });
    const { status, body } = await call(handler, "delete_cell", {
      arguments: { id: ID }, inputResponses: { confirm: { action: "accept", content: { confirm: true } } }, requestState: `${first.body.result.requestState}x`,
    });
    expect(status === 400 || body.error?.code === -32602).toBe(true);
  });
});

describe("describeError", () => {
  it("maps database codes and keeps ToolError codes", () => {
    expect(describeError(Object.assign(new Error("Stop active work before starting another operation"), { code: "22023" }))).toEqual({ code: "INVALID_STATE_TRANSITION", message: "Stop active work before starting another operation" });
    expect(describeError({ code: "PGRST116", message: "no rows" }).code).toBe("NOT_FOUND");
    expect(describeError(new ToolError("VALIDATION_ERROR", "x")).code).toBe("VALIDATION_ERROR");
    expect(describeError(new Error("boom"))).toEqual({ code: "INTERNAL_ERROR", message: "boom" });
  });
});
