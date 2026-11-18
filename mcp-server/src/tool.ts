import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallToolResult, InputRequiredResult, ServerContext, ToolAnnotations } from "@modelcontextprotocol/server";
import { z } from "zod";

export type ToolResult = Record<string, unknown> | InputRequiredResult;

export interface ToolDef<S extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  title: string;
  description: string;
  input: S;
  output?: z.ZodRawShape;
  annotations: ToolAnnotations;
  handler: (args: z.infer<z.ZodObject<S>>, supabase: SupabaseClient, ctx: ServerContext) => Promise<ToolResult>;
}

export const READ: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
export const WRITE: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
export const IDEMPOTENT_WRITE: ToolAnnotations = { ...WRITE, idempotentHint: true };
export const DESTRUCTIVE: ToolAnnotations = { ...WRITE, destructiveHint: true };

export const tool = <S extends z.ZodRawShape>(def: ToolDef<S>): ToolDef => def as unknown as ToolDef;

export class ToolError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const PG_CODES: Record<string, string> = {
  "22023": "INVALID_STATE_TRANSITION",
  P0002: "NOT_FOUND",
  PGRST116: "NOT_FOUND",
  "23505": "DUPLICATE_ENTRY",
  "23503": "INVALID_REFERENCE",
  "23502": "VALIDATION_ERROR",
  "42501": "FORBIDDEN",
};

export function describeError(error: unknown): { code: string; message: string } {
  if (error instanceof ToolError) return { code: error.code, message: error.message };
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const code = record.code == null ? "" : String(record.code);
  const message = error instanceof Error ? error.message : record.message == null ? String(error) : String(record.message);
  if (code) return { code: PG_CODES[code] ?? "DATABASE_ERROR", message };
  return { code: "INTERNAL_ERROR", message };
}

export async function run(def: ToolDef, args: Record<string, unknown>, supabase: SupabaseClient, ctx: ServerContext): Promise<CallToolResult | InputRequiredResult> {
  try {
    const data = await def.handler(args, supabase, ctx);
    if ("inputRequests" in data || "requestState" in data) return data as InputRequiredResult;
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: describeError(error) }) }] };
  }
}

// Writes the database attributes to a person (issues.created_by,
// assignments.assigned_by, quantities.recorded_by) need a profile id: the
// explicit argument wins, otherwise MCP_ACTOR_ID.
export function actor(explicit?: string, field = "created_by"): string {
  const value = explicit ?? process.env.MCP_ACTOR_ID;
  if (!value) throw new ToolError("VALIDATION_ERROR", `${field} is required (or set MCP_ACTOR_ID to a profile id)`);
  return value;
}

export async function tenantOf(supabase: SupabaseClient, table: string, rowId: string): Promise<string> {
  const { data, error } = await supabase.from(table).select("tenant_id").eq("id", rowId).single();
  if (error) throw error;
  return data.tenant_id;
}
