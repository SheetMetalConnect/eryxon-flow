import { createRequestStateCodec } from "@modelcontextprotocol/server";

// Seals requestState for multi-round-trip tools. Every request is served by a
// fresh server instance, so the state itself is the only thing that survives
// between rounds. Set MCP_STATE_KEY when running more than one instance.
export const stateCodec = createRequestStateCodec<Record<string, unknown>>({
  key: process.env.MCP_STATE_KEY ?? crypto.getRandomValues(new Uint8Array(32)),
  ttlSeconds: 600,
});
