import { acceptedContent, inputRequired } from "@modelcontextprotocol/server";
import { z } from "zod";
import * as s from "../schemas.js";
import { READ, WRITE, IDEMPOTENT_WRITE, DESTRUCTIVE, tool } from "../tool.js";
import { stateCodec } from "../state.js";

interface Base { table: string; title: string; description: string; name?: string }

export function fetchTool<F extends z.ZodRawShape>(o: Base & {
  select?: string; filters: F; where?: Record<string, string>; orderBy: { column: string; ascending?: boolean }; softDelete?: boolean;
}) {
  return tool({
    name: o.name ?? `fetch_${o.table}`,
    title: o.title,
    description: o.description,
    input: { ...o.filters, limit: s.limit, offset: s.offset },
    output: s.LIST,
    annotations: READ,
    async handler(args, supabase) {
      const { limit, offset, ...filters } = args as Record<string, unknown> & { limit: number; offset: number };
      let query = supabase.from(o.table).select(o.select ?? "*", { count: "exact" });
      for (const [key, value] of Object.entries({ ...o.where, ...filters })) {
        if (value !== undefined) query = query.eq(key, value);
      }
      if (o.softDelete !== false) query = query.is("deleted_at", null);
      query = query.order(o.orderBy.column, { ascending: o.orderBy.ascending ?? false }).range(offset, offset + limit - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      const total = count ?? 0;
      return { data: data ?? [], pagination: { offset, limit, total, has_more: offset + limit < total } };
    },
  });
}

export function createTool<F extends z.ZodRawShape>(o: Base & { name: string; fields: F; defaults?: Record<string, unknown> }) {
  return tool({
    name: o.name,
    title: o.title,
    description: o.description,
    input: o.fields,
    output: s.ROW,
    annotations: WRITE,
    async handler(args, supabase) {
      const { data, error } = await supabase.from(o.table).insert({ ...o.defaults, ...args }).select().single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  });
}

export function updateTool<F extends z.ZodRawShape>(o: Base & { name: string; fields: F }) {
  return tool({
    name: o.name,
    title: o.title,
    description: o.description,
    input: { id: s.id, ...o.fields },
    output: s.ROW,
    annotations: IDEMPOTENT_WRITE,
    async handler(args, supabase) {
      const { id, ...updates } = args as Record<string, unknown> & { id: string };
      const { data, error } = await supabase.from(o.table).update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  });
}

const CONFIRM = z.object({ confirm: z.boolean() });
type DeleteState = { step: "confirm"; table: string; id: string };

// Deletes are multi-round-trip: the first call asks the client to confirm,
// the retry (inputResponses + sealed requestState) performs it.
// softDelete: "deleted_at" stamps the row, "active" flips the flag, false removes it.
export function deleteTool(o: Base & { name: string; softDelete: "deleted_at" | "active" | false }) {
  return tool({
    name: o.name,
    title: o.title,
    description: `${o.description} Asks for confirmation before deleting.`,
    input: { id: s.id },
    output: s.DELETED,
    annotations: DESTRUCTIVE,
    async handler({ id }, supabase, ctx) {
      const state = ctx.mcpReq.requestState<DeleteState>();
      const confirmed = acceptedContent(ctx.mcpReq.inputResponses, "confirm", CONFIRM);
      if (state?.id !== id || !confirmed?.confirm) {
        return inputRequired({
          inputRequests: { confirm: inputRequired.elicit({ message: `Delete ${o.table.replace(/_/g, " ").replace(/s$/, "")} ${id}?`, requestedSchema: CONFIRM }) },
          requestState: await stateCodec.mint({ step: "confirm", table: o.table, id }),
        });
      }
      const query = supabase.from(o.table);
      const { error } = o.softDelete === "deleted_at"
        ? await query.update({ deleted_at: new Date().toISOString() }).eq("id", id)
        : o.softDelete === "active"
          ? await query.update({ active: false }).eq("id", id)
          : await query.delete().eq("id", id);
      if (error) throw error;
      return { id, deleted: true };
    },
  });
}
